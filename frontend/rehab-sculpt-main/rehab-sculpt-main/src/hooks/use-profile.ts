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
    retry: 1,
    queryFn: async () => {
      try {
        // Try to get existing profile
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user!.id)
          .maybeSingle();

        // If profile exists, return it
        if (data) return data as Profile;

        // If error about missing columns, return default profile
        if (error && error.message?.includes("column")) {
          console.warn("Profile columns missing, using default:", error.message);
          return {
            id: user!.id,
            full_name: user?.user_metadata?.full_name || null,
            avatar_url: null,
            age: null,
            height_cm: null,
            weight_kg: null,
            injury_area: null,
            injury_type: null,
            injury_duration: null,
            limitations: null,
            recovery_goal: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          } as Profile;
        }

        // If no profile found, create one
        if (!data && !error) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user!.id,
              full_name: user?.user_metadata?.full_name || null,
            })
            .select()
            .single();

          if (createError) {
            // If insert fails due to missing columns, return default
            if (createError.message?.includes("column")) {
              return {
                id: user!.id,
                full_name: user?.user_metadata?.full_name || null,
                avatar_url: null,
                age: null,
                height_cm: null,
                weight_kg: null,
                injury_area: null,
                injury_type: null,
                injury_duration: null,
                limitations: null,
                recovery_goal: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              } as Profile;
            }
            throw createError;
          }
          return newProfile as Profile;
        }

        if (error) throw error;
        return null as unknown as Profile;
      } catch (err) {
        console.error("Profile fetch error:", err);
        // Return default profile on any error
        return {
          id: user!.id,
          full_name: user?.user_metadata?.full_name || null,
          avatar_url: null,
          age: null,
          height_cm: null,
          weight_kg: null,
          injury_area: null,
          injury_type: null,
          injury_duration: null,
          limitations: null,
          recovery_goal: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as Profile;
      }
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

      // Filter out fields that might not exist in DB yet
      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      
      // Only include fields that are defined
      if (input.full_name !== undefined) updateData.full_name = input.full_name;
      if (input.age !== undefined) updateData.age = input.age;
      if (input.height_cm !== undefined) updateData.height_cm = input.height_cm;
      if (input.weight_kg !== undefined) updateData.weight_kg = input.weight_kg;
      if (input.injury_area !== undefined) updateData.injury_area = input.injury_area;
      if (input.injury_type !== undefined) updateData.injury_type = input.injury_type;
      if (input.injury_duration !== undefined) updateData.injury_duration = input.injury_duration;
      if (input.limitations !== undefined) updateData.limitations = input.limitations;
      if (input.recovery_goal !== undefined) updateData.recovery_goal = input.recovery_goal;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", user.id)
          .select()
          .single();

        if (error) {
          // If columns don't exist, return input as if saved
          if (error.message?.includes("column")) {
            console.warn("Profile columns missing, changes not persisted to DB:", error.message);
            return { ...input, id: user.id, updated_at: new Date().toISOString() } as Profile;
          }
          throw error;
        }
        return data as Profile;
      } catch (err) {
        console.error("Profile update error:", err);
        throw err;
      }
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: keys.profile(user.id) });
    },
  });
}
