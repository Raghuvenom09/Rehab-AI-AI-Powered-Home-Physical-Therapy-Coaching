export type ExerciseStatus = "correct" | "adjust" | "incorrect";

export interface Exercise {
  id: string;
  name: string;
  description: string | null;
  body_part: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  video_url: string | null;
  image_url: string | null;
  instructions: string[] | null;
  created_at: string;
}

export interface SessionRow {
  id: string;
  user_id: string;
  title: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
  duration_sec: number | null;
  status: "in_progress" | "completed" | "cancelled";
  pain_level_before: number | null;
  soreness_areas: string[] | null;
  sharp_pain: string | null;
  created_at: string;
}

export interface SessionExercise {
  id: string;
  session_id: string;
  exercise_id: string;
  sets: number | null;
  reps: number | null;
  hold_seconds: number | null;
  pain_level: number | null;
  notes: string | null;
  completed: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProgressLog {
  id: string;
  user_id: string;
  date: string;
  pain_level: number | null;
  mobility: number | null;
  strength: number | null;
  notes: string | null;
  created_at: string;
}

export interface JointAngle {
  label: string;
  angle: number;
  status: ExerciseStatus;
}

export interface SessionWithExercise extends SessionRow {
  exercise: Exercise;
}