import type { SupabaseClient } from "@supabase/supabase-js";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
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

type CacheKey = Omit<ListOptions, "enabled">;

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

/* ------------------------------------------------------------------ */
/* Optimistic cache helpers                                            */
/* ------------------------------------------------------------------ */

/** A linha satisfaz os filtros usados por aquela query em cache? */
function rowMatches(row: Record<string, unknown>, key: CacheKey) {
  for (const [col, val] of Object.entries(key.eq ?? {})) {
    if (col in row && row[col] !== val) return false;
  }
  if (key.gte && col_lt(row[key.gte[0]], key.gte[1])) return false;
  if (key.lte && col_lt(key.lte[1], row[key.lte[0]])) return false;
  return true;
}

function col_lt(a: unknown, b: unknown) {
  if (a == null || b == null) return false;
  return String(a) < String(b);
}

function sortRows(rows: Row[], key: CacheKey) {
  if (!key.order) return rows;
  const { column, ascending = true } = key.order;
  return [...rows].sort((a, b) => {
    const av = a[column],
      bv = b[column];
    if (av == null) return 1;
    if (bv == null) return -1;
    const r = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
    return ascending ? r : -r;
  });
}

/** Aplica uma transformação imediata em todas as listas em cache da tabela. */
export function patchTable(qc: QueryClient, table: string, apply: (rows: Row[], key: CacheKey) => Row[]) {
  const snapshots = qc.getQueriesData<Row[]>({ queryKey: [table] });
  for (const [queryKey, rows] of snapshots) {
    if (!rows) continue;
    const key = (queryKey[1] ?? {}) as CacheKey;
    qc.setQueryData(queryKey, sortRows(apply(rows, key), key));
  }
  return snapshots;
}

/** Restaura o estado anterior das listas (rollback). */
export function restoreTable(qc: QueryClient, snapshots: ReturnType<typeof patchTable>) {
  for (const [queryKey, rows] of snapshots) qc.setQueryData(queryKey, rows);
}

/** Ids temporários criados pela interface otimista (ainda não existem no backend). */
export function isOptimisticId(id: unknown): boolean {
  return typeof id === "string" && id.startsWith("optimistic-");
}

export function newOptimisticId() {
  return `optimistic-${Math.random().toString(36).slice(2)}`;
}

export function optimisticInsert(qc: QueryClient, table: string, row: Row) {
  return patchTable(qc, table, (rows, key) => (rowMatches(row, key) ? [...rows, row] : rows));
}

/** Troca a linha temporária pela linha real assim que o backend responde. */
export function replaceOptimisticRow(qc: QueryClient, table: string, tempId: string, row: Row) {
  patchTable(qc, table, (rows) => rows.map((r) => (r.id === tempId ? row : r)));
}

export function optimisticUpdate(
  qc: QueryClient,
  table: string,
  id: string,
  values: Record<string, unknown>,
) {
  return patchTable(qc, table, (rows) =>
    rows.map((r) => (r.id === id ? ({ ...r, ...values } as Row) : r)),
  );
}

export function optimisticDelete(qc: QueryClient, table: string, id: string) {
  return patchTable(qc, table, (rows) => rows.filter((r) => r.id !== id));
}


const FAIL = "Não foi possível salvar. Tente novamente.";

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export function useSave(table: string, message?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...rest } = values as { id?: string };
      if (id && isOptimisticId(id)) throw new Error("Ainda salvando o registro. Tente de novo em instantes.");
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
    // Atualiza a interface antes da resposta do backend.
    onMutate: async (values: Record<string, unknown>) => {
      await qc.cancelQueries({ queryKey: [table] });
      const { id, ...rest } = values as { id?: string };
      const tempId = newOptimisticId();
      const snapshots = id
        ? optimisticUpdate(qc, table, id, rest)
        : optimisticInsert(qc, table, {
            ...rest,
            id: tempId,
            created_at: new Date().toISOString(),
          } as Row);
      return { snapshots, tempId: id ? undefined : tempId };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.snapshots) restoreTable(qc, ctx.snapshots);
      toast.error(e.message || FAIL);
    },
    onSuccess: (data, _v, ctx) => {
      // Troca o id temporário pelo id real para evitar ações com id inválido.
      if (ctx?.tempId && data) replaceOptimisticRow(qc, table, ctx.tempId, data as Row);
      if (message) toast.success(message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}

export function useRemove(table: string, message = "Registro excluído") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Linha ainda não persistida: basta sumir da interface.
      if (isOptimisticId(id)) return;
      const { error } = await db.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: [table] });
      return { snapshots: optimisticDelete(qc, table, id) };
    },
    onError: (e: Error, _id, ctx) => {
      if (ctx?.snapshots) restoreTable(qc, ctx.snapshots);
      toast.error(e.message || FAIL);
    },
    onSuccess: () => toast.success(message),
    onSettled: () => qc.invalidateQueries({ queryKey: [table] }),
  });
}


export { currentUserId };
