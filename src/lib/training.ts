/** Regras puras do módulo Treino (sem React / sem backend). */

export const MUSCLE_GROUPS = [
  "Peito",
  "Costas",
  "Ombros",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posterior",
  "Glúteos",
  "Panturrilha",
  "Abdômen",
  "Corpo inteiro",
  "Cardio",
] as const;

export type LibraryExercise = {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  description: string | null;
  default_sets: number;
  default_reps: string;
  default_rest_sec: number;
  media_path: string | null;
  media_type: "image" | "video" | null;
  created_at: string;
};

export type WorkoutExercise = {
  id: string;
  workout_id: string;
  library_id: string | null;
  name: string;
  target_sets: number;
  target_reps: number;
  target_reps_text: string | null;
  rest_sec: number;
  order_index: number;
  note: string | null;
  archived: boolean;
};

export type SetLog = {
  id: string;
  session_id: string;
  exercise_id: string;
  library_id: string | null;
  set_number: number;
  weight: number;
  reps: number;
  done: boolean;
  date: string;
  created_at: string;
};

export type Session = {
  id: string;
  workout_id: string | null;
  date: string;
  started_at: string | null;
  finished_at: string | null;
  duration_min: number | null;
  created_at: string;
};

export type DraftRow = { id?: string; weight: string; reps: string; done: boolean };

/** Aceita "32,5" ou "32.5". Vazio ou inválido → null. */
export function parseDecimal(s: string): number | null {
  const t = s.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 32.5 → "32,5"; 60 → "60". */
export function formatDecimal(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return String(Number(n)).replace(".", ",");
}

/** Mantém só caracteres válidos para carga decimal enquanto digita. */
export function sanitizeDecimalInput(s: string): string {
  const cleaned = s.replace(/[^\d.,]/g, "").replace(".", ",");
  const [int, ...rest] = cleaned.split(",");
  return rest.length ? `${int},${rest.join("").slice(0, 2)}` : int!;
}

export function repsLabel(ex: Pick<WorkoutExercise, "target_reps" | "target_reps_text">) {
  return ex.target_reps_text?.trim() || String(ex.target_reps);
}

/** Primeiro número da faixa de repetições ("8-12" → 8). */
export function firstReps(text: string, fallback = 10) {
  const m = text.match(/\d+/);
  return m ? Number(m[0]) : fallback;
}

export function normalizeName(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function findDuplicate<T extends { name: string }>(library: T[], name: string) {
  const n = normalizeName(name);
  if (!n) return undefined;
  return library.find((l) => normalizeName(l.name) === n);
}

/** Se o exercício pertence à biblioteca, histórico é por biblioteca; senão, pelo exercício do treino. */
export function belongsTo(set: SetLog, ex: Pick<WorkoutExercise, "id" | "library_id">) {
  return ex.library_id ? set.library_id === ex.library_id : set.exercise_id === ex.id;
}

export type PastSession = { session_id: string; date: string; sets: SetLog[] };

/** Sessões finalizadas do exercício, mais recentes primeiro, só com séries concluídas. */
export function exerciseHistory(
  sets: SetLog[],
  sessions: Session[],
  ex: Pick<WorkoutExercise, "id" | "library_id">,
  excludeSessionId?: string | null,
): PastSession[] {
  const finished = new Map(sessions.filter((s) => s.finished_at).map((s) => [s.id, s]));
  const by = new Map<string, PastSession>();
  for (const s of sets) {
    if (!s.done || !belongsTo(s, ex) || s.session_id === excludeSessionId) continue;
    const sess = finished.get(s.session_id);
    if (!sess) continue;
    const g = by.get(s.session_id) ?? { session_id: s.session_id, date: sess.date, sets: [] };
    g.sets.push(s);
    by.set(s.session_id, g);
  }
  const order = (id: string) => Date.parse(finished.get(id)?.finished_at ?? "") || 0;
  return [...by.values()]
    .map((g) => ({ ...g, sets: g.sets.sort((a, b) => a.set_number - b.set_number) }))
    .sort((a, b) => b.date.localeCompare(a.date) || order(b.session_id) - order(a.session_id));
}

/**
 * Monta as linhas da sessão atual:
 * - séries já salvas nesta sessão prevalecem;
 * - demais usam a sessão anterior como referência (nunca marcadas como concluídas);
 * - sem histórico, usa a prescrição.
 */
export function buildDraft(
  targetSets: number,
  targetReps: number,
  current: SetLog[],
  previous: SetLog[] | undefined,
): DraftRow[] {
  const cur = [...current].sort((a, b) => a.set_number - b.set_number);
  const maxCur = cur.reduce((m, s) => Math.max(m, s.set_number), 0);
  const count = Math.max(targetSets, maxCur, 1);
  const rows: DraftRow[] = [];
  for (let i = 0; i < count; i++) {
    const saved = cur.find((s) => s.set_number === i + 1);
    if (saved) {
      rows.push({
        id: saved.id,
        weight: formatDecimal(saved.weight),
        reps: String(saved.reps),
        done: saved.done,
      });
      continue;
    }
    const ref = previous?.[i] ?? previous?.[previous.length - 1];
    rows.push({
      weight: ref ? formatDecimal(ref.weight) : "",
      reps: String(ref?.reps ?? targetReps),
      done: false,
    });
  }
  return rows;
}

/** Tempo decorrido com pausas. */
export function elapsedMs(startedAt: string, pausedMs: number, pausedAt: number | null, now: number) {
  const end = pausedAt ?? now;
  return Math.max(0, end - Date.parse(startedAt) - pausedMs);
}

export function formatClock(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export const MAX_MEDIA_MB = 50;
export function mediaKind(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "heic", "heif", "webp", "gif"].includes(ext)) return "image";
  if (["mp4", "mov", "m4v", "webm"].includes(ext)) return "video";
  return null;
}
