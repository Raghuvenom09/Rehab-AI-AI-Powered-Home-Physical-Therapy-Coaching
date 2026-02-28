import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Exercise,
  SessionRow,
  SessionSet,
  JointAngle,
} from "@/lib/database.types";

// ─── Keys ─────────────────────────────────────────────────────────────────────

const keys = {
  exercises: (injuryType?: string) => ["exercises", injuryType] as const,
  activeSession: (userId: string) => ["session", "active", userId] as const,
  sessionSets: (sessionId: string) => ["session", "sets", sessionId] as const,
  sessionHistory: (userId: string) => ["sessions", "history", userId] as const,
};

// ─── Fetch exercises (optionally filtered by injury type) ─────────────────────

export function useExercises(injuryType?: string) {
  return useQuery({
    queryKey: keys.exercises(injuryType),
    queryFn: async () => {
      let query = supabase
        .from("exercises")
        .select("*")
        .order("difficulty", { ascending: true });

      if (injuryType && injuryType !== "Other") {
        query = query.eq("injury_type", injuryType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Exercise[];
    },
  });
}

// ─── Get the user's active (in_progress) session ─────────────────────────────

export function useActiveSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.activeSession(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, exercise:exercises(*)")
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as (SessionRow & { exercise: Exercise }) | null;
    },
  });
}

// ─── Start a new session ──────────────────────────────────────────────────────

interface StartSessionInput {
  exerciseId: string;
  painLevelBefore?: number;
  sorenessAreas?: string[];
  sharpPain?: string;
}

export function useStartSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartSessionInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          exercise_id: input.exerciseId,
          status: "in_progress",
          pain_level_before: input.painLevelBefore ?? null,
          soreness_areas: input.sorenessAreas ?? null,
          sharp_pain: input.sharpPain ?? null,
        })
        .select("*, exercise:exercises(*)")
        .single();

      if (error) throw error;
      return data as SessionRow & { exercise: Exercise };
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: keys.activeSession(user.id) });
    },
  });
}

// ─── Save a completed set ─────────────────────────────────────────────────────

interface SaveSetInput {
  sessionId: string;
  setNumber: number;
  repsCompleted: number;
  accuracy?: number;
  jointAngles?: JointAngle[];
  feedback?: string;
}

export function useSaveSet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveSetInput) => {
      const { data, error } = await supabase
        .from("session_sets")
        .insert({
          session_id: input.sessionId,
          set_number: input.setNumber,
          reps_completed: input.repsCompleted,
          accuracy: input.accuracy ?? null,
          joint_angles: input.jointAngles ?? null,
          feedback: input.feedback ?? null,
        })
        .select()
        .single();

      if (error) throw error;

      // Also update the session totals
      await supabase
        .rpc("update_session_totals", {
          p_session_id: input.sessionId,
        })
        .throwOnError();

      return data as SessionSet;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({
        queryKey: keys.sessionSets(data.session_id),
      });
    },
  });
}

// ─── Complete / cancel a session ──────────────────────────────────────────────

export function useEndSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      status,
    }: {
      sessionId: string;
      status: "completed" | "cancelled";
    }) => {
      // Calculate average accuracy from sets
      const { data: sets } = await supabase
        .from("session_sets")
        .select("reps_completed, accuracy")
        .eq("session_id", sessionId);

      const totalReps =
        sets?.reduce((sum, s) => sum + s.reps_completed, 0) ?? 0;
      const accuracies =
        sets?.filter((s) => s.accuracy != null).map((s) => s.accuracy!) ?? [];
      const avgAccuracy =
        accuracies.length > 0
          ? accuracies.reduce((a, b) => a + b, 0) / accuracies.length
          : null;

      const { data, error } = await supabase
        .from("sessions")
        .update({
          status,
          completed_at: new Date().toISOString(),
          total_reps: totalReps,
          total_sets: sets?.length ?? 0,
          avg_accuracy: avgAccuracy,
        })
        .eq("id", sessionId)
        .select()
        .single();

      if (error) throw error;
      return data as SessionRow;
    },
    onSuccess: () => {
      if (user) {
        qc.invalidateQueries({ queryKey: keys.activeSession(user.id) });
        qc.invalidateQueries({ queryKey: keys.sessionHistory(user.id) });
      }
    },
  });
}

// ─── Fetch sets for a session ─────────────────────────────────────────────────

export function useSessionSets(sessionId: string | undefined) {
  return useQuery({
    queryKey: keys.sessionSets(sessionId ?? ""),
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_sets")
        .select("*")
        .eq("session_id", sessionId!)
        .order("set_number", { ascending: true });

      if (error) throw error;
      return data as SessionSet[];
    },
  });
}

// ─── Session history ──────────────────────────────────────────────────────────

export function useSessionHistory(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.sessionHistory(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, exercise:exercises(*)")
        .eq("user_id", user!.id)
        .in("status", ["completed", "cancelled"])
        .order("completed_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as (SessionRow & { exercise: Exercise })[];
    },
  });
}

// ─── Aggregated progress stats for the Progress page ─────────────────────────

export interface DailyAccuracy {
  day: string; // e.g. "Mon", "Feb 24"
  date: string; // ISO date string for sorting
  accuracy: number;
}

export interface ProgressStats {
  totalSessions: number;
  thisMonthSessions: number;
  latestAccuracy: number | null;
  avgAccuracyThisWeek: number | null;
  avgAccuracyLastWeek: number | null;
  improvementPercent: number | null;
  dailyAccuracy: DailyAccuracy[]; // last 7 days with session data
  recentSessions: (SessionRow & { exercise: Exercise })[];
}

export function useProgressStats() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["progress", "stats", user?.id ?? ""],
    enabled: !!user,
    queryFn: async (): Promise<ProgressStats> => {
      // Pull all completed sessions in the last 60 days
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*, exercise:exercises(*)")
        .eq("user_id", user!.id)
        .eq("status", "completed")
        .gte("completed_at", since.toISOString())
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const all = (sessions ?? []) as (SessionRow & { exercise: Exercise })[];

      // ── Total & this-month counts ──────────────────────────────────────────
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthSessions = all.filter(
        (s) => new Date(s.completed_at!) >= monthStart,
      ).length;

      // ── This week vs last week accuracy ───────────────────────────────────
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay()); // Sunday
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(weekStart.getDate() - 7);

      const thisWeek = all.filter(
        (s) => new Date(s.completed_at!) >= weekStart,
      );
      const lastWeek = all.filter(
        (s) =>
          new Date(s.completed_at!) >= lastWeekStart &&
          new Date(s.completed_at!) < weekStart,
      );

      const avg = (arr: (SessionRow & { exercise: Exercise })[]) => {
        const valid = arr.filter((s) => s.avg_accuracy != null);
        if (!valid.length) return null;
        return Math.round(
          valid.reduce((sum, s) => sum + Number(s.avg_accuracy), 0) /
            valid.length,
        );
      };

      const avgThisWeek = avg(thisWeek);
      const avgLastWeek = avg(lastWeek);

      const improvementPercent =
        avgThisWeek != null && avgLastWeek != null && avgLastWeek > 0
          ? Math.round(((avgThisWeek - avgLastWeek) / avgLastWeek) * 100)
          : null;

      // ── Daily accuracy for chart (last 14 days that have sessions) ─────────
      const byDay = new Map<string, number[]>();
      all.forEach((s) => {
        if (!s.completed_at || s.avg_accuracy == null) return;
        const d = new Date(s.completed_at);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        if (!byDay.has(key)) byDay.set(key, []);
        byDay.get(key)!.push(Number(s.avg_accuracy));
      });

      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dailyAccuracy: DailyAccuracy[] = Array.from(byDay.entries())
        .map(([date, vals]) => ({
          date,
          day: dayNames[new Date(date).getDay()],
          accuracy: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-14); // last 14 days with data

      return {
        totalSessions: all.length,
        thisMonthSessions,
        latestAccuracy:
          all[0]?.avg_accuracy != null
            ? Math.round(Number(all[0].avg_accuracy))
            : null,
        avgAccuracyThisWeek: avgThisWeek,
        avgAccuracyLastWeek: avgLastWeek,
        improvementPercent,
        dailyAccuracy,
        recentSessions: all.slice(0, 5),
      };
    },
  });
}
