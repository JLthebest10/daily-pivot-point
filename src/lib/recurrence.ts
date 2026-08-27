import { fromISODate, toISODate } from "@/lib/format";

export const REPEAT_OPTIONS = [
  { value: "none", label: "Não repete" },
  { value: "daily", label: "Diariamente" },
  { value: "alternate", label: "Dia sim, dia não" },
  { value: "weekly", label: "Semanalmente" },
  { value: "monthly", label: "Mensalmente" },
] as const;

const DAY_MS = 86_400_000;

/** Diferença em dias inteiros entre duas datas ISO (b - a). */
export function daysBetweenISO(a: string, b: string) {
  return Math.round((fromISODate(b).getTime() - fromISODate(a).getTime()) / DAY_MS);
}

/** Um item com data inicial e regra de repetição acontece nesta data? */
export function occursOn(item: { date: string; repeat?: string | null }, iso: string) {
  const start = item.date;
  if (iso === start) return true;
  const repeat = item.repeat ?? "none";
  if (repeat === "none" || iso < start) return false;

  const diff = daysBetweenISO(start, iso);
  if (repeat === "daily") return true;
  if (repeat === "alternate") return diff % 2 === 0;
  if (repeat === "weekly") return diff % 7 === 0;
  if (repeat === "monthly") {
    const s = fromISODate(start);
    const d = fromISODate(iso);
    return s.getDate() === d.getDate();
  }
  return false;
}

/** Expande um item recorrente nas datas em que ele acontece dentro do intervalo. */
export function expandOccurrences<T extends { date: string; repeat?: string | null }>(
  items: T[],
  fromISO: string,
  toISOStr: string,
): (T & { occurrenceDate: string })[] {
  const out: (T & { occurrenceDate: string })[] = [];
  const from = fromISODate(fromISO);
  const to = fromISODate(toISOStr);
  for (const item of items) {
    for (let d = new Date(from); d <= to; d = new Date(d.getTime() + DAY_MS)) {
      const iso = toISODate(d);
      if (occursOn(item, iso)) out.push({ ...item, occurrenceDate: iso, date: iso });
    }
  }
  return out;
}
