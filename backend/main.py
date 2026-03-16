"""
Rehab AI — FastAPI Backend
Real-time pose estimation with WebSocket, JWT auth, rule-based feedback.
"""

import json
import logging
import os
import time
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

from auth import (
    UserCreate,
    UserLogin,
    TokenResponse,
    register_user,
    login_user,
    verify_ws_token,
    get_current_user,
)
from exercise_evaluator import (
    evaluate_posture,
    get_cooldown_suggestions,
    EXERCISE_REFERENCES,
)
from pose_engine import PoseEngine, SKELETON_CONNECTIONS, COCO_KEYPOINTS
from rep_counter import RepCounter
from rom_tracker import ROMTracker

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Lifespan: load model once at startup ──────────────────────────────────────

pose_engine: Optional[PoseEngine] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global pose_engine
    force_cpu = os.getenv("FORCE_CPU", "false").lower() == "true"
    logger.info("Initializing pose engine...")
    pose_engine = PoseEngine(force_cpu=force_cpu)
    logger.info(f"Pose engine ready: {pose_engine.get_info()}")
    yield
    logger.info("Shutting down...")


# ─── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="Rehab AI Backend",
    description="Real-time pose estimation and exercise feedback",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── REST Endpoints ────────────────────────────────────────────────────────────


@app.get("/api/health")
async def health_check():
    """Health check with engine status."""
    info = pose_engine.get_info() if pose_engine else {"backend": "not_loaded"}
    return {"status": "ok", "engine": info}


@app.post("/api/auth/register", response_model=TokenResponse)
async def register(data: UserCreate):
    """Register a new user."""
    return register_user(data)


@app.post("/api/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    """Login and receive JWT."""
    return login_user(data)


@app.get("/api/exercises/{exercise_name}/reference")
async def get_exercise_reference(exercise_name: str):
    """Get reference angles for an exercise."""
    refs = EXERCISE_REFERENCES.get(exercise_name)
    if refs is None:
        raise HTTPException(status_code=404, detail="Exercise not found")

    return {
        "exercise": exercise_name,
        "joints": {
            name: {"min_angle": r[0], "max_angle": r[1]}
            for name, r in refs.items()
        },
    }


@app.get("/api/cooldown/{exercise_name}")
async def cooldown(exercise_name: str):
    """Get cooldown stretch suggestions."""
    suggestions = get_cooldown_suggestions(exercise_name)
    return {"exercise": exercise_name, "cooldown": suggestions}


@app.get("/api/skeleton-config")
async def skeleton_config():
    """Return skeleton drawing configuration for the frontend."""
    return {
        "keypoints": COCO_KEYPOINTS,
        "connections": SKELETON_CONNECTIONS,
    }


# ─── WebSocket: Real-time pose estimation ──────────────────────────────────────

# Per-connection state
_connection_states: dict[int, dict] = {}


@app.websocket("/ws/pose")
async def pose_websocket(
    websocket: WebSocket,
    token: str = Query(default=""),
):
    """
    Real-time pose estimation over WebSocket.

    Client sends JSON:
        { "frame": "<base64 JPEG>", "exercise": "Squat - Deep" }

    Server responds JSON:
        {
            "landmarks": [[x, y], ...],
            "joint_angles": [{"label": "...", "angle": ..., "status": "..."}],
            "overall_status": "correct"|"adjust"|"incorrect",
            "accuracy": 85,
            "rep_count": 3,
            "rep_phase": "extended",
            "feedback": "Great form!",
            "rom_summary": {...},
            "inference_ms": 15.2
        }
    """
    # Verify JWT
    if token:
        try:
            user = verify_ws_token(token)
        except HTTPException:
            await websocket.close(code=4001, reason="Invalid token")
            return
    else:
        user = {"sub": "anonymous"}

    await websocket.accept()
    conn_id = id(websocket)
    logger.info(f"WebSocket connected: {conn_id} (user: {user.get('sub', '?')})")

    # Per-connection state
    rep_counter = None
    rom_tracker = ROMTracker()
    current_exercise = None

    try:
        while True:
            # Receive frame
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"error": "Invalid JSON"})
                continue

            frame_data = msg.get("frame")
            exercise_name = msg.get("exercise", "")

            if not frame_data:
                await websocket.send_json({"error": "No frame data"})
                continue

            # Reset rep counter if exercise changed
            if exercise_name != current_exercise:
                current_exercise = exercise_name
                rep_counter = RepCounter(exercise_name)
                rom_tracker.reset()

            # Process frame
            t0 = time.perf_counter()
            result = pose_engine.process_frame(frame_data)
            inference_ms = round((time.perf_counter() - t0) * 1000, 1)

            if result is None:
                await websocket.send_json({
                    "landmarks": [],
                    "joint_angles": [],
                    "overall_status": "incorrect",
                    "accuracy": 0,
                    "rep_count": rep_counter.count if rep_counter else 0,
                    "rep_phase": "unknown",
                    "feedback": "No person detected — make sure you're visible in the camera.",
                    "rom_summary": rom_tracker.get_summary(),
                    "inference_ms": inference_ms,
                })
                continue

            # Evaluate posture
            joint_angles = result["joint_angles"]
            evaluation = evaluate_posture(joint_angles, exercise_name)

            # Update rep counter
            rep_data = {"count": 0, "phase": "unknown"}
            if rep_counter:
                rep_data = rep_counter.update(joint_angles)

            # Update ROM tracker
            rom_tracker.update(joint_angles)

            # Build response
            response = {
                "landmarks": result["landmarks_px"],
                "joint_angles": evaluation["joints"],
                "overall_status": evaluation["overall_status"],
                "accuracy": evaluation["accuracy"],
                "rep_count": rep_data["count"],
                "rep_phase": rep_data["phase"],
                "feedback": evaluation["feedback"],
                "rom_summary": rom_tracker.get_summary(),
                "inference_ms": inference_ms,
                "connections": SKELETON_CONNECTIONS,
            }

            await websocket.send_json(response)

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {conn_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await websocket.close(code=1011, reason=str(e))


# ─── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True, log_level="info")
