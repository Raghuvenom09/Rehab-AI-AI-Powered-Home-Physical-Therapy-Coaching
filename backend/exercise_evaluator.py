"""
Rule-based exercise posture evaluator.
No LLM — all feedback is deterministic, based on angle thresholds.
"""

from typing import Optional

# ─── Exercise reference angles ─────────────────────────────────────────────────
# Format: { joint_name: (min_angle, max_angle, too_low_msg, too_high_msg) }

EXERCISE_REFERENCES: dict[str, dict[str, tuple]] = {
    "Squat - Deep": {
        "Left Knee": (70, 110, "Bend your knees deeper to reach full depth", "Knees are bending too far — ease up slightly"),
        "Right Knee": (70, 110, "Bend your knees deeper to reach full depth", "Knees are bending too far — ease up slightly"),
        "Hip Flexion": (50, 95, "Hinge at the hips more — push your hips back", "You're leaning too far forward"),
    },
    "Squat - Partial": {
        "Left Knee": (100, 150, "Bend a little more for a partial squat", "Good depth for a partial squat — don't go deeper"),
        "Right Knee": (100, 150, "Bend a little more for a partial squat", "Good depth for a partial squat — don't go deeper"),
        "Hip Flexion": (80, 130, "Slight hip hinge needed", "Standing too upright — engage your hips"),
    },
    "Wall Sit": {
        "Left Knee": (80, 100, "Slide down a bit more — aim for 90° at the knees", "You're too low — raise your hips slightly"),
        "Right Knee": (80, 100, "Slide down a bit more — aim for 90° at the knees", "You're too low — raise your hips slightly"),
        "Hip Flexion": (80, 100, "Sit deeper into the wall", "Back should be flat against the wall"),
    },
    "Shoulder Press": {
        "Left Shoulder": (140, 180, "Press higher — extend your arms fully overhead", "Good extension!"),
        "Right Shoulder": (140, 180, "Press higher — extend your arms fully overhead", "Good extension!"),
        "Left Elbow": (150, 180, "Straighten your elbows more at the top", "Arms are fully locked — slight bend is okay"),
        "Right Elbow": (150, 180, "Straighten your elbows more at the top", "Arms are fully locked — slight bend is okay"),
    },
    "Shoulder Rotation": {
        "Left Shoulder": (60, 120, "Rotate further — increase your range", "Don't over-rotate — control the movement"),
        "Right Shoulder": (60, 120, "Rotate further — increase your range", "Don't over-rotate — control the movement"),
        "Left Elbow": (80, 100, "Keep your elbow at 90° during rotation", "Elbow is drifting — maintain 90° bend"),
        "Right Elbow": (80, 100, "Keep your elbow at 90° during rotation", "Elbow is drifting — maintain 90° bend"),
    },
    "Cat-Cow Stretch": {
        "Hip Flexion": (60, 140, "Arch your back more for the cow stretch", "Round your spine more for the cat stretch"),
        "Left Shoulder": (70, 130, "Engage your shoulders through the movement", "Good shoulder engagement"),
        "Right Shoulder": (70, 130, "Engage your shoulders through the movement", "Good shoulder engagement"),
    },
    "Bird Dog": {
        "Left Shoulder": (150, 180, "Extend your arm further — reach forward", "Don't hyperextend — keep it level with your back"),
        "Right Shoulder": (150, 180, "Extend your arm further — reach forward", "Don't hyperextend — keep it level with your back"),
        "Hip Flexion": (160, 180, "Keep your hips level — don't tilt", "Good hip position"),
        "Left Knee": (150, 180, "Extend your leg further behind you", "Don't hyperextend the knee"),
        "Right Knee": (150, 180, "Extend your leg further behind you", "Don't hyperextend the knee"),
    },
    "Dead Bug": {
        "Left Knee": (80, 100, "Keep knees at 90° while lowering", "Knees are collapsing — maintain the angle"),
        "Right Knee": (80, 100, "Keep knees at 90° while lowering", "Knees are collapsing — maintain the angle"),
        "Hip Flexion": (80, 100, "Keep hips stable — don't arch your back", "Good hip control"),
    },
    "Step Ups": {
        "Left Knee": (80, 130, "Drive through the heel — full step up", "Don't lock the knee at the top"),
        "Right Knee": (80, 130, "Drive through the heel — full step up", "Don't lock the knee at the top"),
        "Hip Flexion": (100, 170, "Stand tall at the top of the step", "Lean slightly forward for balance"),
    },
    "Heel Slides": {
        "Left Knee": (30, 140, "Slide your heel further to increase knee flexion", "Good range — don't force it"),
        "Right Knee": (30, 140, "Slide your heel further to increase knee flexion", "Good range — don't force it"),
    },
}

# ─── Evaluation ────────────────────────────────────────────────────────────────


def evaluate_posture(
    joint_angles: dict[str, float], exercise_name: str
) -> dict:
    """
    Evaluate posture against exercise-specific reference angles.

    Returns:
        {
            "joints": [
                {"label": "Left Knee", "angle": 95.2, "status": "correct",
                 "suggestion": null},
                ...
            ],
            "overall_status": "correct" | "adjust" | "incorrect",
            "accuracy": 85,  # 0-100
            "feedback": "Great form! Keep it up."
        }
    """
    refs = EXERCISE_REFERENCES.get(exercise_name, {})
    joint_results = []
    scores = []

    for joint_name, angle in joint_angles.items():
        ref = refs.get(joint_name)
        if ref is None:
            # No reference for this joint in this exercise — mark as correct
            joint_results.append({
                "label": joint_name,
                "angle": angle,
                "status": "correct",
                "suggestion": None,
            })
            scores.append(100)
            continue

        min_angle, max_angle, too_low_msg, too_high_msg = ref
        tolerance = (max_angle - min_angle) * 0.15  # 15% tolerance for "adjust"

        if min_angle <= angle <= max_angle:
            status = "correct"
            suggestion = None
            score = 100
        elif (min_angle - tolerance) <= angle < min_angle:
            status = "adjust"
            suggestion = too_low_msg
            # Score based on how far from the range
            score = max(40, 100 - int((min_angle - angle) / tolerance * 60))
        elif max_angle < angle <= (max_angle + tolerance):
            status = "adjust"
            suggestion = too_high_msg
            score = max(40, 100 - int((angle - max_angle) / tolerance * 60))
        elif angle < min_angle:
            status = "incorrect"
            suggestion = too_low_msg
            score = max(10, 40 - int((min_angle - angle) / max(1, min_angle) * 40))
        else:
            status = "incorrect"
            suggestion = too_high_msg
            score = max(10, 40 - int((angle - max_angle) / max(1, max_angle) * 40))

        joint_results.append({
            "label": joint_name,
            "angle": angle,
            "status": status,
            "suggestion": suggestion,
        })
        scores.append(score)

    # Overall status
    statuses = [j["status"] for j in joint_results]
    if "incorrect" in statuses:
        overall = "incorrect"
    elif "adjust" in statuses:
        overall = "adjust"
    else:
        overall = "correct"

    accuracy = round(sum(scores) / max(len(scores), 1))

    # Aggregate feedback
    feedback = _generate_feedback(joint_results, overall)

    return {
        "joints": joint_results,
        "overall_status": overall,
        "accuracy": accuracy,
        "feedback": feedback,
    }


def _generate_feedback(joints: list[dict], overall: str) -> str:
    """Generate concise textual feedback from joint evaluations."""
    if overall == "correct":
        return "Great form! Keep it up."

    # Collect suggestions from non-correct joints
    suggestions = [
        j["suggestion"] for j in joints
        if j["suggestion"] and j["status"] != "correct"
    ]

    if not suggestions:
        return "Minor adjustments needed — keep going."

    # Return the most critical suggestion (first incorrect, then adjust)
    incorrect = [
        j["suggestion"] for j in joints
        if j["suggestion"] and j["status"] == "incorrect"
    ]
    if incorrect:
        return incorrect[0]

    return suggestions[0]


# ─── Cooldown suggestions ─────────────────────────────────────────────────────

COOLDOWN_SUGGESTIONS: dict[str, list[dict]] = {
    "Knee": [
        {"name": "Quad Stretch", "duration": "30s each leg", "description": "Stand on one leg, pull the other heel toward your glute."},
        {"name": "Hamstring Stretch", "duration": "30s each leg", "description": "Sit with one leg extended, reach toward your toes."},
        {"name": "Calf Raises", "duration": "15 reps", "description": "Slowly raise and lower your heels for ankle mobility."},
    ],
    "Shoulder": [
        {"name": "Cross-Body Shoulder Stretch", "duration": "30s each arm", "description": "Pull one arm across your chest, hold gently."},
        {"name": "Overhead Tricep Stretch", "duration": "30s each arm", "description": "Reach one arm behind your head, gently pull the elbow."},
        {"name": "Shoulder Rolls", "duration": "10 forward, 10 backward", "description": "Slow, controlled circles with your shoulders."},
    ],
    "Back": [
        {"name": "Child's Pose", "duration": "45s", "description": "Kneel and reach arms forward, resting forehead on the floor."},
        {"name": "Seated Spinal Twist", "duration": "30s each side", "description": "Sit cross-legged and gently rotate your torso."},
        {"name": "Knee-to-Chest Stretch", "duration": "30s each leg", "description": "Lie on your back, pull one knee toward your chest."},
    ],
    "Post-Surgery": [
        {"name": "Gentle Walking", "duration": "5 minutes", "description": "Walk at a comfortable pace to cool down."},
        {"name": "Deep Breathing", "duration": "1 minute", "description": "Inhale for 4 counts, hold for 4, exhale for 6."},
        {"name": "Ankle Circles", "duration": "10 each direction", "description": "Rotate ankles slowly to maintain mobility."},
    ],
}

EXERCISE_TO_CATEGORY = {
    "Squat - Deep": "Knee",
    "Squat - Partial": "Knee",
    "Wall Sit": "Knee",
    "Shoulder Press": "Shoulder",
    "Shoulder Rotation": "Shoulder",
    "Cat-Cow Stretch": "Back",
    "Bird Dog": "Back",
    "Dead Bug": "Back",
    "Step Ups": "Post-Surgery",
    "Heel Slides": "Post-Surgery",
}


def get_cooldown_suggestions(exercise_name: str) -> list[dict]:
    """Get cooldown stretches for an exercise category."""
    category = EXERCISE_TO_CATEGORY.get(exercise_name, "Back")
    return COOLDOWN_SUGGESTIONS.get(category, COOLDOWN_SUGGESTIONS["Back"])
