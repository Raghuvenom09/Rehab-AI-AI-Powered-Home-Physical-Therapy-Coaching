"""
Range of Motion (ROM) tracker.
Records min/max angles per joint during a session for recovery trend analysis.
"""


class ROMTracker:
    """
    Tracks the range of motion for each joint throughout a session.
    Records minimum and maximum angles observed.
    """

    def __init__(self):
        self._data: dict[str, dict] = {}
        # { "Left Knee": { "min": 85.0, "max": 170.0 }, ... }

    def update(self, joint_angles: dict[str, float]):
        """Update ROM tracking with new angle readings."""
        for joint_name, angle in joint_angles.items():
            if joint_name not in self._data:
                self._data[joint_name] = {"min": angle, "max": angle}
            else:
                entry = self._data[joint_name]
                if angle < entry["min"]:
                    entry["min"] = round(angle, 1)
                if angle > entry["max"]:
                    entry["max"] = round(angle, 1)

    def get_summary(self) -> dict[str, dict]:
        """
        Get ROM summary for all tracked joints.

        Returns:
            {
                "Left Knee": {"min": 85.0, "max": 170.0, "range": 85.0},
                ...
            }
        """
        summary = {}
        for joint_name, entry in self._data.items():
            summary[joint_name] = {
                "min": round(entry["min"], 1),
                "max": round(entry["max"], 1),
                "range": round(entry["max"] - entry["min"], 1),
            }
        return summary

    def reset(self):
        """Reset tracking for a new set or session."""
        self._data.clear()
