import { useEffect, useRef, useState, useCallback } from "react";

// Use global MediaPipe from CDN
declare global {
  interface Window {
    Pose: typeof Pose;
    Camera: typeof Camera;
  }
}

// Simple type definitions for MediaPipe
interface PoseResults {
  poseLandmarks?: Array<{ x: number; y: number; z: number; visibility: number }>;
}

interface PoseConfig {
  modelComplexity?: number;
  smoothLandmarks?: boolean;
  enableSegmentation?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  onResults?: (results: PoseResults) => void;
}

type ResultsCallback = (results: PoseResults) => void;

export type LandmarkName =
  | "nose"
  | "left_eye_inner"
  | "left_eye"
  | "left_eye_outer"
  | "right_eye_inner"
  | "right_eye"
  | "right_eye_outer"
  | "left_ear"
  | "right_ear"
  | "mouth_left"
  | "mouth_right"
  | "left_shoulder"
  | "right_shoulder"
  | "left_elbow"
  | "right_elbow"
  | "left_wrist"
  | "right_wrist"
  | "left_pinky"
  | "right_pinky"
  | "left_index"
  | "right_index"
  | "left_thumb"
  | "right_thumb"
  | "left_hip"
  | "right_hip"
  | "left_knee"
  | "right_knee"
  | "left_ankle"
  | "right_ankle"
  | "left_heel"
  | "right_heel"
  | "left_foot_index"
  | "right_foot_index";

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export type PoseLandmarks = {
  [key in LandmarkName]?: NormalizedLandmark;
};

export type CameraStatus = "idle" | "requesting" | "denied" | "ready" | "error";

interface UsePoseDetectionOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  width?: number;
  height?: number;
  modelComplexity?: 0 | 1 | 2;
  smoothLandmarks?: boolean;
  minDetectionConfidence?: number;
  minTrackingConfidence?: number;
  enableSegmentation?: boolean;
}

interface UsePoseDetectionReturn {
  landmarks: PoseLandmarks | null;
  results: Results | null;
  cameraStatus: CameraStatus;
  isModelLoading: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

const LANDMARK_NAMES: LandmarkName[] = [
  "nose",
  "left_eye_inner",
  "left_eye",
  "left_eye_outer",
  "right_eye_inner",
  "right_eye",
  "right_eye_outer",
  "left_ear",
  "right_ear",
  "mouth_left",
  "mouth_right",
  "left_shoulder",
  "right_shoulder",
  "left_elbow",
  "right_elbow",
  "left_wrist",
  "right_wrist",
  "left_pinky",
  "right_pinky",
  "left_index",
  "right_index",
  "left_thumb",
  "right_thumb",
  "left_hip",
  "right_hip",
  "left_knee",
  "right_knee",
  "left_ankle",
  "right_ankle",
  "left_heel",
  "right_heel",
  "left_foot_index",
  "right_foot_index",
];

function resultsToLandmarks(results: Results): PoseLandmarks {
  if (!results.poseLandmarks) return {};
  const landmarks: PoseLandmarks = {};
  results.poseLandmarks.forEach((lm, i) => {
    if (lm && lm.visibility > 0.5) {
      landmarks[LANDMARK_NAMES[i]] = {
        x: lm.x,
        y: lm.y,
        z: lm.z,
        visibility: lm.visibility,
      };
    }
  });
  return landmarks;
}

export function usePoseDetection({
  videoRef,
  width = 1280,
  height = 720,
  modelComplexity = 1,
  smoothLandmarks = true,
  minDetectionConfidence = 0.5,
  minTrackingConfidence = 0.5,
  enableSegmentation = false,
}: UsePoseDetectionOptions): UsePoseDetectionReturn {
  const [landmarks, setLandmarks] = useState<PoseLandmarks | null>(null);
  const [results, setResults] = useState<Results | null>(null);
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle");
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const stopCamera = useCallback(() => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (poseRef.current) {
      poseRef.current.close();
      poseRef.current = null;
    }
    setCameraStatus("idle");
    setLandmarks(null);
    setResults(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!videoRef.current) {
      setError("Video element not available");
      return;
    }

    stopCamera();
    setCameraStatus("requesting");
    setError(null);
    setIsModelLoading(true);

    try {
      const PoseClass = (window as unknown as { Pose: new (config: PoseConfig) => { setOptions: (opts: Record<string, unknown>) => void; onResults: (cb: ResultsCallback) => void; initialize: () => Promise<void>; send: (data: { image: HTMLVideoElement }) => Promise<void> } }).Pose;
      const CameraClass = (window as unknown as { Camera: new (video: HTMLVideoElement, config: { onFrame: () => Promise<void>; width: number; height: number }) => { start: () => Promise<void> } }).Camera;

      if (!PoseClass || !CameraClass) {
        throw new Error("MediaPipe not loaded");
      }

      const pose = new PoseClass({
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });

      pose.setOptions({
        modelComplexity,
        smoothLandmarks,
        enableSegmentation,
        smoothSegmentation: enableSegmentation,
        minDetectionConfidence,
        minTrackingConfidence,
      });

      pose.onResults((res) => {
        setResults(res as unknown as Results);
        setLandmarks(resultsToLandmarks(res));
      });

      await pose.initialize();

      const camera = new CameraClass(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width,
        height,
      });

      poseRef.current = pose;
      cameraRef.current = camera;

      await camera.start();
      setIsModelLoading(false);
      setCameraStatus("ready");
    } catch (err) {
      setIsModelLoading(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("denied")) {
        setCameraStatus("denied");
        setError("Camera access denied. Please allow camera permissions.");
      } else {
        setCameraStatus("error");
        setError(`Failed to start camera: ${msg}`);
      }
    }
  }, [
    videoRef,
    width,
    height,
    modelComplexity,
    smoothLandmarks,
    minDetectionConfidence,
    minTrackingConfidence,
    enableSegmentation,
    stopCamera,
  ]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  return {
    landmarks,
    results,
    cameraStatus,
    isModelLoading,
    error,
    startCamera,
    stopCamera,
  };
}
