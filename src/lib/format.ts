export const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2,
});

export function money(value: number) {
  return BRL.format(value ?? 0);
}

export function pct(value: number) {
  return `${Math.round(value)}%`;
}

/** Local YYYY-MM-DD (never UTC-shifted). */
export function toISODate(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y!, (m ?? 1) - 1, d ?? 1);
}

export function addDays(d: Date, n: number) {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

export function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function startOfWeek(d: Date) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

export const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

export function longDate(d: Date) {
  return `${WEEKDAYS_FULL[d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]!.toLowerCase()}`;
}

export const WEEKDAYS_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

export function shortDate(iso: string) {
  const d = fromISODate(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function greeting(d = new Date()) {
  const h = d.getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

export function minutesUntil(dateISO: string, time?: string | null) {
  if (!time) return null;
  const [h, m] = time.split(":").map(Number);
  const d = fromISODate(dateISO);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return Math.round((d.getTime() - Date.now()) / 60000);
}

export function humanDelta(mins: number) {
  if (mins < 0) return "agora";
  if (mins < 60) return `em ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `em ${h}h`;
  return `em ${Math.floor(h / 24)}d`;
}

/** Dias inteiros entre hoje e uma data ISO (positivo = futuro). */
export function daysUntil(iso: string) {
  const a = new Date();
  a.setHours(0, 0, 0, 0);
  const b = fromISODate(iso);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export function relativeDays(iso: string) {
  const d = daysUntil(iso);
  if (d === 0) return "Hoje";
  if (d === 1) return "Amanhã";
  if (d === -1) return "Ontem";
  if (d > 1) return `Daqui ${d} dias`;
  return `Há ${Math.abs(d)} dias`;
}
