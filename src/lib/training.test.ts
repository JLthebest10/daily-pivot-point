import { describe, expect, it } from "vitest";
import {
  buildDraft,
  exerciseHistory,
  findDuplicate,
  formatDecimal,
  parseDecimal,
  sanitizeDecimalInput,
  type Session,
  type SetLog,
} from "./training";

const set = (p: Partial<SetLog>): SetLog => ({
  id: Math.random().toString(),
  session_id: "s1",
  exercise_id: "e1",
  library_id: "L1",
  set_number: 1,
  weight: 0,
  reps: 0,
  done: true,
  date: "2026-10-01",
  created_at: "2026-10-01T10:00:00Z",
  ...p,
});
const sess = (id: string, date: string, finished = true): Session => ({
  id,
  workout_id: "w",
  date,
  started_at: `${date}T10:00:00Z`,
  finished_at: finished ? `${date}T11:00:00Z` : null,
  duration_min: 60,
  created_at: `${date}T10:00:00Z`,
});

describe("cargas decimais", () => {
  it("aceita 32,5 kg", () => expect(parseDecimal("32,5")).toBe(32.5));
  it("campo vazio fica vazio, não vira zero", () => expect(parseDecimal("")).toBeNull());
  it("mostra 32,5 com vírgula", () => expect(formatDecimal(32.5)).toBe("32,5"));
  it("limpa letras ao digitar", () => expect(sanitizeDecimalInput("3a2.5")).toBe("32,5"));
});

describe("histórico por série", () => {
  const sessions = [sess("s1", "2026-10-01"), sess("s2", "2026-10-05"), sess("s3", "2026-10-09", false)];
  const sets = [
    set({ session_id: "s1", set_number: 1, weight: 70, reps: 10 }),
    set({ session_id: "s2", set_number: 1, weight: 80, reps: 12 }),
    set({ session_id: "s2", set_number: 2, weight: 75, reps: 10 }),
    set({ session_id: "s2", set_number: 3, weight: 70, reps: 8, done: false }),
    set({ session_id: "s3", set_number: 1, weight: 90, reps: 5 }),
    set({ session_id: "s2", exercise_id: "outro-treino", set_number: 3, weight: 70, reps: 8 }),
  ];

  it("última sessão finalizada vem primeiro e sessão em andamento não conta", () => {
    const h = exerciseHistory(sets, sessions, { id: "e1", library_id: "L1" });
    expect(h.map((x) => x.session_id)).toEqual(["s2", "s1"]);
  });

  it("mesmo exercício em outro treino soma no histórico", () => {
    const h = exerciseHistory(sets, sessions, { id: "e1", library_id: "L1" });
    expect(h[0]!.sets.map((s) => [s.weight, s.reps])).toEqual([
      [80, 12],
      [75, 10],
      [70, 8],
    ]);
  });

  it("nova sessão usa a anterior como referência sem marcar como concluída", () => {
    const prev = exerciseHistory(sets, sessions, { id: "e1", library_id: "L1" })[0]!.sets;
    const d = buildDraft(4, 12, [], prev);
    expect(d.map((r) => [r.weight, r.reps, r.done])).toEqual([
      ["80", "12", false],
      ["75", "10", false],
      ["70", "8", false],
      ["70", "8", false],
    ]);
  });

  it("séries já salvas na sessão atual prevalecem", () => {
    const d = buildDraft(2, 12, [set({ session_id: "s3", set_number: 2, weight: 32.5, reps: 9, done: true })], undefined);
    expect(d[0]).toMatchObject({ weight: "", reps: "12", done: false });
    expect(d[1]).toMatchObject({ weight: "32,5", reps: "9", done: true });
  });
});

describe("biblioteca", () => {
  it("encontra exercício igual ignorando acento e maiúsculas", () => {
    expect(findDuplicate([{ name: "Supino Inclinado" }], "  supino   inclinádo")).toBeTruthy();
  });
});
