"""
Pose estimation engine with auto-detection:
  - CUDA available → YOLOv8x-pose (high accuracy, 60+ FPS on RTX 4060)
  - CPU fallback  → OpenVINO human-pose-estimation-0001

Returns unified 17-keypoint COCO format regardless of backend.
"""

import base64
import io
import logging
import os
from typing import Optional

import cv2
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ─── COCO 17-keypoint names (used by YOLOv8-pose) ─────────────────────────────

COCO_KEYPOINTS = [
    "nose",
    "left_eye",
    "right_eye",
    "left_ear",
    "right_ear",
    "left_shoulder",
    "right_shoulder",
    "left_elbow",
    "right_elbow",
    "left_wrist",
    "right_wrist",
    "left_hip",
    "right_hip",
    "left_knee",
    "right_knee",
    "left_ankle",
    "right_ankle",
]

# Indices for quick lookup
KP = {name: idx for idx, name in enumerate(COCO_KEYPOINTS)}

# ─── Joint angle definitions ──────────────────────────────────────────────────
# Each entry: (point_a, point_b_vertex, point_c) → angle at vertex

JOINT_ANGLE_DEFS = {
    "Left Knee": (KP["left_hip"], KP["left_knee"], KP["left_ankle"]),
    "Right Knee": (KP["right_hip"], KP["right_knee"], KP["right_ankle"]),
    "Left Shoulder": (KP["left_elbow"], KP["left_shoulder"], KP["left_hip"]),
    "Right Shoulder": (KP["right_elbow"], KP["right_shoulder"], KP["right_hip"]),
    "Left Elbow": (KP["left_shoulder"], KP["left_elbow"], KP["left_wrist"]),
    "Right Elbow": (KP["right_shoulder"], KP["right_elbow"], KP["right_wrist"]),
    "Hip Flexion": (KP["left_shoulder"], KP["left_hip"], KP["left_knee"]),
}

# Skeleton connections for overlay drawing
SKELETON_CONNECTIONS = [
    (KP["nose"], KP["left_eye"]),
    (KP["nose"], KP["right_eye"]),
    (KP["left_eye"], KP["left_ear"]),
    (KP["right_eye"], KP["right_ear"]),
    (KP["left_shoulder"], KP["right_shoulder"]),
    (KP["left_shoulder"], KP["left_elbow"]),
    (KP["right_shoulder"], KP["right_elbow"]),
    (KP["left_elbow"], KP["left_wrist"]),
    (KP["right_elbow"], KP["right_wrist"]),
    (KP["left_shoulder"], KP["left_hip"]),
    (KP["right_shoulder"], KP["right_hip"]),
    (KP["left_hip"], KP["right_hip"]),
    (KP["left_hip"], KP["left_knee"]),
    (KP["right_hip"], KP["right_knee"]),
    (KP["left_knee"], KP["left_ankle"]),
    (KP["right_knee"], KP["right_ankle"]),
]

MIN_CONFIDENCE = 0.3  # Skip keypoints below this visibility


class PoseEngine:
    """
    Unified pose estimation engine.
    Auto-selects YOLOv8x-pose (CUDA) or OpenVINO (CPU) based on hardware.
    """

    def __init__(self, force_cpu: bool = False):
        self.backend = "cpu"
        self.model = None
        self._openvino_model = None
        self._ov_input_shape = None

        if not force_cpu:
            try:
                import torch

                if torch.cuda.is_available():
                    self._init_yolo_cuda()
                    return
            except ImportError:
                logger.info("PyTorch not available, trying OpenVINO...")

        self._init_openvino()

    # ─── YOLOv8 CUDA init ──────────────────────────────────────────────────────

    def _init_yolo_cuda(self):
        """Load YOLOv8x-pose on CUDA."""
        from ultralytics import YOLO

        logger.info("Loading YOLOv8x-pose on CUDA...")
        self.model = YOLO("yolov8x-pose.pt")
        self.model.to("cuda")
        self.backend = "cuda"

        # Warm up
        dummy = np.zeros((640, 640, 3), dtype=np.uint8)
        self.model(dummy, verbose=False)

        import torch

        gpu_name = torch.cuda.get_device_name(0)
        logger.info(f"✓ YOLOv8x-pose loaded on CUDA ({gpu_name})")

    # ─── OpenVINO CPU init ─────────────────────────────────────────────────────

    def _init_openvino(self):
        """Load OpenVINO human-pose-estimation-0001 on CPU."""
        try:
            import openvino as ov

            model_dir = os.path.join(os.path.dirname(__file__), "models")
            xml_path = os.path.join(
                model_dir,
                "intel",
                "human-pose-estimation-0001",
                "FP16",
                "human-pose-estimation-0001.xml",
            )

            if not os.path.exists(xml_path):
                logger.warning(
                    f"OpenVINO model not found at {xml_path}. "
                    "Run 'python download_model.py' to download it."
                )
                # Create a dummy engine that returns empty results
                self.backend = "none"
                return

            core = ov.Core()
            model = core.read_model(xml_path)
            self._openvino_model = core.compile_model(model, "CPU")
            self._ov_input_shape = model.input(0).shape  # [1, 3, 256, 456]
            self.backend = "openvino-cpu"
            logger.info("✓ OpenVINO human-pose-estimation-0001 loaded on CPU")

        except ImportError:
            logger.warning("OpenVINO not available. Pose engine disabled.")
            self.backend = "none"

    # ─── Frame processing ──────────────────────────────────────────────────────

    def process_frame(self, frame_data: str) -> Optional[dict]:
        """
        Process a base64-encoded JPEG frame.

        Returns:
            {
                "keypoints": [[x, y, conf], ...],  # 17 COCO keypoints, normalized 0-1
                "joint_angles": {"Left Knee": 125.3, ...},
                "landmarks_px": [[x, y], ...],  # pixel coordinates for overlay
                "image_width": int,
                "image_height": int,
            }
            or None if no person detected.
        """
        if self.backend == "none":
            return None

        # Decode base64 image
        try:
            if "," in frame_data:
                frame_data = frame_data.split(",", 1)[1]
            img_bytes = base64.b64decode(frame_data)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            img_np = np.array(img)
        except Exception as e:
            logger.error(f"Failed to decode frame: {e}")
            return None

        h, w = img_np.shape[:2]

        if self.backend == "cuda":
            keypoints = self._process_yolo(img_np)
        else:
            keypoints = self._process_openvino(img_np)

        if keypoints is None:
            return None

        # Calculate joint angles
        joint_angles = self._calculate_all_angles(keypoints)

        # Convert to pixel coords for overlay
        landmarks_px = []
        for kp in keypoints:
            px_x = kp[0] * w
            px_y = kp[1] * h
            landmarks_px.append([round(px_x, 1), round(px_y, 1)])

        return {
            "keypoints": keypoints,
            "joint_angles": joint_angles,
            "landmarks_px": landmarks_px,
            "image_width": w,
            "image_height": h,
        }

    def _process_yolo(self, img_np: np.ndarray) -> Optional[list]:
        """Run YOLOv8-pose and return normalized keypoints."""
        results = self.model(img_np, verbose=False, conf=0.3)

        if not results or len(results[0].keypoints) == 0:
            return None

        # Take the most confident person
        kps = results[0].keypoints
        if kps.xy is None or len(kps.xy) == 0:
            return None

        # Get the first person's keypoints
        xy = kps.xy[0].cpu().numpy()  # shape: (17, 2)
        conf = kps.conf[0].cpu().numpy() if kps.conf is not None else np.ones(17)

        h, w = img_np.shape[:2]
        keypoints = []
        for i in range(17):
            x_norm = float(xy[i][0] / w)
            y_norm = float(xy[i][1] / h)
            c = float(conf[i])
            keypoints.append([x_norm, y_norm, c])

        return keypoints

    def _process_openvino(self, img_np: np.ndarray) -> Optional[list]:
        """Run OpenVINO model and return normalized keypoints (COCO 17 format)."""
        if self._openvino_model is None:
            return None

        h, w = img_np.shape[:2]

        # Preprocess: resize to model input
        _, _, model_h, model_w = self._ov_input_shape
        img_resized = cv2.resize(img_np, (model_w, model_h))
        img_input = img_resized.transpose(2, 0, 1)  # HWC → CHW
        img_input = img_input.astype(np.float32)
        img_input = np.expand_dims(img_input, 0)  # Add batch dim

        # Inference
        output = self._openvino_model(img_input)
        # human-pose-estimation-0001 outputs: pafs and heatmaps
        # Heatmaps shape: [1, 19, 32, 57] (18 keypoints + 1 background)
        heatmaps = output[self._openvino_model.output(1)]
        heatmaps = np.squeeze(heatmaps)  # [19, 32, 57]

        # Extract keypoint locations from heatmaps
        # Map from OpenVINO 18 keypoints to COCO 17
        # OpenVINO order: nose, neck, r_sho, r_elb, r_wri, l_sho, l_elb, l_wri,
        #                 r_hip, r_knee, r_ank, l_hip, l_knee, l_ank,
        #                 r_eye, l_eye, r_ear, l_ear
        # COCO order: nose, l_eye, r_eye, l_ear, r_ear, l_sho, r_sho, l_elb, r_elb,
        #             l_wri, r_wri, l_hip, r_hip, l_knee, r_knee, l_ank, r_ank

        ov_to_coco = {
            0: 0,   # nose
            15: 1,  # left_eye
            14: 2,  # right_eye
            17: 3,  # left_ear
            16: 4,  # right_ear
            5: 5,   # left_shoulder
            2: 6,   # right_shoulder
            6: 7,   # left_elbow
            3: 8,   # right_elbow
            7: 9,   # left_wrist
            4: 10,  # right_wrist
            11: 11, # left_hip
            8: 12,  # right_hip
            12: 13, # left_knee
            9: 14,  # right_knee
            13: 15, # left_ankle
            10: 16, # right_ankle
        }

        keypoints = [[0.0, 0.0, 0.0]] * 17
        hm_h, hm_w = heatmaps.shape[1], heatmaps.shape[2]

        for ov_idx, coco_idx in ov_to_coco.items():
            hm = heatmaps[ov_idx]
            max_val = np.max(hm)
            if max_val < 0.1:
                keypoints[coco_idx] = [0.0, 0.0, 0.0]
                continue
            max_loc = np.unravel_index(np.argmax(hm), hm.shape)
            y_norm = float(max_loc[0] / hm_h)
            x_norm = float(max_loc[1] / hm_w)
            keypoints[coco_idx] = [x_norm, y_norm, float(max_val)]

        # Check if we have enough valid keypoints
        valid = sum(1 for kp in keypoints if kp[2] > MIN_CONFIDENCE)
        if valid < 5:
            return None

        return keypoints

    # ─── Angle calculation ─────────────────────────────────────────────────────

    @staticmethod
    def calculate_angle(a: list, b: list, c: list) -> float:
        """
        Calculate the angle at point b formed by points a-b-c.
        Points are [x, y] or [x, y, conf].
        Returns angle in degrees (0-180).
        """
        a = np.array(a[:2])
        b = np.array(b[:2])
        c = np.array(c[:2])

        ba = a - b
        bc = c - b

        cosine = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-8)
        cosine = np.clip(cosine, -1.0, 1.0)
        angle = np.degrees(np.arccos(cosine))

        return round(float(angle), 1)

    def _calculate_all_angles(self, keypoints: list) -> dict:
        """Calculate all defined joint angles from keypoints."""
        angles = {}

        for joint_name, (idx_a, idx_b, idx_c) in JOINT_ANGLE_DEFS.items():
            kp_a = keypoints[idx_a]
            kp_b = keypoints[idx_b]
            kp_c = keypoints[idx_c]

            # Skip if any keypoint has low confidence
            if (
                kp_a[2] < MIN_CONFIDENCE
                or kp_b[2] < MIN_CONFIDENCE
                or kp_c[2] < MIN_CONFIDENCE
            ):
                continue

            angle = self.calculate_angle(kp_a, kp_b, kp_c)
            angles[joint_name] = angle

        return angles

    # ─── Info ──────────────────────────────────────────────────────────────────

    def get_info(self) -> dict:
        """Return engine info for health check."""
        info = {"backend": self.backend}
        if self.backend == "cuda":
            import torch

            info["gpu"] = torch.cuda.get_device_name(0)
            info["model"] = "YOLOv8x-pose"
        elif self.backend == "openvino-cpu":
            info["model"] = "human-pose-estimation-0001"
        return info
