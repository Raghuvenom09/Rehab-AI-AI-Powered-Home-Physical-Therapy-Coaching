"""
Repetition counter using angle state-machine.
Detects transitions: extended → flexed → extended = 1 rep.
"""

from typing import Optional


# Per-exercise config: which joint to track, and angle thresholds
EXERCISE_REP_CONFIG: dict[str, dict] = {
    "Squat - Deep": {
        "joint": "Left Knee",
        "flexed_below": 100,   # Knee angle below this = flexed (bottom of squat)
        "extended_above": 150,  # Above this = standing
    },
    "Squat - Partial": {
        "joint": "Left Knee",
        "flexed_below": 130,
        "extended_above": 160,
    },
    "Wall Sit": {
        "joint": "Left Knee",
        "flexed_below": 95,
        "extended_above": 150,
        "is_hold": True,  # Wall sit is a hold, not reps
    },
    "Shoulder Press": {
        "joint": "Left Elbow",
        "flexed_below": 100,  # Arms bent
        "extended_above": 160,  # Arms extended overhead
    },
    "Shoulder Rotation": {
        "joint": "Left Shoulder",
        "flexed_below": 70,
        "extended_above": 110,
    },
    "Cat-Cow Stretch": {
        "joint": "Hip Flexion",
        "flexed_below": 80,
        "extended_above": 120,
    },
    "Bird Dog": {
        "joint": "Hip Flexion",
        "flexed_below": 140,
        "extended_above": 170,
    },
    "Dead Bug": {
        "joint": "Left Knee",
        "flexed_below": 85,
        "extended_above": 140,
    },
    "Step Ups": {
        "joint": "Left Knee",
        "flexed_below": 100,
        "extended_above": 160,
    },
    "Heel Slides": {
        "joint": "Left Knee",
        "flexed_below": 60,
        "extended_above": 130,
    },
}


class RepCounter:
    """
    Counts reps by tracking angle transitions.

    States:
        - "extended" — waiting for flexion
        - "flexing"  — angle is decreasing
        - "flexed"   — reached flexed position
        - "extending" — angle is increasing back up

    One rep = extended → flexed → extended
    """

    def __init__(self, exercise_name: str):
        self.exercise_name = exercise_name
        self.config = EXERCISE_REP_CONFIG.get(exercise_name)
        self.count = 0
        self.phase = "extended"  # current phase
        self._is_hold = False

        if self.config:
            self._is_hold = self.config.get("is_hold", False)

    def update(self, joint_angles: dict[str, float]) -> dict:
        """
        Update the rep counter with new joint angles.

        Returns:
            {"count": int, "phase": str}
        """
        if self.config is None:
            return {"count": self.count, "phase": "unknown"}

        joint = self.config["joint"]
        angle = joint_angles.get(joint)

        if angle is None:
            return {"count": self.count, "phase": self.phase}

        if self._is_hold:
            return self._update_hold(angle)

        return self._update_reps(angle)

    def _update_reps(self, angle: float) -> dict:
        """Standard rep counting via state machine."""
        flexed_below = self.config["flexed_below"]
        extended_above = self.config["extended_above"]

        if self.phase == "extended":
            if angle < flexed_below:
                self.phase = "flexed"
        elif self.phase == "flexed":
            if angle > extended_above:
                self.phase = "extended"
                self.count += 1

        return {"count": self.count, "phase": self.phase}

    def _update_hold(self, angle: float) -> dict:
        """For hold exercises (wall sit): count time in hold position."""
        flexed_below = self.config["flexed_below"]
        extended_above = self.config["extended_above"]

        if angle <= self.config.get("flexed_below", 95) + 10:
            self.phase = "holding"
            if self.count == 0:
                self.count = 1  # Mark as 1 rep (it's a hold)
        else:
            self.phase = "not_in_position"

        return {"count": self.count, "phase": self.phase}

    def reset(self):
        """Reset counter for the next set."""
        self.count = 0
        self.phase = "extended"
