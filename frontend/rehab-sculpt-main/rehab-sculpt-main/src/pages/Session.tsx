import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Play, Square, ChevronRight, Trophy, Dumbbell, Volume2, VolumeX, Wifi, WifiOff, Gauge } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  useExercises,
  useActiveSession,
  useStartSession,
  useSaveSet,
  useEndSession,
  useSessionSets,
} from "@/hooks/use-session";
import { usePoseWebSocket } from "@/hooks/use-pose-websocket";
import { useVoiceFeedback } from "@/hooks/use-voice-feedback";
import type { JointAngle, ExerciseStatus, Exercise } from "@/lib/database.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  correct: { color: "bg-success", label: "Correct Form", textColor: "text-success" },
  adjust: { color: "bg-warning", label: "Needs Adjustment", textColor: "text-warning" },
  incorrect: { color: "bg-destructive", label: "Incorrect", textColor: "text-destructive" },
};

// ─── Skeleton Overlay Colors ──────────────────────────────────────────────────

const SKELETON_COLORS = {
  joint: "hsl(185, 100%, 55%)",
  bone: "hsl(185, 100%, 55%)",
  correct: "#22c55e",
  adjust: "#eab308",
  incorrect: "#ef4444",
};

// ─── Webcam + Canvas component ────────────────────────────────────────────────

function WebcamOverlay({
  landmarks,
  connections,
  isRecording,
  onFrame,
}: {
  landmarks: number[][];
  connections: number[][];
  isRecording: boolean;
  onFrame: (base64: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const frameTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Start webcam
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraReady(true);
          setCameraError(null);
        }
      } catch (err) {
        setCameraError(
          "Camera access denied. Please allow camera permissions."
        );
        console.error("Camera error:", err);
      }
    }

    startCamera();
    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Capture frames at ~10 FPS
  useEffect(() => {
    if (!cameraReady || !isRecording) {
      if (frameTimer.current) clearInterval(frameTimer.current);
      return;
    }

    frameTimer.current = setInterval(() => {
      const video = videoRef.current;
      const capture = captureCanvasRef.current;
      if (!video || !capture || video.readyState < 2) return;

      capture.width = 640;
      capture.height = 480;
      const ctx = capture.getContext("2d");
      if (!ctx) return;

      ctx.drawImage(video, 0, 0, 640, 480);
      const base64 = capture.toDataURL("image/jpeg", 0.6);
      onFrame(base64);
    }, 100); // ~10 FPS

    return () => {
      if (frameTimer.current) clearInterval(frameTimer.current);
    };
  }, [cameraReady, isRecording, onFrame]);

  // Draw skeleton overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Match canvas to video dimensions
    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarks.length) return;

    // Scale landmarks from pixel coords (640x480) to canvas size
    const scaleX = canvas.width / 640;
    const scaleY = canvas.height / 480;

    // Draw bones
    if (connections.length) {
      ctx.strokeStyle = SKELETON_COLORS.bone;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";

      for (const [i, j] of connections) {
        if (i >= landmarks.length || j >= landmarks.length) continue;
        const [x1, y1] = landmarks[i];
        const [x2, y2] = landmarks[j];
        if (x1 === 0 && y1 === 0) continue;
        if (x2 === 0 && y2 === 0) continue;

        ctx.beginPath();
        ctx.moveTo(x1 * scaleX, y1 * scaleY);
        ctx.lineTo(x2 * scaleX, y2 * scaleY);
        ctx.stroke();
      }
    }

    // Draw joints
    for (const [x, y] of landmarks) {
      if (x === 0 && y === 0) continue;
      ctx.beginPath();
      ctx.arc(x * scaleX, y * scaleY, 4, 0, Math.PI * 2);
      ctx.fillStyle = SKELETON_COLORS.joint;
      ctx.fill();
    }
  }, [landmarks, connections]);

  if (cameraError) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
        <div>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <WifiOff className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-sm text-muted-foreground">{cameraError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)" }}
      />
      <canvas ref={captureCanvasRef} className="hidden" />

      {/* Corner brackets */}
      {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map(
        (pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} h-4 w-4 border-primary/30 ${
              i < 2 ? "border-t" : "border-b"
            } ${i % 2 === 0 ? "border-l" : "border-r"}`}
          />
        )
      )}

      {/* Recording indicator */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {isRecording ? (
          <>
            <div className="h-2 w-2 rounded-full bg-destructive status-pulse" />
            <span className="font-mono-data text-[10px] uppercase tracking-widest text-white/80 drop-shadow">
              Recording
            </span>
          </>
        ) : (
          <span className="font-mono-data text-[10px] uppercase tracking-widest text-white/80 drop-shadow">
            Paused
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Exercise picker (no active session) ──────────────────────────────────────

function ExercisePicker({
  onStart,
  isStarting,
}: {
  onStart: (ex: Exercise) => void;
  isStarting: boolean;
}) {
  const { data: exercises, isLoading } = useExercises();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!exercises?.length) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <Dumbbell className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">
          No exercises found. Run the migration SQL to seed starter exercises.
        </p>
      </div>
    );
  }

  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    (acc[ex.injury_type] ??= []).push(ex);
    return acc;
  }, {});

  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <h1
        className="text-3xl text-foreground mb-2 animate-fade-up"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        Choose an Exercise
      </h1>
      <p className="text-muted-foreground text-sm mb-10 animate-fade-up">
        Pick an exercise to begin your session.
      </p>

      {Object.entries(grouped).map(([type, exList]) => (
        <div key={type} className="mb-8 animate-fade-up">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
            {type}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exList.map((ex) => (
              <button
                key={ex.id}
                disabled={isStarting}
                onClick={() => onStart(ex)}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
              >
                <div>
                  <p className="font-medium text-foreground">{ex.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ex.target_sets} sets × {ex.target_reps} reps · {ex.difficulty}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Active session view ──────────────────────────────────────────────────────

function ActiveSessionView({
  session,
}: {
  session: NonNullable<ReturnType<typeof useActiveSession>["data"]>;
}) {
  const saveSet = useSaveSet();
  const endSession = useEndSession();
  const { data: completedSets } = useSessionSets(session.id);

  const currentSetNumber = (completedSets?.length ?? 0) + 1;
  const targetSets = session.exercise.target_sets;
  const targetReps = session.exercise.target_reps;

  const [isRecording, setIsRecording] = useState(true);

  // ── Pose WebSocket ──
  const {
    sendFrame,
    jointAngles,
    landmarks,
    connections,
    overallStatus,
    accuracy,
    repCount,
    feedback,
    romSummary,
    inferenceMs,
    isConnected,
  } = usePoseWebSocket(session.exercise.name);

  // ── Voice feedback ──
  const { speak, enabled: voiceEnabled, toggle: toggleVoice } = useVoiceFeedback();

  // Speak feedback when status is not correct
  useEffect(() => {
    if (feedback && overallStatus !== "correct") {
      speak(feedback);
    }
  }, [feedback, overallStatus, speak]);

  // Auto-save set when rep count hits target
  const savingRef = useRef(false);
  useEffect(() => {
    if (repCount >= targetReps && isRecording && !savingRef.current) {
      savingRef.current = true;
      handleSaveSet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [repCount]);

  const handleSaveSet = useCallback(async () => {
    setIsRecording(false);

    try {
      await saveSet.mutateAsync({
        sessionId: session.id,
        setNumber: currentSetNumber,
        repsCompleted: repCount || targetReps,
        accuracy,
        jointAngles,
        feedback:
          overallStatus === "correct"
            ? "Great form!"
            : overallStatus === "adjust"
            ? "Minor adjustments needed"
            : "Form needs improvement",
      });

      if (currentSetNumber >= targetSets) {
        await endSession.mutateAsync({
          sessionId: session.id,
          status: "completed",
        });
        toast.success("Session complete! Great work 💪");
      } else {
        toast.success(`Set ${currentSetNumber} saved! Rest up, then continue.`);
        setTimeout(() => {
          setIsRecording(true);
          savingRef.current = false;
        }, 1500);
      }
    } catch {
      toast.error("Failed to save set. Please try again.");
      setIsRecording(true);
      savingRef.current = false;
    }
  }, [
    jointAngles,
    repCount,
    overallStatus,
    accuracy,
    session.id,
    currentSetNumber,
    targetSets,
    targetReps,
    saveSet,
    endSession,
  ]);

  const handleCancelSession = async () => {
    try {
      await endSession.mutateAsync({
        sessionId: session.id,
        status: "cancelled",
      });
      toast("Session cancelled.");
    } catch {
      toast.error("Could not cancel session.");
    }
  };

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="flex h-[calc(100vh-56px)] flex-col md:flex-row">
        {/* Left — Camera */}
        <div className="flex flex-1 items-center justify-center p-6 md:w-[60%]">
          <WebcamOverlay
            landmarks={landmarks}
            connections={connections}
            isRecording={isRecording}
            onFrame={sendFrame}
          />
        </div>

        {/* Right — Feedback */}
        <div className="flex flex-col justify-center border-l border-border p-8 md:w-[40%] overflow-y-auto">
          <h2
            className="text-2xl text-foreground md:text-3xl"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {session.exercise.name}
          </h2>

          {/* Connection + performance status */}
          <div className="mt-2 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <Wifi className="h-3.5 w-3.5 text-success" />
              ) : (
                <WifiOff className="h-3.5 w-3.5 text-destructive" />
              )}
              <span className="text-[10px] font-mono-data text-muted-foreground uppercase tracking-wider">
                {isConnected ? "Connected" : "Reconnecting..."}
              </span>
            </div>
            {inferenceMs > 0 && (
              <div className="flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-mono-data text-muted-foreground">
                  {inferenceMs}ms
                </span>
              </div>
            )}
          </div>

          {/* Overall status */}
          <div className="mt-4 flex items-center gap-3">
            <div
              className={`h-3 w-3 rounded-full ${statusConfig[overallStatus].color} status-pulse`}
            />
            <span
              className={`text-sm font-semibold ${statusConfig[overallStatus].textColor} transition-smooth`}
            >
              {statusConfig[overallStatus].label}
            </span>
          </div>

          {/* Feedback text */}
          {feedback && (
            <p className="mt-2 text-sm text-muted-foreground italic">
              "{feedback}"
            </p>
          )}

          {/* Reps + sets */}
          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-mono-data text-4xl font-bold text-foreground">
              {repCount}
            </span>
            <span className="text-sm text-muted-foreground">/ {targetReps} reps</span>
            <span className="ml-4 text-sm text-muted-foreground">
              Set {currentSetNumber} / {targetSets}
            </span>
          </div>

          {/* Accuracy */}
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${accuracy}%`,
                  backgroundColor:
                    accuracy >= 80
                      ? SKELETON_COLORS.correct
                      : accuracy >= 50
                      ? SKELETON_COLORS.adjust
                      : SKELETON_COLORS.incorrect,
                }}
              />
            </div>
            <span className="font-mono-data text-xs font-semibold text-foreground w-10 text-right">
              {accuracy}%
            </span>
          </div>

          {/* Joint angles */}
          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Joint Angles
            </h3>
            {jointAngles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">
                Waiting for pose data...
              </p>
            ) : (
              jointAngles.map((joint) => (
                <div
                  key={joint.label}
                  className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5"
                >
                  <span className="text-sm text-foreground">{joint.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono-data text-sm font-bold text-foreground">
                      {joint.angle}°
                    </span>
                    <div
                      className={`h-2 w-2 rounded-full ${statusConfig[joint.status].color}`}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ROM Summary */}
          {Object.keys(romSummary).length > 0 && (
            <div className="mt-6 space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Range of Motion
              </h3>
              {Object.entries(romSummary).map(([joint, data]) => (
                <div
                  key={joint}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-4 py-2"
                >
                  <span className="text-xs text-muted-foreground">{joint}</span>
                  <span className="font-mono-data text-xs text-foreground">
                    {data.min}° — {data.max}° ({data.range}°)
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Controls */}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            {isRecording ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsRecording(false)}
                className="gap-1.5"
              >
                <Square className="h-3.5 w-3.5" /> Pause
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => setIsRecording(true)}
                className="gap-1.5"
              >
                <Play className="h-3.5 w-3.5" /> Resume
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={toggleVoice}
              className="gap-1.5"
            >
              {voiceEnabled ? (
                <Volume2 className="h-3.5 w-3.5" />
              ) : (
                <VolumeX className="h-3.5 w-3.5" />
              )}
              {voiceEnabled ? "Voice On" : "Voice Off"}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelSession}
              disabled={endSession.isPending}
              className="text-destructive hover:text-destructive"
            >
              End Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Session complete screen ──────────────────────────────────────────────────

function SessionCompleteScreen() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center px-6 animate-fade-up">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-success/10">
        <Trophy className="h-10 w-10 text-success" />
      </div>
      <h2
        className="text-3xl text-foreground"
        style={{ fontFamily: "'DM Serif Display', serif" }}
      >
        Session Complete!
      </h2>
      <p className="text-muted-foreground max-w-md">
        Great work today. Your data has been saved. Check the Progress page to track
        your improvement over time.
      </p>
      <Button asChild className="mt-4">
        <a href="/progress">View Progress</a>
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const Session = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { data: activeSession, isLoading } = useActiveSession();
  const startSession = useStartSession();
  const [justCompleted, setJustCompleted] = useState(false);

  const preSessionState = location.state as {
    painLevelBefore?: number;
    sorenessAreas?: string[];
    sharpPain?: string;
  } | null;

  const handleStartExercise = async (exercise: Exercise) => {
    try {
      await startSession.mutateAsync({
        exerciseId: exercise.id,
        painLevelBefore: preSessionState?.painLevelBefore,
        sorenessAreas: preSessionState?.sorenessAreas,
        sharpPain: preSessionState?.sharpPain,
      });
    } catch {
      toast.error("Failed to start session. Please try again.");
    }
  };

  useEffect(() => {
    if (!isLoading && !activeSession && startSession.isSuccess) {
      setJustCompleted(true);
    }
  }, [activeSession, isLoading, startSession.isSuccess]);

  if (!user) {
    return (
      <div className="min-h-screen pt-14 bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to start a session.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-14 bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (justCompleted && !activeSession) {
    return (
      <div className="min-h-screen pt-14 bg-background">
        <SessionCompleteScreen />
      </div>
    );
  }

  if (activeSession) {
    return <ActiveSessionView session={activeSession} />;
  }

  return (
    <div className="min-h-screen pt-14 bg-background">
      <ExercisePicker
        onStart={handleStartExercise}
        isStarting={startSession.isPending}
      />
    </div>
  );
};

export default Session;
