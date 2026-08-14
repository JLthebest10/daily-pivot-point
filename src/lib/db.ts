import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/** Untyped view of the generated client so tables can be addressed dynamically. */
export const db = supabase as unknown as SupabaseClient;

export type Row = Record<string, unknown> & { id: string };

export type ListOptions = {
  eq?: Record<string, string | number | boolean | null>;
  order?: { column: string; ascending?: boolean };
  gte?: [string, string];
  lte?: [string, string];
  enabled?: boolean;
};

export function useList<T = Row>(table: string, opts: ListOptions = {}) {
  const { enabled = true, ...key } = opts;
  return useQuery({
    queryKey: [table, key],
    enabled,
    queryFn: async (): Promise<T[]> => {
      let q = db.from(table).select("*");
      for (const [col, val] of Object.entries(opts.eq ?? {})) q = q.eq(col, val);
      if (opts.gte) q = q.gte(opts.gte[0], opts.gte[1]);
      if (opts.lte) q = q.lte(opts.lte[0], opts.lte[1]);
      if (opts.order) q = q.order(opts.order.column, { ascending: opts.order.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Sessão expirada. Entre novamente.");
  return data.user.id;
}

export function useSave(table: string, message?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...rest } = values as { id?: string };
      if (id) {
        const { data, error } = await db.from(table).update(rest).eq("id", id).select().single();
        if (error) throw error;
        return data;
      }
      const user_id = await currentUserId();
      const { data, error } = await db
        .from(table)
        .insert({ ...rest, user_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      if (message) toast.success(message);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemove(table: string, message = "Registro excluído") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(message);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export { currentUserId };
