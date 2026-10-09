import { z } from "zod";

/** Regras puras da integração Siri/Atalhos (sem banco). */

export const TOKEN_PREFIX = "lh_";

export async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateToken(): string {
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  return TOKEN_PREFIX + [...raw].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Aceita "2026-10-10", "10/10/2026" ou data/hora ISO ("2026-10-10T14:30:00-03:00"). */
export function parseDate(input: string): { date: string; time: string | null } | null {
  const s = input.trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2}))?/);
  let y: number, mo: number, d: number, time: string | null = null;
  if (m) {
    [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[4]) time = `${m[4].padStart(2, "0")}:${m[5]}`;
  } else {
    m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/);
    if (!m) return null;
    [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (m[4]) time = `${m[4].padStart(2, "0")}:${m[5]}`;
  }
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 2000 || y > 2100) return null;
  if (time && !isValidTime(time)) return null;
  return { date: `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`, time };
}

export function parseTime(input: string): string | null {
  const m = input.trim().match(/^(\d{1,2})[:h](\d{2})?/i);
  if (!m) return null;
  const t = `${m[1]!.padStart(2, "0")}:${m[2] ?? "00"}`;
  return isValidTime(t) ? t : null;
}

function isValidTime(t: string) {
  const [h, mi] = t.split(":").map(Number);
  return h! >= 0 && h! <= 23 && mi! >= 0 && mi! <= 59;
}

const optText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const siriEventSchema = z.object({
  title: z.string().trim().min(1, "Informe o nome do evento.").max(200),
  date: z.string().trim().min(1, "Informe a data."),
  time: optText(20),
  duration_min: z.coerce.number().int().min(5).max(24 * 60).optional(),
  location: optText(200),
  description: optText(1000),
  importance: z.enum(["baixa", "normal", "alta"]).optional(),
  add_alarm: z.union([z.boolean(), z.string()]).optional(),
});

export type EventInsert = {
  title: string;
  date: string;
  start_time: string | null;
  duration_min: number;
  location: string | null;
  description: string | null;
  importance: string;
  add_alarm: boolean;
};

/**
 * Valida o que o Atalho mandou. Qualquer campo de dono (user_id) é ignorado:
 * o dono vem sempre da chave.
 */
export function buildEvent(body: unknown): { ok: true; event: EventInsert } | { ok: false; error: string } {
  const parsed = siriEventSchema.safeParse(body);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const b = parsed.data;
  const d = parseDate(b.date);
  if (!d) return { ok: false, error: "Data inválida. Use AAAA-MM-DD ou DD/MM/AAAA." };
  let time = d.time;
  if (b.time) {
    time = parseTime(b.time);
    if (!time) return { ok: false, error: "Horário inválido. Use HH:MM." };
  }
  const alarm = typeof b.add_alarm === "string" ? /^(true|sim|1|yes)$/i.test(b.add_alarm) : !!b.add_alarm;
  return {
    ok: true,
    event: {
      title: b.title,
      date: d.date,
      start_time: time,
      duration_min: b.duration_min ?? 60,
      location: b.location,
      description: b.description,
      importance: b.importance ?? "normal",
      add_alarm: alarm,
    },
  };
}

export function confirmation(e: EventInsert) {
  const [y, m, d] = e.date.split("-");
  return `Evento "${e.title}" criado para ${d}/${m}/${y}${e.start_time ? ` às ${e.start_time}` : ""}.`;
}
