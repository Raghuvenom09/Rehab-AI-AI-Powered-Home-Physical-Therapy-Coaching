import { useRef, useEffect, useState } from "react";
import { Camera, CameraOff, AlertCircle, Loader2 } from "lucide-react";
import { usePoseDetection } from "@/hooks/use-pose-detection";
import type { PoseLandmarks } from "@/hooks/use-pose-detection";

interface PoseCameraProps {
  onLandmarksChange?: (landmarks: PoseLandmarks | null) => void;
  className?: string;
  showSkeleton?: boolean;
  isRecording?: boolean;
}

const BONES: [number, number][] = [
  [0, 1],   // nose-leftEyeInner
  [0, 2],   // nose-rightEyeInner
  [1, 3],   // leftEyeInner-leftEye
  [2, 4],   // rightEyeInner-rightEye
  [3, 5],   // leftEye-leftEyeOuter
  [4, 6],   // rightEye-rightEyeOuter
  [7, 9],   // leftEar-leftEyeOuter
  [8, 10],  // rightEar-rightEyeOuter
  [11, 12], // leftShoulder-rightShoulder
  [11, 13], // leftShoulder-leftElbow
  [12, 14], // rightShoulder-rightElbow
  [13, 15], // leftElbow-leftWrist
  [14, 16], // rightElbow-rightWrist
  [11, 23], // leftShoulder-leftHip
  [12, 24], // rightShoulder-rightHip
  [23, 24], // leftHip-rightHip
  [23, 25], // leftHip-leftKnee
  [24, 26], // rightHip-rightKnee
  [25, 27], // leftKnee-leftAnkle
  [26, 28], // rightKnee-rightAnkle
  [27, 29], // leftAnkle-leftHeel
  [28, 30], // rightAnkle-rightHeel
  [29, 31], // leftHeel-leftFootIndex
  [30, 32], // rightHeel-rightFootIndex
];

const KEY_JOINT_INDICES = new Set([11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]);

export function PoseCamera({
  onLandmarksChange,
  className = "",
  showSkeleton = true,
  isRecording = true,
}: PoseCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const {
    results,
    cameraStatus,
    isModelLoading,
    error,
    startCamera,
    stopCamera,
  } = usePoseDetection({
    videoRef,
    width: 640,
    height: 480,
    modelComplexity: 1,
    smoothLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5,
  });

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  useEffect(() => {
    onLandmarksChange?.(results ? extractLandmarks(results) : null);
  }, [results, onLandmarksChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    function draw() {
      if (!canvas || !video) return;
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (cameraStatus === "ready" && showSkeleton) {
        const landmarks = results?.poseLandmarks;
        if (landmarks && landmarks.length > 0) {
          const scaleX = canvas.width;
          const scaleY = canvas.height;

          ctx.strokeStyle = "hsl(185 100% 55%)";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";

          for (const [i, j] of BONES) {
            const a = landmarks[i];
            const b = landmarks[j];
            if (!a || !b || a.visibility < 0.4 || b.visibility < 0.4) continue;
            ctx.beginPath();
            ctx.moveTo(a.x * scaleX, a.y * scaleY);
            ctx.lineTo(b.x * scaleX, b.y * scaleY);
            ctx.stroke();
          }

          for (let i = 0; i < landmarks.length; i++) {
            const lm = landmarks[i];
            if (!lm || lm.visibility < 0.4) continue;
            const isKey = KEY_JOINT_INDICES.has(i);
            ctx.beginPath();
            ctx.arc(lm.x * scaleX, lm.y * scaleY, isKey ? 5 : 3, 0, Math.PI * 2);
            ctx.fillStyle = isKey ? "hsl(185 100% 55%)" : "hsl(185 100% 55% / 0.6)";
            ctx.fill();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, [cameraStatus, results, showSkeleton]);

  if (cameraStatus === "denied" || cameraStatus === "error") {
    return (
      <div className={`flex aspect-video w-full max-w-2xl items-center justify-center rounded-xl border border-border bg-card ${className}`}>
        <div className="flex flex-col items-center gap-3 text-center p-8">
          {cameraStatus === "denied" ? (
            <CameraOff className="h-10 w-10 text-destructive" />
          ) : (
            <AlertCircle className="h-10 w-10 text-destructive" />
          )}
          <p className="text-sm text-muted-foreground max-w-xs">
            {cameraStatus === "denied"
              ? "Camera access denied. Please allow camera permissions in your browser settings."
              : error || "Camera error occurred."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative aspect-video w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card shadow-sm ${className}`}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="h-full w-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        onCanPlay={() => setCameraReady(true)}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ transform: "scaleX(-1)" }}
      />

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
        {(cameraStatus === "requesting" || isModelLoading) && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-white/80" />
        )}
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

function extractLandmarks(results: any): PoseLandmarks | null {
  if (!results?.poseLandmarks) return null;
  const names = [
    "nose","left_eye_inner","left_eye","left_eye_outer",
    "right_eye_inner","right_eye","right_eye_outer",
    "left_ear","right_ear","mouth_left","mouth_right",
    "left_shoulder","right_shoulder","left_elbow","right_elbow",
    "left_wrist","right_wrist","left_pinky","right_pinky",
    "left_index","right_index","left_thumb","right_thumb",
    "left_hip","right_hip","left_knee","right_knee",
    "left_ankle","right_ankle","left_heel","right_heel",
    "left_foot_index","right_foot_index",
  ] as const;
  const landmarks: PoseLandmarks = {};
  results.poseLandmarks.forEach((lm: any, i: number) => {
    if (lm && lm.visibility > 0.5) {
      landmarks[names[i]] = { x: lm.x, y: lm.y, z: lm.z, visibility: lm.visibility };
    }
  });
  return landmarks;
}
