import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db";
import { toast } from "sonner";

export type Profile = {
  id: string;
  name: string;
  avatar_url: string | null;
  theme: string;
  weekly_workout_goal: number;
  monthly_savings_goal: number;
  modules: string[];
  onboarded: boolean;
};

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async (): Promise<Profile | null> => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await db
        .from("profiles")
        .select("*")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as Profile;
      const { data: created, error: insertError } = await db
        .from("profiles")
        .insert({ id: auth.user.id, name: auth.user.email?.split("@")[0] ?? "" })
        .select()
        .single();
      if (insertError) throw insertError;
      return created as Profile;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Partial<Profile>) => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sessão expirada.");
      const { error } = await db.from("profiles").update(values).eq("id", auth.user.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });
}
