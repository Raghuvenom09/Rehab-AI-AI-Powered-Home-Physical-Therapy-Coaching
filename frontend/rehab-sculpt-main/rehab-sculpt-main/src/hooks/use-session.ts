import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type {
  Exercise,
  SessionRow,
  SessionExercise,
  JointAngle,
} from "@/lib/database.types";

const keys = {
  exercises: () => ["exercises"] as const,
  activeSession: (userId: string) => ["session", "active", userId] as const,
  sessionSets: (sessionId: string) => ["session", "sets", sessionId] as const,
  sessionExercises: (sessionId: string) => ["session", "exercises", sessionId] as const,
  sessionHistory: (userId: string) => ["sessions", "history", userId] as const,
  progressStats: (userId: string) => ["progress", "stats", userId] as const,
};

export function useExercises() {
  return useQuery({
    queryKey: keys.exercises(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exercises")
        .select("*")
        .order("name");
      if (error) throw error;
      return (data ?? []) as Exercise[];
    },
  });
}

export function useActiveSession() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.activeSession(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data: session, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .eq("status", "in_progress")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!session) return null;

      const { data: sessionExercises, error: exError } = await supabase
        .from("session_exercises")
        .select("*, exercise:exercises(*)")
        .eq("session_id", session.id);
      if (exError) throw exError;

      return {
        ...(session as SessionRow),
        session_exercises: sessionExercises ?? [],
      };
    },
  });
}

interface StartSessionInput {
  exerciseId: string;
  sets?: number;
  reps?: number;
  painLevel?: number;
  notes?: string;
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

      const { data: session, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          title: "Rehab Session",
          status: "in_progress",
          pain_level_before: input.painLevelBefore ?? null,
          soreness_areas: input.sorenessAreas ?? null,
          sharp_pain: input.sharpPain ?? null,
        })
        .select()
        .single();
      if (sessionError) throw sessionError;

      const { data: sessionEx, error: exError } = await supabase
        .from("session_exercises")
        .insert({
          session_id: session.id,
          exercise_id: input.exerciseId,
          sets: input.sets ?? null,
          reps: input.reps ?? null,
          pain_level: input.painLevel ?? null,
          notes: input.notes ?? null,
          completed: false,
        })
        .select("*, exercise:exercises(*)")
        .single();
      if (exError) throw exError;

      return { session: session as SessionRow, sessionExercise: sessionEx as SessionExercise & { exercise: Exercise } };
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: keys.activeSession(user.id) });
    },
  });
}

interface SaveSetInput {
  sessionExerciseId: string;
  repsCompleted: number;
  accuracy?: number;
  feedback?: string;
}

export function useSaveSet() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveSetInput) => {
      const { data, error } = await supabase
        .from("session_exercises")
        .update({
          reps: input.repsCompleted,
          pain_level: Math.round(Math.min(100, Math.max(0, input.accuracy ?? 0))),
          notes: input.feedback ?? null,
          completed: true,
        })
        .eq("id", input.sessionExerciseId)
        .select()
        .single();
      if (error) throw error;
      return data as SessionExercise;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: keys.sessionExercises(data.session_id) });
      qc.invalidateQueries({ queryKey: ["progress", "stats"] });
    },
  });
}

export function useEndSession() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sessionId,
      startedAt,
      status,
    }: {
      sessionId: string;
      startedAt: string;
      status: "completed" | "cancelled";
    }) => {
      const started = new Date(startedAt).getTime();
      const durationSec = Math.round((Date.now() - started) / 1000);
      const { data, error } = await supabase
        .from("sessions")
        .update({ status, ended_at: new Date().toISOString(), duration_sec: durationSec })
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
        qc.invalidateQueries({ queryKey: keys.progressStats(user.id) });
        qc.refetchQueries({ queryKey: keys.progressStats(user.id) });
      }
    },
  });
}

export function useSessionExercises(sessionId: string | undefined) {
  return useQuery({
    queryKey: keys.sessionExercises(sessionId ?? ""),
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("session_exercises")
        .select("*, exercise:exercises(*)")
        .eq("session_id", sessionId!);
      if (error) throw error;
      return data as (SessionExercise & { exercise: Exercise })[];
    },
  });
}

export function useSessionHistory(limit = 20) {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.sessionHistory(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["completed", "cancelled"])
        .order("ended_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as SessionRow[];
    },
  });
}

export function useProgressStats() {
  const { user } = useAuth();
  return useQuery({
    queryKey: keys.progressStats(user?.id ?? ""),
    enabled: !!user,
    staleTime: 0,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const { data: sessions, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .in("status", ["completed", "cancelled"])
        .not("ended_at", "is", null)
        .gte("ended_at", since.toISOString())
        .order("ended_at", { ascending: false });
      if (error) throw error;

      if (!sessions || sessions.length === 0) {
        return {
          totalSessions: 0,
          thisMonthSessions: 0,
          recentSessions: [],
          latestAccuracy: null,
          improvementPercent: null,
          dailyAccuracy: [],
        };
      }

      const sessionIds = sessions.map((s) => s.id);

      const { data: allSessionExercises, error: seError } = await supabase
        .from("session_exercises")
        .select("id, session_id, reps, pain_level, completed, exercise_id")
        .in("session_id", sessionIds);
      if (seError) throw seError;

      const { data: allExercises, error: exError } = await supabase
        .from("exercises")
        .select("id, name");
      if (exError) throw exError;

      const exerciseMap: Record<string, string> = {};
      (allExercises ?? []).forEach((e) => { exerciseMap[e.id] = e.name; });

      const seMap: Record<string, typeof allSessionExercises[0][]> = {};
      (allSessionExercises ?? []).forEach((se) => {
        if (!seMap[se.session_id]) seMap[se.session_id] = [];
        seMap[se.session_id].push(se);
      });

      type RecentSession = {
        id: string;
        ended_at: string | null;
        duration_sec: number | null;
        status: string;
        exerciseName: string;
        accuracy: number;
        totalSets: number;
        totalReps: number;
      };

      const recentSessions: RecentSession[] = sessions.slice(0, 5).map((s) => {
        const ses = seMap[s.id] ?? [];
        const firstSe = ses[0];
        const exerciseName = firstSe ? (exerciseMap[firstSe.exercise_id] ?? "Exercise") : "Exercise";
        const totalReps = ses.reduce((sum, e) => sum + (e.reps ?? 0), 0);
        const accuracy = firstSe?.pain_level ?? 0;
        return {
          id: s.id,
          ended_at: s.ended_at,
          duration_sec: s.duration_sec,
          status: s.status,
          exerciseName,
          accuracy,
          totalSets: ses.length,
          totalReps,
        };
      });

      const latestAccuracy = recentSessions[0]?.accuracy ?? null;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 14);

      const weekSessions = sessions.filter((s) => s.ended_at && new Date(s.ended_at) >= weekAgo);
      const lastWeekSessions = sessions.filter(
        (s) => s.ended_at && new Date(s.ended_at) >= lastWeekStart && new Date(s.ended_at) < weekAgo
      );

      const avgAccuracyForSessions = (ses: typeof sessions) => {
        if (!ses.length) return null;
        const vals = ses
          .flatMap((s) => seMap[s.id] ?? [])
          .map((e) => e.pain_level)
          .filter((v): v is number => v != null && v > 0);
        if (!vals.length) return null;
        return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      };

      const thisWeekAvg = avgAccuracyForSessions(weekSessions);
      const lastWeekAvg = avgAccuracyForSessions(lastWeekSessions);
      const improvementPercent =
        thisWeekAvg != null && lastWeekAvg != null && lastWeekAvg > 0
          ? Math.round(((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100)
          : null;

      const dailyMap: Record<string, { total: number; count: number }> = {};
      sessions.forEach((s) => {
        if (!s.ended_at) return;
        const day = new Date(s.ended_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
        const acc = (seMap[s.id]?.[0])?.pain_level;
        if (acc != null && acc > 0) {
          dailyMap[day] = dailyMap[day] ?? { total: 0, count: 0 };
          dailyMap[day].total += acc;
          dailyMap[day].count += 1;
        }
      });
      const dailyAccuracy = Object.entries(dailyMap)
        .slice(0, 14)
        .map(([day, { total, count }]) => ({ day, accuracy: Math.round(total / count) }));

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const thisMonthSessions = sessions.filter(
        (s) => s.ended_at && new Date(s.ended_at) >= monthStart
      ).length;

      return {
        totalSessions: sessions.length,
        thisMonthSessions,
        recentSessions,
        latestAccuracy,
        improvementPercent,
        dailyAccuracy,
      };
    },
  });
}