// ─── Supabase Database Types ──────────────────────────────────────────────────
// These mirror the tables you need to create in your Supabase project.
// Run the SQL in supabase/migrations/001_sessions.sql to set them up.

export type ExerciseStatus = "correct" | "adjust" | "incorrect";

// ─── exercises table ──────────────────────────────────────────────────────────

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  injury_type: string; // e.g. "Knee", "Shoulder", "Back"
  difficulty: "easy" | "medium" | "hard";
  target_reps: number;
  target_sets: number;
  created_at: string;
}

// ─── sessions table ───────────────────────────────────────────────────────────

export interface SessionRow {
  id: string;
  user_id: string;
  exercise_id: string;
  status: "in_progress" | "completed" | "cancelled";
  started_at: string;
  completed_at: string | null;
  total_reps: number;
  total_sets: number;
  avg_accuracy: number | null;
  pain_level_before: number | null;
  soreness_areas: string[] | null;
  sharp_pain: string | null;
  created_at: string;
}

// ─── session_sets table (one row per set) ─────────────────────────────────────

export interface SessionSet {
  id: string;
  session_id: string;
  set_number: number;
  reps_completed: number;
  accuracy: number | null;
  joint_angles: JointAngle[] | null;
  feedback: string | null;
  created_at: string;
}

// ─── joint angle snapshot ─────────────────────────────────────────────────────

export interface JointAngle {
  label: string;
  angle: number;
  status: ExerciseStatus;
}

// ─── Joined query helpers ─────────────────────────────────────────────────────

export interface SessionWithExercise extends SessionRow {
  exercise: Exercise;
}

// ─── profiles table ───────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  injury_area: string | null;
  injury_type: string | null;
  injury_duration: string | null;
  limitations: string[];
  recovery_goal: string | null;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}
