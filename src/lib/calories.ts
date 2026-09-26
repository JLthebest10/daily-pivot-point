/** Cálculos do Acompanhamento Calórico — funções puras e verificáveis. */

export type Sex = "M" | "F";

export const ACTIVITY_LEVELS = {
  sedentary: { label: "Sedentário (sem contar treinos)", factor: 1.2 },
  light: { label: "Levemente ativo", factor: 1.375 },
  moderate: { label: "Moderadamente ativo", factor: 1.55 },
  high: { label: "Muito ativo", factor: 1.725 },
  extreme: { label: "Extremamente ativo", factor: 1.9 },
} as const;
export type ActivityLevel = keyof typeof ACTIVITY_LEVELS;

export const MEAL_CATEGORIES = [
  "Café da manhã",
  "Lanche da manhã",
  "Almoço",
  "Lanche da tarde",
  "Jantar",
  "Ceia",
  "Livre",
  "Outro",
];
export const EXERCISE_TYPES = ["Musculação", "Cardio", "Caminhada", "Corrida", "Bike", "Esporte", "Outro"];

/** BMR por Mifflin-St Jeor. */
export function calculateBMR(p: { sex: Sex; age: number; weightKg: number; heightCm: number }) {
  if (!p.age || !p.weightKg || !p.heightCm) return 0;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age;
  return Math.round(base + (p.sex === "M" ? 5 : -161));
}

/** TDEE = BMR × fator de atividade (sem os exercícios registrados à parte). */
export function calculateTDEE(bmr: number, level: string) {
  const f = ACTIVITY_LEVELS[level as ActivityLevel]?.factor ?? 1.2;
  return Math.round(bmr * f);
}

type Kcal = { kcal: number | string | null };
const sum = (rows: Kcal[]) => rows.reduce((a, r) => a + (Number(r.kcal) || 0), 0);

export function calculateDailyCalories(meals: Kcal[]) {
  return Math.round(sum(meals));
}

export function calculateExerciseCalories(exercises: Kcal[]) {
  return Math.round(sum(exercises));
}

export type DayBreakdown = {
  tdee: number;
  exercise: number;
  /** Exercício que efetivamente entra no gasto (0 se o TDEE já inclui a atividade). */
  exerciseCounted: number;
  totalExpenditure: number;
  consumed: number;
  /** > 0 = déficit, < 0 = superávit. */
  balance: number;
};

/** Saldo = (TDEE + exercícios, se somados) − consumo. Exercício nunca é contado duas vezes. */
export function calculateDailyDeficit(p: {
  tdee: number;
  consumed: number;
  exercise: number;
  addExercise: boolean;
}): DayBreakdown {
  const exerciseCounted = p.addExercise ? p.exercise : 0;
  const totalExpenditure = p.tdee + exerciseCounted;
  return {
    tdee: p.tdee,
    exercise: p.exercise,
    exerciseCounted,
    totalExpenditure,
    consumed: p.consumed,
    balance: totalExpenditure - p.consumed,
  };
}

export function calculateWeeklyDeficit(days: DayBreakdown[]) {
  const n = days.length || 1;
  const consumed = days.reduce((a, d) => a + d.consumed, 0);
  const expenditure = days.reduce((a, d) => a + d.totalExpenditure, 0);
  const exercise = days.reduce((a, d) => a + d.exercise, 0);
  const balance = expenditure - consumed;
  return {
    consumed,
    expenditure,
    exercise,
    balance,
    avgBalance: Math.round(balance / n),
    avgConsumed: Math.round(consumed / n),
    avgExpenditure: Math.round(expenditure / n),
  };
}

/** Média móvel simples de N registros. */
export function movingAverage(values: number[], window = 7) {
  return values.map((_, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    return Math.round((slice.reduce((a, v) => a + v, 0) / slice.length) * 10) / 10;
  });
}

export const kcal = (n: number) => `${Math.round(n).toLocaleString("pt-BR")} kcal`;
