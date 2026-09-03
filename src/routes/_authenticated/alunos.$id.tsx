import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import {
  assessmentStatus,
  brl,
  currentRefMonth,
  lastAssessment,
  nextAssessmentISO,
  paymentStatus,
  refMonthLabel,
  type Assessment,
  type Payment,
  type Student,
} from "@/lib/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ErrorNote,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/alunos/$id")({
  head: () => ({
    meta: [
      { title: "Ficha do aluno — Life Hub" },
      {
        name: "description",
        content:
          "Histórico de avaliações físicas, pagamentos e vencimentos de um aluno do personal.",
      },
      { property: "og:title", content: "Ficha do aluno — Life Hub" },
      {
        property: "og:description",
        content: "Avaliações físicas, próxima reavaliação e pagamentos do aluno.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StudentPage,
});

function plusMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return toISODate(new Date(y!, (m ?? 1) - 1 + n, d ?? 1));
}

function StudentPage() {
  const { id } = Route.useParams();
  const students = useList<Student>("students", { eq: { id } });
  const assessments = useList<Assessment>("student_assessments", {
    eq: { student_id: id },
    order: { column: "date", ascending: false },
  });
  const payments = useList<Payment>("student_payments", {
    eq: { student_id: id },
    order: { column: "date", ascending: false },
  });

  const saveStudent = useSave("students", "Aluno atualizado");
  const saveAssessment = useSave("student_assessments", "Avaliação registrada");
  const removeAssessment = useRemove("student_assessments", "Avaliação excluída");
  const savePayment = useSave("student_payments", "Pagamento registrado");
  const removePayment = useRemove("student_payments", "Pagamento excluído");

  const student = students.data?.[0];
  const aList = assessments.data ?? [];
  const pList = payments.data ?? [];

  const [aOpen, setAOpen] = useState(false);
  const [pOpen, setPOpen] = useState(false);
  const [aForm, setAForm] = useState({
    date: toISODate(),
    next_date: plusMonths(toISODate(), 2),
    weight_kg: "",
    body_fat: "",
    notes: "",
  });
  const [pForm, setPForm] = useState({
    amount: "",
    date: toISODate(),
    ref_month: currentRefMonth(),
    method: "",
    note: "",
  });

  if (students.isLoading) return <LoadingList rows={4} />;
  if (!student)
    return (
      <>
        <ErrorNote error={students.error} />
        <p className="text-sm text-muted-foreground">Aluno não encontrado.</p>
      </>
    );

  const last = lastAssessment(aList, student.id);
  const assess = assessmentStatus(nextAssessmentISO(last));
  const pay = paymentStatus(student, pList);

  return (
    <>
      <Link
        to="/alunos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Alunos
      </Link>

      <PageHeader
        title={student.name}
        subtitle={[student.plan, student.phone].filter(Boolean).join(" · ") || undefined}
      />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard
          label="Próxima avaliação"
          value={assess.iso ? shortDate(assess.iso) : "—"}
          hint={assess.label}
          tone={assess.tone === "late" ? "negative" : assess.tone === "soon" ? "positive" : undefined}
        />
        <StatCard
          label="Mensalidade"
          value={brl(Number(student.monthly_fee))}
          hint={pay.label}
          tone={pay.paid ? "positive" : pay.tone === "late" ? "negative" : undefined}
        />
      </div>

      <div className="surface mb-6 flex items-center justify-between px-4 py-3.5">
        <div>
          <p className="text-sm font-medium">Aluno ativo</p>
          <p className="text-xs text-muted-foreground">Desde {shortDate(student.start_date)}</p>
        </div>
        <Switch
          checked={student.active}
          onCheckedChange={(v) => saveStudent.mutate({ id: student.id, active: v })}
        />
      </div>

      {student.notes && (
        <p className="surface mb-6 px-4 py-3.5 text-sm text-muted-foreground">{student.notes}</p>
      )}

      <SectionTitle
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const today = toISODate();
              setAForm({
                date: today,
                next_date: plusMonths(today, 2),
                weight_kg: "",
                body_fat: "",
                notes: "",
              });
              setAOpen(true);
            }}
          >
            <Plus className="size-4" /> Avaliação
          </Button>
        }
      >
        Avaliações físicas
      </SectionTitle>

      {aList.length === 0 ? (
        <p className="surface mb-6 px-4 py-4 text-sm text-muted-foreground">
          Nenhuma avaliação registrada.
        </p>
      ) : (
        <ul className="mb-6 space-y-2">
          {aList.map((a) => (
            <li key={a.id} className="surface flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="num text-sm font-medium">{shortDate(a.date)}</p>
                <p className="num text-xs text-muted-foreground">
                  {[
                    a.weight_kg != null ? `${a.weight_kg} kg` : null,
                    a.body_fat != null ? `${a.body_fat}% gordura` : null,
                    a.next_date ? `próxima ${shortDate(a.next_date)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </p>
                {a.notes && <p className="mt-1 text-xs text-muted-foreground">{a.notes}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir avaliação"
                onClick={() => removeAssessment.mutate(a.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle
        action={
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setPForm({
                amount: String(student.monthly_fee ?? ""),
                date: toISODate(),
                ref_month: currentRefMonth(),
                method: "",
                note: "",
              });
              setPOpen(true);
            }}
          >
            <Plus className="size-4" /> Pagamento
          </Button>
        }
      >
        Pagamentos
      </SectionTitle>

      {pList.length === 0 ? (
        <p className="surface px-4 py-4 text-sm text-muted-foreground">
          Nenhum pagamento registrado.
        </p>
      ) : (
        <ul className="space-y-2">
          {pList.map((p) => (
            <li key={p.id} className="surface flex items-center gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="num text-sm font-medium">{brl(Number(p.amount))}</p>
                <p className="num text-xs text-muted-foreground">
                  {shortDate(p.date)} · ref. {refMonthLabel(p.ref_month)}
                  {p.method ? ` · ${p.method}` : ""}
                  {p.note ? ` · ${p.note}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir pagamento"
                onClick={() => removePayment.mutate(p.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FormModal open={aOpen} onOpenChange={setAOpen} title="Nova avaliação física">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveAssessment.mutateAsync({
              student_id: student.id,
              date: aForm.date,
              next_date: aForm.next_date || null,
              weight_kg: aForm.weight_kg ? Number(aForm.weight_kg) : null,
              body_fat: aForm.body_fat ? Number(aForm.body_fat) : null,
              notes: aForm.notes || null,
            });
            setAOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data da avaliação">
              <Input
                type="date"
                value={aForm.date}
                onChange={(e) =>
                  setAForm({
                    ...aForm,
                    date: e.target.value,
                    next_date: plusMonths(e.target.value, 2),
                  })
                }
              />
            </Field>
            <Field label="Próxima avaliação">
              <Input
                type="date"
                value={aForm.next_date}
                onChange={(e) => setAForm({ ...aForm, next_date: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg)">
              <Input
                inputMode="decimal"
                value={aForm.weight_kg}
                onChange={(e) => setAForm({ ...aForm, weight_kg: e.target.value })}
              />
            </Field>
            <Field label="% de gordura">
              <Input
                inputMode="decimal"
                value={aForm.body_fat}
                onChange={(e) => setAForm({ ...aForm, body_fat: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Observações">
            <Textarea
              value={aForm.notes}
              onChange={(e) => setAForm({ ...aForm, notes: e.target.value })}
              placeholder="Medidas, evolução, metas..."
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar avaliação
          </Button>
        </form>
      </FormModal>

      <FormModal open={pOpen} onOpenChange={setPOpen} title="Novo pagamento">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await savePayment.mutateAsync({
              student_id: student.id,
              amount: Number(pForm.amount) || 0,
              date: pForm.date,
              ref_month: pForm.ref_month || null,
              method: pForm.method || null,
              note: pForm.note || null,
            });
            setPOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <Input
                inputMode="decimal"
                value={pForm.amount}
                onChange={(e) => setPForm({ ...pForm, amount: e.target.value })}
              />
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={pForm.date}
                onChange={(e) => setPForm({ ...pForm, date: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mês de referência">
              <Input
                type="month"
                value={pForm.ref_month}
                onChange={(e) => setPForm({ ...pForm, ref_month: e.target.value })}
              />
            </Field>
            <Field label="Forma">
              <Input
                value={pForm.method}
                onChange={(e) => setPForm({ ...pForm, method: e.target.value })}
                placeholder="Pix, dinheiro..."
              />
            </Field>
          </div>
          <Field label="Observação">
            <Input
              value={pForm.note}
              onChange={(e) => setPForm({ ...pForm, note: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar pagamento
          </Button>
        </form>
      </FormModal>

      <div className={cn("h-6")} />
    </>
  );
}
