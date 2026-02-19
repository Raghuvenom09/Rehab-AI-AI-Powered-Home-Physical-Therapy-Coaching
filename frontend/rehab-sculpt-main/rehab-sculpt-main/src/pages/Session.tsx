import { useState, useEffect } from "react";
import SkeletonWireframe from "@/components/SkeletonWireframe";

const jointData = [
  { label: "Left Knee", angle: 142, status: "correct" as const },
  { label: "Right Knee", angle: 138, status: "correct" as const },
  { label: "Hip Flexion", angle: 87, status: "adjust" as const },
  { label: "Left Shoulder", angle: 165, status: "correct" as const },
  { label: "Right Elbow", angle: 92, status: "incorrect" as const },
];

const statusConfig = {
  correct: { color: "bg-success", label: "Correct Form", textColor: "text-success" },
  adjust: { color: "bg-warning", label: "Needs Adjustment", textColor: "text-warning" },
  incorrect: { color: "bg-destructive", label: "Incorrect", textColor: "text-destructive" },
};

const Session = () => {
  const [reps, setReps] = useState(7);
  const [overallStatus, setOverallStatus] = useState<"correct" | "adjust" | "incorrect">("adjust");

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses: ("correct" | "adjust" | "incorrect")[] = ["correct", "adjust", "incorrect"];
      setOverallStatus(statuses[Math.floor(Math.random() * statuses.length)]);
      setReps((r) => (r < 12 ? r + 1 : 1));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen pt-14 bg-background">
      <div className="flex h-[calc(100vh-56px)] flex-col md:flex-row">
        {/* Left Panel - Camera */}
        <div className="flex flex-1 items-center justify-center p-6 md:w-[60%]">
          <div className="relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="absolute inset-4 flex items-center justify-center rounded-lg border border-border/50">
              <SkeletonWireframe className="h-3/4 w-auto opacity-90" />
            </div>

            {["top-2 left-2", "top-2 right-2", "bottom-2 left-2", "bottom-2 right-2"].map((pos, i) => (
              <div key={i} className={`absolute ${pos} h-4 w-4 border-primary/30 ${
                i < 2 ? "border-t" : "border-b"
              } ${i % 2 === 0 ? "border-l" : "border-r"}`} />
            ))}

            <div className="absolute top-4 right-4 flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive status-pulse" />
              <span className="font-mono-data text-[10px] uppercase tracking-widest text-muted-foreground">Recording</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Feedback */}
        <div className="flex flex-col justify-center border-l border-border p-8 md:w-[40%]">
          <h2 className="text-2xl text-foreground md:text-3xl" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Squat — Deep
          </h2>

          <div className="mt-4 flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${statusConfig[overallStatus].color} status-pulse`} />
            <span className={`text-sm font-semibold ${statusConfig[overallStatus].textColor} transition-smooth`}>
              {statusConfig[overallStatus].label}
            </span>
          </div>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-mono-data text-4xl font-bold text-foreground">{reps}</span>
            <span className="text-sm text-muted-foreground">/ 12 reps</span>
            <span className="ml-4 text-sm text-muted-foreground">Set 2 / 3</span>
          </div>

          <div className="mt-8 space-y-2.5">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Joint Angles
            </h3>
            {jointData.map((joint) => (
              <div key={joint.label} className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-2.5">
                <span className="text-sm text-foreground">{joint.label}</span>
                <div className="flex items-center gap-3">
                  <span className="font-mono-data text-sm font-bold text-foreground">{joint.angle}°</span>
                  <div className={`h-2 w-2 rounded-full ${statusConfig[joint.status].color}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Session;
