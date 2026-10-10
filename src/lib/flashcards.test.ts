import { describe, expect, it } from "vitest";
import { countByTopic, filterAndSort, parseImport, statusCounts, topicStatus, type Topic } from "./flashcards";

const t = (p: Partial<Topic>): Topic => ({
  id: "a",
  name: "Assunto",
  category: null,
  notes: null,
  priority: null,
  deadline: null,
  completed_at: null,
  archived: false,
  created_at: "2026-10-01T10:00:00Z",
  ...p,
});

describe("status do assunto", () => {
  it("sem cartões é Pendente", () => expect(topicStatus(t({}), 0)).toBe("pendente"));
  it("com um cartão é Em andamento, não Concluído", () => expect(topicStatus(t({}), 1)).toBe("andamento"));
  it("Concluído só quando marcado", () =>
    expect(topicStatus(t({ completed_at: "2026-10-02T00:00:00Z" }), 0)).toBe("concluido"));
  it("reabrir volta a depender dos cartões", () => expect(topicStatus(t({ completed_at: null }), 3)).toBe("andamento"));
});

describe("lista", () => {
  const topics = [
    t({ id: "1", name: "Anatomia", category: "Saúde", created_at: "2026-10-01T00:00:00Z", priority: "baixa" }),
    t({ id: "2", name: "Fisiologia", created_at: "2026-10-03T00:00:00Z", priority: "alta", deadline: "2026-11-01" }),
    t({ id: "3", name: "Biomecânica", created_at: "2026-10-02T00:00:00Z", deadline: "2026-10-15", completed_at: "x" }),
  ];
  const counts = countByTopic([{ topic_id: "2" }, { topic_id: "2" }]);

  it("conta por status", () =>
    expect(statusCounts(topics, counts)).toEqual({ total: 3, pendente: 1, andamento: 1, concluido: 1 }));
  it("filtra por status", () =>
    expect(filterAndSort(topics, counts, { status: "andamento", query: "", sort: "recentes" }).map((x) => x.id)).toEqual(["2"]));
  it("busca por categoria e sem acento", () => {
    expect(filterAndSort(topics, counts, { status: "todos", query: "saude", sort: "recentes" }).map((x) => x.id)).toEqual(["1"]);
    expect(filterAndSort(topics, counts, { status: "todos", query: "biomecanica", sort: "recentes" })).toHaveLength(1);
  });
  it("ordena por prioridade, prazo e data", () => {
    const ids = (s: "recentes" | "antigos" | "prioridade" | "prazo") =>
      filterAndSort(topics, counts, { status: "todos", query: "", sort: s }).map((x) => x.id);
    expect(ids("recentes")).toEqual(["2", "3", "1"]);
    expect(ids("antigos")).toEqual(["1", "3", "2"]);
    expect(ids("prioridade")).toEqual(["2", "1", "3"]);
    expect(ids("prazo")).toEqual(["3", "2", "1"]);
  });
});

describe("importar texto", () => {
  it("separa pergunta e resposta", () => {
    expect(parseImport("O que é?\tResposta\nPlano sagital :: divide direita/esquerda\nsem separador")).toEqual([
      { front: "O que é?", back: "Resposta" },
      { front: "Plano sagital", back: "divide direita/esquerda" },
    ]);
  });
});
