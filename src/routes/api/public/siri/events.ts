import { createFileRoute } from "@tanstack/react-router";
import { TOKEN_PREFIX, buildEvent, confirmation, hashToken } from "@/lib/siri";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

/**
 * Cria UM evento para o dono da chave. Não lê, lista nem apaga nada.
 * Authorization: Bearer lh_...
 */
export const Route = createFileRoute("/api/public/siri/events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = request.headers.get("authorization") ?? "";
        const token = auth.replace(/^Bearer\s+/i, "").trim();
        if (!token.startsWith(TOKEN_PREFIX) || token.length !== TOKEN_PREFIX.length + 64)
          return json({ ok: false, message: "Chave inválida." }, 401);

        const raw = await request.text();
        if (raw.length > 8000) return json({ ok: false, message: "Dados grandes demais." }, 413);
        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json({ ok: false, message: "Envie os dados em JSON." }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: key } = await supabaseAdmin
          .from("api_tokens")
          .select("id, user_id")
          .eq("token_hash", await hashToken(token))
          .is("revoked_at", null)
          .maybeSingle();
        if (!key) return json({ ok: false, message: "Chave inválida." }, 401);

        const built = buildEvent(body);
        if (!built.ok) return json({ ok: false, message: built.error }, 400);

        // dono vem só da chave
        const { error } = await supabaseAdmin
          .from("events")
          .insert({ ...built.event, user_id: key.user_id });
        if (error) {
          console.error("siri insert", error.message);
          return json({ ok: false, message: "Não foi possível salvar o evento." }, 500);
        }
        await supabaseAdmin
          .from("api_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .eq("id", key.id);
        return json({ ok: true, message: confirmation(built.event) }, 201);
      },
    },
  },
});
