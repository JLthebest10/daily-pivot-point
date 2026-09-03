import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { AlertTriangle, ChevronRight, Plus } from "lucide-react";
import { useList, useSave } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import {
  assessmentStatus,
  brl,
  lastAssessment,
  nextAssessmentISO,
  paymentStatus,
  type Assessment,
  type Payment,
  type Student,
} from "@/lib/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  EmptyState,
  ErrorNote,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
  StatCard,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alunos/")({
  head: () => ({
    meta: [
      { title: "Alunos — Life Hub" },
      {
        name: "description",
        content:
          "Gerencie seus alunos de personal: mensalidades, vencimentos e datas de avaliação física com aviso antecipado da reavaliação.",
      },
      { property: "og:title", content: "Alunos — Life Hub" },
      {
        property: "og:description",
        content: "Mensalidades, vencimentos e avaliações físicas dos seus alunos em um só lugar.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentsPage,
});

const EMPTY = {
  name: "",
  phone: "",
  plan: "",
  monthly_fee: "",
  due_day: "5",
  start_date: toISODate(),
  notes: "",
};

const TONE: Record<string, string> = {
  late: "bg-destructive/10 text-destructive",
  soon: "bg-primary/10 text-primary",
  ok: "bg-muted text-muted-foreground",
  none: "bg-muted text-muted-foreground",
};

function StudentsPage() {
  const students = useList<Student>("students", { order: { column: "name" } });
  const assessments = useList<Assessment>("student_assessments", {
    order: { column: "date", ascending: false },
  });
  const payments = useList<Payment>("student_payments", {
    order: { column: "date", ascending: false },
  });
  const save = useSave("students", "Aluno salvo");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const list = students.data ?? [];
  const active = list.filter((s) => s.active);
  const allAssessments = assessments.data ?? [];
  const allPayments = payments.data ?? [];

  const rows = active.map((s) => {
    const last = lastAssessment(allAssessments, s.id);
    const assess = assessmentStatus(nextAssessmentISO(last));
    const pay = paymentStatus(s, allPayments);
    return { student: s, last, assess, pay };
  });

  const alerts = rows.filter(
    (r) => r.assess.tone === "late" || r.assess.tone === "soon" || !r.pay.paid,
  );
  const monthly = active.reduce((a, s) => a + Number(s.monthly_fee), 0);
  const received = allPayments
    .filter((p) => p.date.slice(0, 7) === toISODate().slice(0, 7))
    .reduce((a, p) => a + Number(p.amount), 0);

  return (
    <>
      <PageHeader
        title="Alunos"
        subtitle="Mensalidades, vencimentos e avaliações físicas."
        action={
          <Button
            onClick={() => {
              setForm({ ...EMPTY, start_date: toISODate() });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Aluno
          </Button>
        }
      />

      <ErrorNote error={students.error} />

      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="Ativos" value={String(active.length)} />
        <StatCard label="Previsto/mês" value={brl(monthly)} />
        <StatCard label="Recebido no mês" value={brl(received)} tone="positive" />
      </div>

      {alerts.length > 0 && (
        <div className="surface mb-6 space-y-2 px-4 py-3.5">
          <p className="flex items-center gap-2 text-sm font-medium">
            <AlertTriangle className="size-4 text-primary" /> Precisa de atenção
          </p>
          {alerts.map((r) => (
            <Link
              key={r.student.id}
              to="/alunos/$id"
              params={{ id: r.student.id }}
              className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
            >
              <span className="truncate text-foreground">{r.student.name}</span>
              <span className="shrink-0">
                {r.assess.tone === "late" || r.assess.tone === "soon" ? r.assess.label : null}
                {(r.assess.tone === "late" || r.assess.tone === "soon") && !r.pay.paid ? " · " : ""}
                {!r.pay.paid ? r.pay.label : null}
              </span>
            </Link>
          ))}
        </div>
      )}

      {students.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nenhum aluno cadastrado."
          description="Cadastre seus alunos para acompanhar mensalidades e avaliações."
          actionLabel="Cadastrar aluno"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {rows.map(({ student: s, last, assess, pay }) => (
            <li key={s.id}>
              <Link
                to="/alunos/$id"
                params={{ id: s.id }}
                className="surface flex items-center gap-3 px-4 py-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="num mt-0.5 text-xs text-muted-foreground">
                    {brl(Number(s.monthly_fee))} · vence dia {s.due_day}
                    {last ? ` · última avaliação ${shortDate(last.date)}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        TONE[assess.tone],
                      )}
                    >
                      {assess.label}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-medium",
                        TONE[pay.tone],
                      )}
                    >
                      {pay.label}
                    </span>
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
          {list
            .filter((s) => !s.active)
            .map((s) => (
              <li key={s.id}>
                <Link
                  to="/alunos/$id"
                  params={{ id: s.id }}
                  className="surface flex items-center gap-3 px-4 py-3 opacity-60"
                >
                  <p className="flex-1 truncate text-sm">{s.name}</p>
                  <span className="text-xs text-muted-foreground">Inativo</span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo aluno">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!form.name.trim()) return;
            await save.mutateAsync({
              name: form.name.trim(),
              phone: form.phone || null,
              plan: form.plan || null,
              monthly_fee: Number(form.monthly_fee) || 0,
              due_day: Math.min(28, Math.max(1, Number(form.due_day) || 5)),
              start_date: form.start_date,
              notes: form.notes || null,
              active: true,
            });
            setForm(EMPTY);
            setOpen(false);
          }}
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome do aluno"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </Field>
            <Field label="Plano">
              <Input
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                placeholder="2x na semana"
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Mensalidade">
              <Input
                inputMode="decimal"
                value={form.monthly_fee}
                onChange={(e) => setForm({ ...form, monthly_fee: e.target.value })}
                placeholder="0,00"
              />
            </Field>
            <Field label="Dia venc.">
              <Input
                inputMode="numeric"
                value={form.due_day}
                onChange={(e) => setForm({ ...form, due_day: e.target.value })}
              />
            </Field>
            <Field label="Início">
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Objetivos, restrições, lesões..."
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar aluno
          </Button>
        </form>
      </FormModal>
    </>
  );
}
