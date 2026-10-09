/** Parses a pt-BR money string typed by the user ("5.000", "0,50", "R$ 1.234,56"). Returns null when empty/invalid. */
export function parseMoney(input: string): number | null {
  let s = String(input ?? "").replace(/R\$|\s/g, "").trim();
  if (!s) return null;
  if (s.includes(",")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else {
    const parts = s.split(".");
    // "5.000" / "1.234.567" → thousands separators; "0.5" / "12.50" → decimal point
    if (parts.length > 2 || (parts.length === 2 && parts[1]!.length === 3)) s = parts.join("");
  }
  if (!/^-?\d*\.?\d*$/.test(s) || s === "." || s === "-") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100) / 100;
}

/** Formats a number for a money text field: 5000 → "5.000,00". */
export function formatMoneyInput(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(Number(n))) return "";
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Progress toward a goal: visual percent clamped to 0–100, never divides by zero. */
export function goalProgress(saved: number, target: number) {
  const s = Number(saved) || 0;
  const t = Number(target) || 0;
  const raw = t > 0 ? (s / t) * 100 : s > 0 ? 100 : 0;
  return {
    pct: Math.min(100, Math.max(0, raw)),
    remaining: Math.max(0, t - s),
    excess: Math.max(0, s - t),
    done: t > 0 && s >= t,
  };
}

/** Whole days from today (local) to an ISO date (YYYY-MM-DD). Negative when past. */
export function daysUntil(iso: string, today = new Date()): number {
  const [y, m, d] = iso.split("-").map(Number);
  const target = new Date(y!, m! - 1, d!);
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - base.getTime()) / 86400000);
}

/** "YYYY-MM" key for a month. */
export function monthKey(year: number, month0: number) {
  return `${year}-${String(month0 + 1).padStart(2, "0")}`;
}
