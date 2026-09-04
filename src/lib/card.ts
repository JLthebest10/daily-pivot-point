import { toISODate, fromISODate } from "@/lib/format";

export const CARD_CATEGORIES = [
  "Alimentação",
  "Transporte",
  "Academia",
  "Lazer",
  "Compras",
  "Outros",
] as const;

export const DEFAULT_CARD_SETTINGS = {
  credit_limit: 500,
  closing_day: 15,
  due_day: 25,
};

export type CardSettings = {
  id: string;
  credit_limit: number | string;
  closing_day: number;
  due_day: number;
};

export type CardExpense = {
  id: string;
  amount: number | string;
  description: string;
  date: string;
  category: string | null;
};

/** Dinheiro em centavos para evitar erros de arredondamento. */
export function toCents(v: number | string): number {
  return Math.round(Number(v ?? 0) * 100);
}

export function fromCents(c: number): number {
  return c / 100;
}

function clampDay(year: number, month: number, day: number) {
  const last = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, last));
}

export type Cycle = {
  /** ISO do primeiro dia do ciclo (dia seguinte ao fechamento anterior). */
  start: string;
  /** ISO do dia de fechamento deste ciclo. */
  end: string;
  /** ISO do vencimento da fatura deste ciclo. */
  due: string;
  label: string;
};

/** Ciclo que contém a data informada, a partir do dia de fechamento. */
export function cycleFor(dateISO: string, closingDay: number, dueDay: number): Cycle {
  const d = fromISODate(dateISO);
  const y = d.getFullYear();
  const m = d.getMonth();

  let end = clampDay(y, m, closingDay);
  if (d > end) end = clampDay(y, m + 1, closingDay);

  const prevClose = clampDay(end.getFullYear(), end.getMonth() - 1, closingDay);
  const start = new Date(prevClose);
  start.setDate(start.getDate() + 1);

  // Vencimento: próxima ocorrência do dia de vencimento após o fechamento.
  let due = clampDay(end.getFullYear(), end.getMonth(), dueDay);
  if (due < end) due = clampDay(end.getFullYear(), end.getMonth() + 1, dueDay);

  return {
    start: toISODate(start),
    end: toISODate(end),
    due: toISODate(due),
    label: `${String(end.getMonth() + 1).padStart(2, "0")}/${end.getFullYear()}`,
  };
}

export function shiftCycle(cycle: Cycle, months: number, closingDay: number, dueDay: number): Cycle {
  const end = fromISODate(cycle.end);
  const ref = clampDay(end.getFullYear(), end.getMonth() + months, closingDay);
  return cycleFor(toISODate(ref), closingDay, dueDay);
}

export function inCycle(dateISO: string, cycle: Cycle) {
  return dateISO >= cycle.start && dateISO <= cycle.end;
}

export function sumCents(expenses: CardExpense[]) {
  return expenses.reduce((acc, e) => acc + toCents(e.amount), 0);
}

export function daysUntilISO(iso: string) {
  const today = fromISODate(toISODate());
  const target = fromISODate(iso);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
