import { useState, useEffect, useCallback } from "react";
import { Loader2, Play, Square, ChevronRight, Trophy, Dumbbell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import SkeletonWireframe from "@/components/SkeletonWireframe";
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
import type { JointAngle, ExerciseStatus, Exercise } from "@/lib/database.types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig = {
  correct: { color: "bg-success", label: "Correct Form", textColor: "text-success" },
  adjust: { color: "bg-warning", label: "Needs Adjustment", textColor: "text-warning" },
  incorrect: { color: "bg-destructive", label: "Incorrect", textColor: "text-destructive" },
};

/** Simulate joint-angle readings — replace with real pose estimation later */
function simulateJointAngles(): JointAngle[] {
  const joints = ["Left Knee", "Right Knee", "Hip Flexion", "Left Shoulder", "Right Elbow"];
  const pick = (): ExerciseStatus => {
    const r = Math.random();
    return r < 0.6 ? "correct" : r < 0.85 ? "adjust" : "incorrect";
  };
  return joints.map((label) => ({
    label,
    angle: Math.round(80 + Math.random() * 90),
    status: pick(),
  }));
}

function overallFromAngles(angles: JointAngle[]): ExerciseStatus {
  if (angles.some((a) => a.status === "incorrect")) return "incorrect";
  if (angles.some((a) => a.status === "adjust")) return "adjust";
  return "correct";
}

function accuracyFromAngles(angles: JointAngle[]): number {
  const score = angles.reduce(
    (sum, a) =>
      sum + (a.status === "correct" ? 100 : a.status === "adjust" ? 60 : 20),
    0
  );
  return Math.round(score / angles.length);
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

  // Group by injury type
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

  const [reps, setReps] = useState(0);
  const [jointAngles, setJointAngles] = useState<JointAngle[]>(simulateJointAngles);
  const [overallStatus, setOverallStatus] = useState<ExerciseStatus>("correct");
  const [isRecording, setIsRecording] = useState(true);

  // Simulate pose estimation ticks — replace with real camera feed later
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      const newAngles = simulateJointAngles();
      setJointAngles(newAngles);
      setOverallStatus(overallFromAngles(newAngles));
      setReps((r) => {
        if (r < targetReps) return r + 1;
        return r;
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isRecording, targetReps]);

  // Auto-save set when reps hit target
  useEffect(() => {
    if (reps === targetReps && isRecording && !saveSet.isPending) {
      handleSaveSet();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reps]);

  const handleSaveSet = useCallback(async () => {
    setIsRecording(false);
    const accuracy = accuracyFromAngles(jointAngles);

    try {
      await saveSet.mutateAsync({
        sessionId: session.id,
        setNumber: currentSetNumber,
        repsCompleted: reps,
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
        // All sets done — complete the session
        await endSession.mutateAsync({
          sessionId: session.id,
          status: "completed",
        });
        toast.success("Session complete! Great work 💪");
      } else {
        toast.success(`Set ${currentSetNumber} saved! Rest up, then continue.`);
        // Reset for next set
        setReps(0);
        setTimeout(() => setIsRecording(true), 1500);
      }
    } catch {
      toast.error("Failed to save set. Please try again.");
      setIsRecording(true);
    }
  }, [
    jointAngles,
    reps,
    overallStatus,
    session.id,
    currentSetNumber,
    targetSets,
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
          <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="absolute inset-4 flex items-center justify-center rounded-lg border border-border/50">
              <SkeletonWireframe className="h-3/4 w-auto opacity-90" />
            </div>

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

            <div className="absolute top-4 right-4 flex items-center gap-2">
              {isRecording ? (
                <>
                  <div className="h-2 w-2 rounded-full bg-destructive status-pulse" />
                  <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">
                    Recording
                  </span>
                </>
              ) : (
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">
                  Paused
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right — Feedback */}
        <div className="flex flex-col justify-center border-l border-border p-8 md:w-[40%]">
          <h2
            className="text-2xl text-foreground md:text-3xl"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {session.exercise.name}
          </h2>

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

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-mono-data text-4xl font-bold text-foreground">
              {reps}
            </span>
            <span className="text-sm text-muted-foreground">/ {targetReps} reps</span>
            <span className="ml-4 text-sm text-muted-foreground">
              Set {currentSetNumber} / {targetSets}
            </span>
          </div>

          {/* Joint angles */}
          <div className="mt-8 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Joint Angles
            </h3>
            {jointAngles.map((joint) => (
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
            ))}
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center gap-3">
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

  // Pain data passed from PreSessionCheckModal via router state
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

  // Detect session completion
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
