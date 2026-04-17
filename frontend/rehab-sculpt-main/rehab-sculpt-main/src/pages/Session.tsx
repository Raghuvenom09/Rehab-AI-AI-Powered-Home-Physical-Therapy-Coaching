import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, Trophy, Dumbbell, Volume2, VolumeX } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import {
  useExercises,
  useActiveSession,
  useStartSession,
  useEndSession,
  useSessionExercises,
  useSaveSet,
} from "@/hooks/use-session";
import { useVoiceFeedback } from "@/hooks/use-voice-feedback";
import { PoseCamera } from "@/components/PoseCamera";
import PreSessionCheckModal from "@/components/PreSessionCheckModal";
import type { PoseLandmarks } from "@/hooks/use-pose-detection";
import type { JointAngle, ExerciseStatus, Exercise } from "@/lib/database.types";

const statusConfig = {
  correct:  { color: "bg-emerald-500", label: "Good Form",        textColor: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  adjust:   { color: "bg-amber-500",   label: "Needs Adjustment", textColor: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30" },
  incorrect: { color: "bg-red-500",      label: "Check Your Form",   textColor: "text-red-400",     bg: "bg-red-500/10",      border: "border-red-500/30" },
};

type ExerciseType = "squat" | "shoulder_press" | "shoulder_rotation" | "back_mobility" | "ankle" | "knee_extension" | "calf_raise" | "biceps_curl" | "neck";

function classifyExercise(name: string): ExerciseType {
  const n = name.toLowerCase();
  if (n.includes("squat") || n.includes("sit")) return "squat";
  if (n.includes("press")) return "shoulder_press";
  if (n.includes("rotation") || n.includes("flexion") || n.includes("wall slide")) return "shoulder_rotation";
  if (n.includes("cat") || n.includes("bird dog") || n.includes("dead bug") || n.includes("back")) return "back_mobility";
  if (n.includes("knee") || n.includes("extension") || n.includes("heel slide") || n.includes("hamstring")) return "knee_extension";
  if (n.includes("calf") || n.includes("raise") || n.includes("ankle")) return "calf_raise";
  if (n.includes("bicep") || n.includes("curl")) return "biceps_curl";
  if (n.includes("neck") || n.includes("chin") || n.includes("head")) return "neck";
  return "squat";
}

function overallFromAngles(angles: JointAngle[]): ExerciseStatus {
  if (!angles.length) return "correct";
  if (angles.some((a) => a.status === "incorrect")) return "incorrect";
  if (angles.some((a) => a.status === "adjust")) return "adjust";
  return "correct";
}

function calcAccuracy(angles: JointAngle[]): number {
  if (!angles.length) return 0;
  return Math.round(angles.reduce((s, a) => s + (a.status === "correct" ? 100 : a.status === "adjust" ? 60 : 20), 0) / angles.length);
}

function getJointStatus(label: string, degrees: number): ExerciseStatus {
  if (degrees === 0) return "correct";
  switch (label) {
    case "Left Knee": case "Right Knee":
      return degrees < 50 || degrees > 130 ? "incorrect" : degrees < 70 || degrees > 110 ? "adjust" : "correct";
    case "Left Shoulder": case "Right Shoulder":
      return degrees < 30 || degrees > 170 ? "incorrect" : degrees < 60 || degrees > 160 ? "adjust" : "correct";
    case "Left Elbow": case "Right Elbow":
      return degrees < 60 || degrees > 175 ? "incorrect" : degrees < 90 || degrees > 170 ? "adjust" : "correct";
    case "Hip Flexion":
      return degrees < 40 || degrees > 140 ? "incorrect" : degrees < 60 || degrees > 120 ? "adjust" : "correct";
    default:
      return "correct";
  }
}

function ExercisePicker({ onStart, isStarting }: { onStart: (ex: Exercise) => void; isStarting: boolean }) {
  const { data: exercises, isLoading } = useExercises();
  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!exercises?.length) return <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center"><Dumbbell className="h-12 w-12 text-muted-foreground" /><p className="text-muted-foreground">No exercises found.</p></div>;
  const grouped = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => { (acc[ex.body_part ?? "Other"] ??= []).push(ex); return acc; }, {});
  return (
    <div className="container mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl text-foreground mb-2 animate-fade-up" style={{ fontFamily: "'DM Serif Display', serif" }}>Choose an Exercise</h1>
      <p className="text-muted-foreground text-sm mb-10 animate-fade-up">Pick an exercise to begin your session.</p>
      {Object.entries(grouped).map(([bodyPart, exList]) => (
        <div key={bodyPart} className="mb-8 animate-fade-up">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{bodyPart}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {exList.map((ex) => (
              <button key={ex.id} disabled={isStarting} onClick={() => onStart(ex)}
                className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50">
                <div>
                  <p className="font-medium text-foreground">{ex.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">{ex.difficulty} &middot; {ex.body_part}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ActiveSessionView({
  session,
  sessionExercises,
}: {
  session: NonNullable<ReturnType<typeof useActiveSession>["data"]>;
  sessionExercises: (import("@/lib/database.types").SessionExercise & { exercise: Exercise })[];
}) {
  const saveSet = useSaveSet();
  const endSession = useEndSession();
  const [isRecording, setIsRecording] = useState(true);
  const [landmarks, setLandmarks] = useState<PoseLandmarks | null>(null);
  const [jointAngles, setJointAngles] = useState<JointAngle[]>([]);
  const [overallStatus, setOverallStatus] = useState<ExerciseStatus>("correct");
  const [accuracy, setAccuracy] = useState(0);
  const [reps, setReps] = useState(0);
  const [completedSets, setCompletedSets] = useState(0);
  const [lastFeedback, setLastFeedback] = useState<string>("");
  const [repHint, setRepHint] = useState<string>("");
  const { speak, speakNow, enabled: voiceEnabled, toggle: toggleVoice } = useVoiceFeedback(4000);

  const currentEx = sessionExercises[0];
  const exercise: Exercise | undefined = currentEx?.exercise;
  const targetReps = currentEx?.reps ?? 10;
  const targetSets = currentEx?.sets ?? 3;
  const exType = classifyExercise(exercise?.name ?? "");

  const repsRef = useRef(0);
  const squatPhaseRef = useRef<"up" | "down" | null>(null);
  const squatCooldownRef = useRef(false);
  const shoulderPhaseRef = useRef<"start" | "mid" | null>(null);
  const shoulderCooldownRef = useRef(false);
  const backPhaseRef = useRef<"cow" | "cat" | null>(null);
  const backCooldownRef = useRef(false);
  const anklePhaseRef = useRef<"down" | "up" | null>(null);
  const ankleCooldownRef = useRef(false);
  const bicepsPhaseRef = useRef<"down" | "up" | null>(null);
  const bicepsCooldownRef = useRef(false);
  const neckPhaseRef = useRef<"center" | "left" | "right" | null>(null);
  const neckCooldownRef = useRef(false);
  const prevStatusRef = useRef<ExerciseStatus>("correct");

  function calcAngle(A: {x:number;y:number;z:number;visibility:number}, B: {x:number;y:number;z:number;visibility:number}, C: {x:number;y:number;z:number;visibility:number}): number {
    const ux = A.x - B.x, uy = A.y - B.y, uz = (A.z ?? 0) - (B.z ?? 0);
    const vx = C.x - B.x, vy = C.y - B.y, vz = (C.z ?? 0) - (B.z ?? 0);
    const dotProd = ux * vx + uy * vy + uz * vz;
    const magAB = Math.sqrt(ux*ux + uy*uy + uz*uz);
    const magCB = Math.sqrt(vx*vx + vy*vy + vz*vz);
    if (magAB === 0 || magCB === 0) return 0;
    return Math.round(Math.acos(Math.max(-1, Math.min(1, dotProd / (magAB * magCB)))) * (180 / Math.PI));
  }

  function getAngle(lm: PoseLandmarks, a: keyof PoseLandmarks, b: keyof PoseLandmarks, c: keyof PoseLandmarks): number {
    const A = lm[a];
    const B = lm[b];
    const C = lm[c];
    if (!A || !B || !C) return 0;
    if (A.visibility < 0.5 || B.visibility < 0.5 || C.visibility < 0.5) return 0;
    return calcAngle(A, B, C);
  }

useEffect(() => {
    if (!landmarks || !isRecording) return;
    const lm = landmarks;

    const lKnee = getAngle(lm, "left_hip", "left_knee", "left_ankle");
    const rKnee = getAngle(lm, "right_hip", "right_knee", "right_ankle");
    const lShoulder = getAngle(lm, "left_elbow", "left_shoulder", "left_hip");
    const rShoulder = getAngle(lm, "right_elbow", "right_shoulder", "right_hip");
    const lElbow = getAngle(lm, "left_shoulder", "left_elbow", "left_wrist");
    const rElbow = getAngle(lm, "right_shoulder", "right_elbow", "right_wrist");
    const lHipFlex = getAngle(lm, "left_shoulder", "left_hip", "left_knee");
    const rHipFlex = getAngle(lm, "right_shoulder", "right_hip", "right_knee");

    const results: JointAngle[] = [];
    if (lKnee > 0) results.push({ label: "Left Knee", angle: lKnee, status: getJointStatus("Left Knee", lKnee) });
    if (rKnee > 0) results.push({ label: "Right Knee", angle: rKnee, status: getJointStatus("Right Knee", rKnee) });
    if (lShoulder > 0) results.push({ label: "Left Shoulder", angle: lShoulder, status: getJointStatus("Left Shoulder", lShoulder) });
    if (rShoulder > 0) results.push({ label: "Right Shoulder", angle: rShoulder, status: getJointStatus("Right Shoulder", rShoulder) });
    if (lElbow > 0) results.push({ label: "Left Elbow", angle: lElbow, status: getJointStatus("Left Elbow", lElbow) });
    if (rElbow > 0) results.push({ label: "Right Elbow", angle: rElbow, status: getJointStatus("Right Elbow", rElbow) });
    if (lHipFlex > 0) results.push({ label: "Hip Flexion", angle: lHipFlex, status: getJointStatus("Hip Flexion", lHipFlex) });

    setJointAngles(results);
    const newStatus = overallFromAngles(results);
    setOverallStatus(newStatus);
    setAccuracy(calcAccuracy(results));

    const currentReps = repsRef.current;

    // Debug logging every 30 frames (~1 second at 30fps)
    if (Math.random() < 0.03) {
      console.log(`[${exType}] Phase: ${squatPhaseRef.current}, Knee: ${Math.max(lKnee, rKnee).toFixed(0)}, Reps: ${repsRef.current}`);
    }

    switch (exType) {
      case "squat": {
        const kneeAngle = Math.max(lKnee, rKnee);
        if (kneeAngle > 0 && !squatCooldownRef.current) {
          if (squatPhaseRef.current === null || squatPhaseRef.current === "up") {
            if (kneeAngle < 110) { 
              squatPhaseRef.current = "down"; 
              setRepHint("Squat down"); 
              console.log("[SQUAT] Phase -> down, knee:", kneeAngle.toFixed(0));
            }
          } else if (squatPhaseRef.current === "down") {
            if (kneeAngle > 160) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              console.log("[SQUAT] REP COUNTED!", next);
              if (next <= targetReps) speak(`Rep ${next}`);
              squatPhaseRef.current = "up";
              squatCooldownRef.current = true;
              setRepHint("Stand up");
              setTimeout(() => { squatCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
      case "shoulder_press": {
        const elbowAngle = Math.max(lElbow, rElbow);
        if (elbowAngle > 0 && !shoulderCooldownRef.current) {
          if (shoulderPhaseRef.current === null || shoulderPhaseRef.current === "start") {
            if (elbowAngle < 110) { shoulderPhaseRef.current = "mid"; setRepHint("Lower"); }
          } else if (shoulderPhaseRef.current === "mid") {
            if (elbowAngle > 155) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              if (next <= targetReps) speak(`Rep ${next}`);
              shoulderPhaseRef.current = "start";
              shoulderCooldownRef.current = true;
              setRepHint("Press up");
              setTimeout(() => { shoulderCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
      case "shoulder_rotation": {
        const shoulderAngle = Math.max(lShoulder, rShoulder);
        if (shoulderAngle > 0 && !shoulderCooldownRef.current) {
          if (shoulderPhaseRef.current === null || shoulderPhaseRef.current === "start") {
            if (shoulderAngle > 140) { shoulderPhaseRef.current = "mid"; setRepHint("Raise arm up"); }
          } else if (shoulderPhaseRef.current === "mid") {
            if (shoulderAngle < 100) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              if (next <= targetReps) speak(`Rep ${next}`);
              shoulderPhaseRef.current = "start";
              shoulderCooldownRef.current = true;
              setRepHint("Lower arm");
              setTimeout(() => { shoulderCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
      case "back_mobility": {
        const hipAngle = Math.max(lHipFlex, rHipFlex);
        if (hipAngle > 0 && !backCooldownRef.current) {
          if (backPhaseRef.current === null || backPhaseRef.current === "cow") {
            if (hipAngle > 120) { backPhaseRef.current = "cat"; setRepHint("Cat - round spine"); }
          } else if (backPhaseRef.current === "cat") {
            if (hipAngle < 90) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              if (next <= targetReps) speak(`Rep ${next}`);
              backPhaseRef.current = "cow";
              backCooldownRef.current = true;
              setRepHint("Cow - arch back");
              setTimeout(() => { backCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
      case "knee_extension": {
        const kneeAngle = Math.max(lKnee, rKnee);
        if (kneeAngle > 0 && !squatCooldownRef.current) {
          if (squatPhaseRef.current === null || squatPhaseRef.current === "up") {
            if (kneeAngle < 110) { squatPhaseRef.current = "down"; setRepHint("Bend knee"); }
          } else if (squatPhaseRef.current === "down") {
            if (kneeAngle > 160) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              if (next <= targetReps) speak(`Rep ${next}`);
              squatPhaseRef.current = "up";
              squatCooldownRef.current = true;
              setRepHint("Extend");
              setTimeout(() => { squatCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
      case "biceps_curl": {
        const elbowAngle = Math.max(lElbow, rElbow);
        if (elbowAngle > 0 && !bicepsCooldownRef.current) {
          if (bicepsPhaseRef.current === null || bicepsPhaseRef.current === "down") {
            if (elbowAngle < 70) { 
              bicepsPhaseRef.current = "up"; 
              setRepHint("Curl up"); 
              console.log("[BICEPS] Phase -> up, elbow:", elbowAngle.toFixed(0));
            }
          } else if (bicepsPhaseRef.current === "up") {
            if (elbowAngle > 150) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              console.log("[BICEPS] REP COUNTED!", next);
              if (next <= targetReps) speak(`Rep ${next}`);
              bicepsPhaseRef.current = "down";
              bicepsCooldownRef.current = true;
              setRepHint("Lower slowly");
              setTimeout(() => { bicepsCooldownRef.current = false; }, 700);
            }
          }
        }
        break;
      }
      case "neck": {
        // Neck rotation: detect head turning left/right using shoulder landmarks
        const leftShoulderX = lm.left_shoulder?.x ?? 0;
        const rightShoulderX = lm.right_shoulder?.x ?? 0;
        const noseX = lm.nose?.x ?? 0;
        const shoulderCenterX = (leftShoulderX + rightShoulderX) / 2;
        const headOffset = (noseX - shoulderCenterX) / (Math.abs(leftShoulderX - rightShoulderX) || 1);
        
        if (!neckCooldownRef.current) {
          if (neckPhaseRef.current === null || neckPhaseRef.current === "center") {
            if (headOffset < -0.3) { 
              neckPhaseRef.current = "left"; 
              setRepHint("Turn left");
              console.log("[NECK] Phase -> left, offset:", headOffset.toFixed(2));
            } else if (headOffset > 0.3) { 
              neckPhaseRef.current = "right"; 
              setRepHint("Turn right");
              console.log("[NECK] Phase -> right, offset:", headOffset.toFixed(2));
            }
          } else if (neckPhaseRef.current === "left" || neckPhaseRef.current === "right") {
            if (Math.abs(headOffset) < 0.1) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              console.log("[NECK] REP COUNTED!", next);
              if (next <= targetReps) speak(`Rep ${next}`);
              neckPhaseRef.current = "center";
              neckCooldownRef.current = true;
              setRepHint("Back to center");
              setTimeout(() => { neckCooldownRef.current = false; }, 800);
            }
          }
        }
        break;
      }
      case "calf_raise":
      case "ankle":
      default: {
        const kneeAngle = Math.max(lKnee, rKnee);
        if (kneeAngle > 0 && !ankleCooldownRef.current) {
          if (anklePhaseRef.current === null || anklePhaseRef.current === "up") {
            if (kneeAngle < 130) { anklePhaseRef.current = "down"; setRepHint("Rise up"); }
          } else if (anklePhaseRef.current === "down") {
            if (kneeAngle > 160) {
              const next = currentReps + 1;
              repsRef.current = next;
              setReps(next);
              if (next <= targetReps) speak(`Rep ${next}`);
              anklePhaseRef.current = "up";
              ankleCooldownRef.current = true;
              setRepHint("Lower down");
              setTimeout(() => { ankleCooldownRef.current = false; }, 600);
            }
          }
        }
        break;
      }
    }

    if (newStatus !== "correct" && newStatus !== prevStatusRef.current) {
      prevStatusRef.current = newStatus;
      const msg = newStatus === "adjust" ? "Minor adjustments needed" : "Check your form";
      setLastFeedback(msg);
      speak(msg);
    } else if (newStatus === "correct" && prevStatusRef.current !== "correct") {
      prevStatusRef.current = "correct";
      setLastFeedback("");
    }
  }, [landmarks, isRecording, exType, targetReps, speak]);

  const handleSaveSet = useCallback(async () => {
    if (!currentEx) return;
    setIsRecording(false);
    const currentReps = repsRef.current;
    try {
      await saveSet.mutateAsync({
        sessionExerciseId: currentEx.id,
        repsCompleted: currentReps > 0 ? currentReps : 0,
        accuracy,
        feedback: overallStatus === "correct" ? "Great form!" : overallStatus === "adjust" ? "Minor adjustments" : "Form needs work",
      });
      const newSetCount = completedSets + 1;
      setCompletedSets(newSetCount);
      repsRef.current = 0;
      setReps(0);
      setLastFeedback("");
      setRepHint("");
      squatPhaseRef.current = null; squatCooldownRef.current = false;
      shoulderPhaseRef.current = null; shoulderCooldownRef.current = false;
      backPhaseRef.current = null; backCooldownRef.current = false;
      anklePhaseRef.current = null; ankleCooldownRef.current = false;
      bicepsPhaseRef.current = null; bicepsCooldownRef.current = false;
      neckPhaseRef.current = null; neckCooldownRef.current = false;
      prevStatusRef.current = "correct";
      speakNow("Set complete!");
      if (newSetCount >= targetSets) {
        await endSession.mutateAsync({ sessionId: session.id, startedAt: session.started_at, status: "completed" });
        toast.success("Session complete! Great work");
      } else {
        toast.success(`Set ${newSetCount} saved! Rest, then continue.`);
        setTimeout(() => setIsRecording(true), 1500);
      }
    } catch {
      toast.error("Failed to save set.");
      setIsRecording(true);
    }
  }, [currentEx, accuracy, overallStatus, session.id, completedSets, targetSets, targetReps, saveSet, endSession, speak]);

  const handleCancelSession = async () => {
    try {
      await endSession.mutateAsync({ sessionId: session.id, startedAt: session.started_at, status: "cancelled" });
      toast("Session cancelled.");
    } catch { toast.error("Could not cancel session."); }
  };

  const cfg = statusConfig[overallStatus];

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="flex h-[calc(100vh-56px)] flex-col md:flex-row">
        <div className="flex flex-1 items-center justify-center p-6 md:w-[60%]">
          <PoseCamera onLandmarksChange={setLandmarks} isRecording={isRecording} className="w-full max-w-2xl" showSkeleton />
        </div>
        <div className="flex flex-col justify-center border-l border-border p-8 md:w-[40%] overflow-y-auto">
          <h2 className="text-2xl text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>
            {exercise?.name ?? "Exercise"}
          </h2>
          <div className="mt-1 text-xs text-muted-foreground">
            Set {completedSets + 1} of {targetSets} &middot; Target: {targetReps} reps &middot; Mode: {exType}
          </div>

          {!landmarks && isRecording && (
            <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
              <p className="text-xs font-medium text-amber-400">Waiting for pose detection... step in front of the camera</p>
            </div>
          )}

          {overallStatus !== "correct" && lastFeedback && (
            <div className={`mt-4 rounded-lg border px-4 py-3 ${cfg.bg} ${cfg.border}`}>
              <p className={`text-sm font-medium ${cfg.textColor}`}>{lastFeedback}</p>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2">
            <div className={`h-3 w-3 rounded-full ${cfg.color} ${isRecording ? "animate-pulse" : ""}`} />
            <span className={`text-sm font-semibold ${cfg.textColor}`}>{isRecording ? "Tracking" : "Paused"} &middot; {cfg.label}</span>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-mono text-5xl font-bold text-foreground">{reps}</span>
            <span className="text-sm text-muted-foreground">/ {targetReps} reps</span>
          </div>

          {repHint && <div className="mt-1 text-xs text-muted-foreground animate-pulse">{repHint}</div>}

          <div className="mt-4 flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full bg-border overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300"
                style={{ width: `${accuracy}%`, backgroundColor: accuracy >= 80 ? "#22c55e" : accuracy >= 50 ? "#eab308" : "#ef4444" }}
              />
            </div>
            <span className="font-mono text-xs font-bold w-10 text-right">{accuracy}%</span>
          </div>

          <div className="mt-6 space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Joint Angles</h3>
            {jointAngles.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Step in front of the camera...</p>
            ) : (
              jointAngles.map((j) => (
                <div key={j.label} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                  <span className="text-sm text-foreground">{j.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-foreground">{j.angle}&deg;</span>
                    <div className={`h-2 w-2 rounded-full ${statusConfig[j.status].color}`} />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button size="sm" onClick={() => setIsRecording(!isRecording)}
              className={`gap-1.5 ${isRecording ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}>
              {isRecording ? "Pause Tracking" : "Resume Tracking"}
            </Button>
            <Button size="sm" onClick={handleSaveSet} disabled={saveSet.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              Save Set
            </Button>
            <Button variant="outline" size="sm" onClick={toggleVoice} className="gap-1.5">
              {voiceEnabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
              {voiceEnabled ? "Voice On" : "Voice Off"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleCancelSession} disabled={endSession.isPending}
              className="text-red-500 hover:text-red-600">End Session</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionCompleteScreen() {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center gap-4 text-center px-6 animate-fade-up">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
        <Trophy className="h-10 w-10 text-emerald-500" />
      </div>
      <h2 className="text-3xl text-foreground" style={{ fontFamily: "'DM Serif Display', serif" }}>Session Complete!</h2>
      <p className="text-muted-foreground max-w-md">Great work today. Your data has been saved.</p>
      <Button asChild className="mt-4"><a href="/progress">View Progress</a></Button>
    </div>
  );
}

const Session = () => {
  const { user } = useAuth();
  const location = useLocation();
  const { data: activeSession, isLoading } = useActiveSession();
  const startSession = useStartSession();
  const [justCompleted, setJustCompleted] = useState(false);
  const [showPreSessionModal, setShowPreSessionModal] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const { data: sessionExercises, isLoading: exercisesLoading } = useSessionExercises(activeSession?.id);

  const preSessionState = location.state as {
    painLevelBefore?: number;
    sorenessAreas?: string[];
    sharpPain?: string;
  } | null;

  const handleStartExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setShowPreSessionModal(true);
  };

  const handleStartWithPreSession = async (exercise: Exercise, preData: { painLevelBefore: number; sorenessAreas: string[]; sharpPain: string }) => {
    setShowPreSessionModal(false);
    try {
      await startSession.mutateAsync({
        exerciseId: exercise.id,
        painLevelBefore: preData.painLevelBefore,
        sorenessAreas: preData.sorenessAreas,
        sharpPain: preData.sharpPain,
      });
    } catch { toast.error("Failed to start session."); }
  };

  const handleStartWithoutPreSession = async () => {
    if (!selectedExercise) return;
    setShowPreSessionModal(false);
    try {
      await startSession.mutateAsync({ exerciseId: selectedExercise.id });
    } catch { toast.error("Failed to start session."); }
  };

  useEffect(() => {
    if (!isLoading && !activeSession && startSession.isSuccess) setJustCompleted(true);
  }, [activeSession, isLoading, startSession.isSuccess]);

  if (!user) return <div className="min-h-screen pt-14 flex items-center justify-center"><p className="text-muted-foreground">Please log in.</p></div>;
  if (isLoading || (activeSession && exercisesLoading)) return <div className="min-h-screen pt-14 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (justCompleted && !activeSession) return <div className="min-h-screen pt-14"><SessionCompleteScreen /></div>;
  if (activeSession && sessionExercises && sessionExercises.length > 0) return <ActiveSessionView session={activeSession} sessionExercises={sessionExercises} />;

  return (
    <div className="min-h-screen pt-14 bg-background">
      <PreSessionCheckModal
        open={showPreSessionModal}
        onClose={() => setShowPreSessionModal(false)}
        onStartSession={handleStartWithPreSession}
        onSkip={handleStartWithoutPreSession}
        selectedExercise={selectedExercise}
      />
      <ExercisePicker onStart={handleStartExercise} isStarting={startSession.isPending} />
    </div>
  );
};

export default Session;