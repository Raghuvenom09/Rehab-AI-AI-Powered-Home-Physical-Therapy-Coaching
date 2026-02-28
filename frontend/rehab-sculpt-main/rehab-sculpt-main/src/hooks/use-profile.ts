import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { Profile } from "@/lib/database.types";

// ─── Keys ─────────────────────────────────────────────────────────────────────

const keys = {
  profile: (userId: string) => ["profile", userId] as const,
};

// ─── Fetch the current user's profile ─────────────────────────────────────────

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: keys.profile(user?.id ?? ""),
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
  });
}

// ─── Update profile ───────────────────────────────────────────────────────────

export interface UpdateProfileInput {
  full_name?: string | null;
  age?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  injury_area?: string | null;
  injury_type?: string | null;
  injury_duration?: string | null;
  limitations?: string[];
  recovery_goal?: string | null;
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProfileInput) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update({
          ...input,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data as Profile;
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: keys.profile(user.id) });
    },
  });
}
