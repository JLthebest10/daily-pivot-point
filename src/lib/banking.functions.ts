import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type BankConnection = {
  id: string;
  provider: string;
  item_id: string;
  institution_name: string;
  status: string;
  last_synced_at: string | null;
};

export const listConnections = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("bank_connections")
      .select("id, provider, item_id, institution_name, status, last_synced_at")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as BankConnection[];
  });

export const createConnectToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ itemId: z.string().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { createConnectTokenRaw } = await import("./pluggy.server");
    return { token: await createConnectTokenRaw(data.itemId) };
  });

export const saveConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ itemId: z.string().min(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const { getItem } = await import("./pluggy.server");
    const item = await getItem(data.itemId);
    const { error } = await context.supabase.from("bank_connections").upsert(
      {
        user_id: context.userId,
        provider: "pluggy",
        item_id: item.id,
        institution_name: item.connector?.name ?? "Banco",
        status: item.status ?? "UPDATED",
      },
      { onConflict: "user_id,item_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const disconnectBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ connectionId: z.string().uuid(), deleteTransactions: z.boolean().default(false) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: conn } = await context.supabase
      .from("bank_connections")
      .select("id, item_id")
      .eq("id", data.connectionId)
      .maybeSingle();
    if (!conn) throw new Error("Conexão não encontrada.");

    if (data.deleteTransactions) {
      const { data: accounts } = await context.supabase
        .from("bank_accounts")
        .select("id")
        .eq("connection_id", conn.id);
      const ids = (accounts ?? []).map((a: { id: string }) => a.id);
      if (ids.length) {
        await context.supabase.from("transactions").delete().in("bank_account_id", ids);
      }
    }

    await context.supabase.from("bank_connections").delete().eq("id", conn.id);
    const { deleteItem } = await import("./pluggy.server");
    await deleteItem(conn.item_id).catch(() => undefined);
    return { ok: true };
  });

export const syncTransactions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ connectionId: z.string().uuid().optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { getItem, listAccounts, listTransactions } = await import("./pluggy.server");
    const { categorize, paymentLabel } = await import("./tx-rules");

    let query = context.supabase.from("bank_connections").select("*");
    if (data.connectionId) query = query.eq("id", data.connectionId);
    const { data: connections, error } = await query;
    if (error) throw new Error(error.message);
    if (!connections?.length) return { imported: 0, connections: 0 };

    let imported = 0;

    for (const conn of connections as Array<{
      id: string;
      item_id: string;
      last_synced_at: string | null;
    }>) {
      const item = await getItem(conn.item_id).catch(() => null);
      if (!item) {
        await context.supabase
          .from("bank_connections")
          .update({ status: "ERROR" })
          .eq("id", conn.id);
        continue;
      }

      const accounts = await listAccounts(conn.item_id);
      for (const acc of accounts) {
        const { data: saved, error: accErr } = await context.supabase
          .from("bank_accounts")
          .upsert(
            {
              user_id: context.userId,
              connection_id: conn.id,
              account_id: acc.id,
              name: acc.name ?? "Conta",
              type: acc.type ?? "BANK",
              number: acc.number ?? null,
              balance: acc.balance ?? 0,
            },
            { onConflict: "user_id,account_id" },
          )
          .select("id")
          .single();
        if (accErr || !saved) continue;

        // Primeira carga: 12 meses. Depois: desde a última sincronização menos 3 dias.
        const since = conn.last_synced_at
          ? new Date(new Date(conn.last_synced_at).getTime() - 3 * 864e5)
          : new Date(Date.now() - 365 * 864e5);
        const from = since.toISOString().slice(0, 10);

        const txs = await listTransactions(acc.id, from);
        if (!txs.length) continue;

        const externalIds = txs.map((t) => `pluggy:${t.id}`);
        const { data: existing } = await context.supabase
          .from("transactions")
          .select("external_id")
          .in("external_id", externalIds);
        const known = new Set((existing ?? []).map((r) => r.external_id));

        const rows = txs
          .filter((t) => !known.has(`pluggy:${t.id}`))
          .map((t) => {
            const isIncome = (t.type ?? "").toUpperCase() === "CREDIT" || t.amount > 0;
            const type = isIncome ? "income" : "expense";
            const description = t.description || t.descriptionRaw || "Transação";
            return {
              user_id: context.userId,
              type,
              amount: Math.abs(Number(t.amount)),
              date: String(t.date).slice(0, 10),
              category: categorize(description, type),
              description,
              payment_method: paymentLabel(t.paymentData?.paymentMethod ?? t.type ?? null),
              external_id: `pluggy:${t.id}`,
              source: "pluggy",
              bank_account_id: saved.id,
            };
          });

        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const { error: insErr } = await context.supabase.from("transactions").insert(chunk);
          if (insErr) {
            console.error("insert transactions failed", insErr.message);
            continue;
          }
          imported += chunk.length;
        }
      }

      await context.supabase
        .from("bank_connections")
        .update({
          status: item.status ?? "UPDATED",
          institution_name: item.connector?.name ?? "Banco",
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", conn.id);
    }

    return { imported, connections: connections.length };
  });

const importedTx = z.object({
  externalId: z.string().min(1),
  date: z.string().min(8),
  description: z.string().min(1),
  amount: z.number().positive(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1),
  paymentMethod: z.string().nullable().optional(),
});

export const importStatement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ transactions: z.array(importedTx).min(1).max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const externalIds = data.transactions.map((t) => t.externalId);
    const known = new Set<string>();
    for (let i = 0; i < externalIds.length; i += 200) {
      const { data: existing } = await context.supabase
        .from("transactions")
        .select("external_id")
        .in("external_id", externalIds.slice(i, i + 200));
      for (const row of existing ?? []) if (row.external_id) known.add(row.external_id);
    }

    const rows = data.transactions
      .filter((t) => !known.has(t.externalId))
      .map((t) => ({
        user_id: context.userId,
        type: t.type,
        amount: t.amount,
        date: t.date,
        category: t.category,
        description: t.description,
        payment_method: t.paymentMethod ?? null,
        external_id: t.externalId,
        source: "import",
      }));

    let imported = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200);
      const { error } = await context.supabase.from("transactions").insert(chunk);
      if (error) throw new Error(error.message);
      imported += chunk.length;
    }

    return { imported, skipped: data.transactions.length - rows.length };
  });
