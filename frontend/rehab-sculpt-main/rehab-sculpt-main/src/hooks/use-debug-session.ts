import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";

export function useDebugSessions() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["debug", "sessions", user?.id],
    enabled: !!user,
    queryFn: async () => {
      // Get ALL sessions for this user (no filters)
      const { data: allSessions, error: sError } = await supabase
        .from("sessions")
        .select("*")
        .eq("user_id", user!.id)
        .order("started_at", { ascending: false })
        .limit(10);
      
      if (sError) throw sError;
      
      // Get session_exercises for these sessions
      const sessionIds = allSessions?.map(s => s.id) ?? [];
      const { data: allExercises, error: eError } = sessionIds.length > 0 
        ? await supabase
            .from("session_exercises")
            .select("*")
            .in("session_id", sessionIds)
        : { data: [], error: null };
      
      if (eError) throw eError;
      
      console.log("=== DEBUG: All Sessions ===", allSessions);
      console.log("=== DEBUG: All Session Exercises ===", allExercises);
      
      return {
        sessions: allSessions ?? [],
        sessionExercises: allExercises ?? [],
      };
    },
  });
}
