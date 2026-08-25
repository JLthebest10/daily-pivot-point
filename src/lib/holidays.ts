import { toISODate } from "@/lib/format";

export type Holiday = {
  date: string;
  name: string;
  type: "nacional" | "comemorativa";
};

function easterSunday(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function shift(d: Date, days: number) {
  const n = new Date(d);
  n.setDate(n.getDate() + days);
  return n;
}

/** N-ésimo dia da semana do mês (weekday 0=Dom) */
function nthWeekday(year: number, month: number, weekday: number, nth: number) {
  const first = new Date(year, month, 1);
  const offset = (weekday - first.getDay() + 7) % 7;
  return new Date(year, month, 1 + offset + (nth - 1) * 7);
}

const cache = new Map<number, Holiday[]>();

export function holidaysOfYear(year: number): Holiday[] {
  const cached = cache.get(year);
  if (cached) return cached;

  const easter = easterSunday(year);
  const fixed: [number, number, string, Holiday["type"]][] = [
    [0, 1, "Ano Novo", "nacional"],
    [3, 21, "Tiradentes", "nacional"],
    [4, 1, "Dia do Trabalho", "nacional"],
    [5, 12, "Dia dos Namorados", "comemorativa"],
    [8, 7, "Independência do Brasil", "nacional"],
    [9, 12, "Nossa Senhora Aparecida", "nacional"],
    [9, 31, "Halloween", "comemorativa"],
    [10, 2, "Finados", "nacional"],
    [10, 15, "Proclamação da República", "nacional"],
    [10, 20, "Consciência Negra", "nacional"],
    [11, 24, "Véspera de Natal", "comemorativa"],
    [11, 25, "Natal", "nacional"],
    [11, 31, "Véspera de Ano Novo", "comemorativa"],
  ];

  const list: Holiday[] = [
    ...fixed.map(([m, d, name, type]) => ({
      date: toISODate(new Date(year, m, d)),
      name,
      type,
    })),
    { date: toISODate(shift(easter, -48)), name: "Carnaval", type: "nacional" },
    { date: toISODate(shift(easter, -47)), name: "Carnaval", type: "nacional" },
    { date: toISODate(shift(easter, -2)), name: "Sexta-feira Santa", type: "nacional" },
    { date: toISODate(easter), name: "Páscoa", type: "nacional" },
    { date: toISODate(shift(easter, 60)), name: "Corpus Christi", type: "nacional" },
    {
      date: toISODate(nthWeekday(year, 4, 0, 2)),
      name: "Dia das Mães",
      type: "comemorativa",
    },
    {
      date: toISODate(nthWeekday(year, 7, 0, 2)),
      name: "Dia dos Pais",
      type: "comemorativa",
    },
    { date: toISODate(new Date(year, 9, 12)), name: "Dia das Crianças", type: "comemorativa" },
  ];

  list.sort((a, b) => a.date.localeCompare(b.date));
  cache.set(year, list);
  return list;
}

/** Mapa ISO -> feriados, cobrindo os anos informados */
export function holidayMap(years: number[]) {
  const map = new Map<string, Holiday[]>();
  for (const y of new Set(years)) {
    for (const h of holidaysOfYear(y)) {
      const arr = map.get(h.date) ?? [];
      arr.push(h);
      map.set(h.date, arr);
    }
  }
  return map;
}

export function holidaysOn(iso: string): Holiday[] {
  const year = Number(iso.slice(0, 4));
  if (!year) return [];
  return holidaysOfYear(year).filter((h) => h.date === iso);
}
