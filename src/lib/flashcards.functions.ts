import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Suggestion = { front: string; back: string };

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["cards"],
  properties: {
    cards: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["front", "back"],
        properties: { front: { type: "string" }, back: { type: "string" } },
      },
    },
  },
};

/** Sugere perguntas e respostas a partir das anotações. Nada é salvo aqui. */
export const suggestCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topicId: z.string().uuid(),
        count: z.number().int().min(1).max(20).default(8),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    // RLS: só encontra o assunto se ele for do usuário
    const { data: topic } = await context.supabase
      .from("flashcard_topics")
      .select("name, category, notes")
      .eq("id", data.topicId)
      .maybeSingle();
    if (!topic) return { cards: [] as Suggestion[], error: "Assunto não encontrado." };
    if (!topic.notes?.trim())
      return { cards: [] as Suggestion[], error: "Escreva anotações no assunto para a IA usar como base." };

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { cards: [] as Suggestion[], error: "IA indisponível no momento." };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        stream: true,
        store: false,
        reasoning: { effort: "low" },
        instructions:
          "Você cria flashcards de estudo em português do Brasil. Use apenas o conteúdo das anotações. Perguntas curtas e objetivas; respostas diretas, no máximo 2 frases. Não invente fatos fora das anotações.",
        input: `Assunto: ${topic.name}${topic.category ? ` (${topic.category})` : ""}\nCrie até ${data.count} flashcards.\n\nAnotações:\n${topic.notes.slice(0, 12000)}`,
        text: { format: { type: "json_schema", name: "flashcards", strict: true, schema: SCHEMA } },
      }),
    });

    if (!res.ok || !res.body) {
      const msg =
        res.status === 402
          ? "Créditos de IA esgotados. Adicione créditos em Configurações → Planos."
          : res.status === 429
            ? "Muitas solicitações agora. Tente de novo em alguns segundos."
            : "Não foi possível gerar sugestões agora.";
      console.error("ai suggest", res.status, await res.text().catch(() => ""));
      return { cards: [] as Suggestion[], error: msg };
    }

    // Lê o stream SSE e junta o texto final
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
        } catch {
          /* linha parcial */
        }
      }
    }
    try {
      const parsed = JSON.parse(text) as { cards: Suggestion[] };
      const cards = (parsed.cards ?? [])
        .map((c) => ({ front: String(c.front).trim(), back: String(c.back).trim() }))
        .filter((c) => c.front && c.back)
        .slice(0, data.count);
      return { cards, error: cards.length ? null : "A IA não retornou sugestões." };
    } catch {
      return { cards: [] as Suggestion[], error: "Resposta da IA em formato inesperado." };
    }
  });
