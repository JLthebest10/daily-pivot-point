import { daysUntil, toISODate } from "@/lib/format";

export type Student = {
  id: string;
  name: string;
  phone: string | null;
  plan: string | null;
  monthly_fee: number;
  due_day: number;
  start_date: string;
  active: boolean;
  notes: string | null;
};

export type Assessment = {
  id: string;
  student_id: string;
  date: string;
  next_date: string | null;
  weight_kg: number | null;
  body_fat: number | null;
  notes: string | null;
};

export type Payment = {
  id: string;
  student_id: string;
  amount: number;
  date: string;
  ref_month: string | null;
  method: string | null;
  note: string | null;
};

export const brl = (v: number) =>
  Number(v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Mês de referência atual no formato AAAA-MM. */
export function currentRefMonth(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function refMonthLabel(ref: string | null) {
  if (!ref) return "—";
  const [y, m] = ref.split("-").map(Number);
  if (!y || !m) return ref;
  return `${String(m).padStart(2, "0")}/${y}`;
}

/** Data do vencimento do mês corrente, respeitando meses curtos. */
export function dueDateISO(dueDay: number, d = new Date()) {
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const day = Math.min(Math.max(1, dueDay || 1), last);
  return toISODate(new Date(d.getFullYear(), d.getMonth(), day));
}

export function lastAssessment(list: Assessment[], studentId: string) {
  return list
    .filter((a) => a.student_id === studentId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0];
}

/** Próxima avaliação: usa a data informada ou 2 meses após a última. */
export function nextAssessmentISO(a?: Assessment) {
  if (!a) return null;
  if (a.next_date) return a.next_date;
  const [y, m, d] = a.date.split("-").map(Number);
  const dt = new Date(y!, (m ?? 1) - 1 + 2, d ?? 1);
  return toISODate(dt);
}

export type AssessmentStatus = {
  iso: string | null;
  days: number | null;
  tone: "late" | "soon" | "ok" | "none";
  label: string;
};

export function assessmentStatus(iso: string | null): AssessmentStatus {
  if (!iso) return { iso: null, days: null, tone: "none", label: "Sem avaliação" };
  const days = daysUntil(iso);
  if (days < 0) return { iso, days, tone: "late", label: `Atrasada há ${Math.abs(days)} dias` };
  if (days === 0) return { iso, days, tone: "soon", label: "Reavaliação hoje" };
  if (days <= 10)
    return { iso, days, tone: "soon", label: `Reavaliação em ${days} dia${days > 1 ? "s" : ""}` };
  return { iso, days, tone: "ok", label: `Reavaliação em ${days} dias` };
}

/** Situação do pagamento do mês corrente. */
export function paymentStatus(student: Student, payments: Payment[]) {
  const ref = currentRefMonth();
  const paid = payments.some(
    (p) => p.student_id === student.id && (p.ref_month === ref || p.date.startsWith(ref)),
  );
  const due = dueDateISO(student.due_day);
  const days = daysUntil(due);
  if (paid) return { paid: true, due, days, tone: "ok" as const, label: "Pago este mês" };
  if (days < 0)
    return {
      paid: false,
      due,
      days,
      tone: "late" as const,
      label: `Vencido há ${Math.abs(days)} dias`,
    };
  if (days <= 5)
    return {
      paid: false,
      due,
      days,
      tone: "soon" as const,
      label: days === 0 ? "Vence hoje" : `Vence em ${days} dia${days > 1 ? "s" : ""}`,
    };
  return { paid: false, due, days, tone: "ok" as const, label: `Vence dia ${student.due_day}` };
}
