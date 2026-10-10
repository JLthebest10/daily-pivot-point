/** Regras puras do módulo Flashcards. */

export type Topic = {
  id: string;
  name: string;
  category: string | null;
  notes: string | null;
  priority: "baixa" | "media" | "alta" | null;
  deadline: string | null;
  completed_at: string | null;
  archived: boolean;
  created_at: string;
};

export type Card = {
  id: string;
  topic_id: string;
  front: string;
  back: string;
  order_index: number;
  created_at: string;
};

export type TopicStatus = "pendente" | "andamento" | "concluido";
export type StatusFilter = "todos" | TopicStatus;
export type SortKey = "recentes" | "antigos" | "prioridade" | "prazo";

export const STATUS_LABEL: Record<TopicStatus, string> = {
  pendente: "Pendente",
  andamento: "Em andamento",
  concluido: "Concluído",
};

export const STATUS_STYLE: Record<TopicStatus, string> = {
  pendente: "bg-muted text-muted-foreground",
  andamento: "bg-accent text-accent-foreground",
  concluido: "bg-primary/15 text-primary",
};

export const PRIORITY_LABEL = { baixa: "Baixa", media: "Média", alta: "Alta" } as const;

/** Concluído só quando o usuário declara; senão depende de ter cartões. */
export function topicStatus(t: Pick<Topic, "completed_at">, cardCount: number): TopicStatus {
  if (t.completed_at) return "concluido";
  return cardCount > 0 ? "andamento" : "pendente";
}

export function countByTopic(cards: Pick<Card, "topic_id">[]) {
  const m = new Map<string, number>();
  for (const c of cards) m.set(c.topic_id, (m.get(c.topic_id) ?? 0) + 1);
  return m;
}

export function statusCounts(topics: Topic[], counts: Map<string, number>) {
  const r = { total: topics.length, pendente: 0, andamento: 0, concluido: 0 };
  for (const t of topics) r[topicStatus(t, counts.get(t.id) ?? 0)]++;
  return r;
}

const PRIO_RANK = { alta: 0, media: 1, baixa: 2 } as const;

export function filterAndSort(
  topics: Topic[],
  counts: Map<string, number>,
  opts: { status: StatusFilter; query: string; sort: SortKey },
) {
  const q = opts.query
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const norm = (s: string | null) =>
    (s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const list = topics.filter(
    (t) =>
      (opts.status === "todos" || topicStatus(t, counts.get(t.id) ?? 0) === opts.status) &&
      (!q || norm(t.name).includes(q) || norm(t.category).includes(q)),
  );
  const byCreated = (a: Topic, b: Topic) => b.created_at.localeCompare(a.created_at);
  return list.sort((a, b) => {
    switch (opts.sort) {
      case "antigos":
        return -byCreated(a, b);
      case "prioridade":
        return (
          (a.priority ? PRIO_RANK[a.priority] : 3) - (b.priority ? PRIO_RANK[b.priority] : 3) ||
          byCreated(a, b)
        );
      case "prazo":
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline) || byCreated(a, b);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return byCreated(a, b);
      default:
        return byCreated(a, b);
    }
  });
}

/**
 * Importa cartões de texto colado. Uma linha por cartão, separando pergunta e
 * resposta por tab, " :: ", " ; " ou " - ". Linhas sem separador são ignoradas.
 */
export function parseImport(text: string): { front: string; back: string }[] {
  const out: { front: string; back: string }[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.split(/\t| :: | ; | - /);
    if (m.length < 2) continue;
    const front = m[0]!.trim();
    const back = m.slice(1).join(" - ").trim();
    if (front && back) out.push({ front: front.slice(0, 1000), back: back.slice(0, 2000) });
  }
  return out;
}
