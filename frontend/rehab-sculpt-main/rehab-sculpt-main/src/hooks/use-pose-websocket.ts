import { useState, useEffect, useRef, useCallback } from "react";
import type { JointAngle, ExerciseStatus } from "@/lib/database.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PoseResponse {
  landmarks: number[][];            // [[x, y], ...]  pixel coords
  joint_angles: JointAngle[];       // [{label, angle, status, suggestion}]
  overall_status: ExerciseStatus;
  accuracy: number;
  rep_count: number;
  rep_phase: string;
  feedback: string;
  rom_summary: Record<string, { min: number; max: number; range: number }>;
  inference_ms: number;
  connections: number[][];
  error?: string;
}

interface UsePoseWebSocketReturn {
  sendFrame: (frameBase64: string) => void;
  jointAngles: JointAngle[];
  landmarks: number[][];
  connections: number[][];
  overallStatus: ExerciseStatus;
  accuracy: number;
  repCount: number;
  repPhase: string;
  feedback: string;
  romSummary: Record<string, { min: number; max: number; range: number }>;
  inferenceMs: number;
  isConnected: boolean;
  error: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

const WS_URL = `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}/ws/pose`;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff

export function usePoseWebSocket(
  exerciseName: string,
  token: string = ""
): UsePoseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectIdx = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exerciseRef = useRef(exerciseName);
  exerciseRef.current = exerciseName;

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest pose data
  const [jointAngles, setJointAngles] = useState<JointAngle[]>([]);
  const [landmarks, setLandmarks] = useState<number[][]>([]);
  const [connections, setConnections] = useState<number[][]>([]);
  const [overallStatus, setOverallStatus] = useState<ExerciseStatus>("correct");
  const [accuracy, setAccuracy] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [repPhase, setRepPhase] = useState("extended");
  const [feedback, setFeedback] = useState("");
  const [romSummary, setRomSummary] = useState<
    Record<string, { min: number; max: number; range: number }>
  >({});
  const [inferenceMs, setInferenceMs] = useState(0);

  // ─── Connect ──────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const url = token ? `${WS_URL}?token=${token}` : WS_URL;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
      reconnectIdx.current = 0;
      console.log("[PoseWS] Connected");
    };

    ws.onmessage = (event) => {
      try {
        const data: PoseResponse = JSON.parse(event.data);

        if (data.error) {
          setError(data.error);
          return;
        }

        setLandmarks(data.landmarks ?? []);
        setConnections(data.connections ?? []);
        setOverallStatus(data.overall_status ?? "correct");
        setAccuracy(data.accuracy ?? 0);
        setRepCount(data.rep_count ?? 0);
        setRepPhase(data.rep_phase ?? "extended");
        setFeedback(data.feedback ?? "");
        setRomSummary(data.rom_summary ?? {});
        setInferenceMs(data.inference_ms ?? 0);

        // Map joint_angles from backend format to frontend JointAngle format
        if (data.joint_angles?.length) {
          const mapped: JointAngle[] = data.joint_angles.map((j: any) => ({
            label: j.label,
            angle: Math.round(j.angle),
            status: j.status as ExerciseStatus,
          }));
          setJointAngles(mapped);
        }
      } catch (e) {
        console.error("[PoseWS] Parse error:", e);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      console.log("[PoseWS] Disconnected:", event.code, event.reason);

      if (event.code !== 4001) {
        // Auto-reconnect (not on auth failure)
        const delay =
          RECONNECT_DELAYS[
            Math.min(reconnectIdx.current, RECONNECT_DELAYS.length - 1)
          ];
        reconnectIdx.current++;
        console.log(`[PoseWS] Reconnecting in ${delay}ms...`);
        reconnectTimer.current = setTimeout(connect, delay);
      } else {
        setError("Authentication failed");
      }
    };

    ws.onerror = () => {
      setError("Connection error");
    };
  }, [token]);

  // ─── Send frame ──────────────────────────────────────────────────────────

  const sendFrame = useCallback(
    (frameBase64: string) => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return;
      wsRef.current.send(
        JSON.stringify({
          frame: frameBase64,
          exercise: exerciseRef.current,
        })
      );
    },
    []
  );

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close(1000, "Component unmount");
    };
  }, [connect]);

  return {
    sendFrame,
    jointAngles,
    landmarks,
    connections,
    overallStatus,
    accuracy,
    repCount,
    repPhase,
    feedback,
    romSummary,
    inferenceMs,
    isConnected,
    error,
  };
}
