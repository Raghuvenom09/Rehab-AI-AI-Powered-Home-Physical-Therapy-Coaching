"""
Download OpenVINO human-pose-estimation-0001 model (CPU fallback).
Run: python download_model.py

If you have an NVIDIA GPU, the main app will use YOLOv8x-pose instead,
which auto-downloads its weights. This script is only needed for CPU fallback.
"""

import os
import subprocess
import sys


MODEL_NAME = "human-pose-estimation-0001"
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "models")


def download_model():
    """Download and convert the OpenVINO model."""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Downloading {MODEL_NAME} to {OUTPUT_DIR}...")
    print("This requires 'openvino-dev' package with model tools.\n")

    # Try omz_downloader (from openvino-dev)
    try:
        subprocess.run(
            [
                sys.executable, "-m", "openvino.model_zoo.omz_downloader",
                "--name", MODEL_NAME,
                "--output_dir", OUTPUT_DIR,
                "--precision", "FP16",
            ],
            check=True,
        )
        print(f"\n✓ Model downloaded to {OUTPUT_DIR}/{MODEL_NAME}")
    except (subprocess.CalledProcessError, FileNotFoundError):
        print("omz_downloader via openvino.model_zoo failed.")
        print("Trying alternative method...")

        try:
            subprocess.run(
                ["omz_downloader",
                 "--name", MODEL_NAME,
                 "--output_dir", OUTPUT_DIR,
                 "--precision", "FP16"],
                check=True,
            )
            print(f"\n✓ Model downloaded to {OUTPUT_DIR}/{MODEL_NAME}")
        except FileNotFoundError:
            print(
                "\n✗ omz_downloader not found. Install it with:\n"
                "  pip install openvino-dev[onnx]\n"
                "\nOr download manually from:\n"
                "  https://storage.openvinotoolkit.org/repositories/open_model_zoo/"
                "2023.0/models_bin/1/human-pose-estimation-0001/FP16/\n"
                f"\nPlace the .xml and .bin files in:\n"
                f"  {OUTPUT_DIR}/intel/{MODEL_NAME}/FP16/"
            )
            sys.exit(1)


if __name__ == "__main__":
    download_model()
