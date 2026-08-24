import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HabitCheck } from "@/components/habits/HabitCheck";
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

export const Route = createFileRoute("/_authenticated/lojinha")({
  head: () => ({
    meta: [
      { title: "Devendo na lojinha — Life Hub" },
      {
        name: "description",
        content: "Registre o que você pegou na lojinha do condomínio e marque como pago.",
      },
      { property: "og:title", content: "Devendo na lojinha — Life Hub" },
      { property: "og:description", content: "Controle o que está pendente na lojinha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StorePage,
});

type Debt = {
  id: string;
  item: string;
  amount: number;
  date: string;
  note: string | null;
  paid: boolean;
};

const EMPTY = { item: "", amount: "", date: toISODate(), note: "" };
const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function StorePage() {
  const debts = useList<Debt>("store_debts", { order: { column: "date", ascending: false } });
  const save = useSave("store_debts", "Item salvo");
  const remove = useRemove("store_debts", "Item excluído");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const list = debts.data ?? [];
  const pending = list.filter((d) => !d.paid);
  const total = pending.reduce((a, d) => a + Number(d.amount), 0);
  const paidTotal = list.filter((d) => d.paid).reduce((a, d) => a + Number(d.amount), 0);

  return (
    <>
      <PageHeader
        title="Devendo na lojinha"
        subtitle="O que você pegou na lojinha do condomínio."
        action={
          <Button
            onClick={() => {
              setForm({ ...EMPTY, date: toISODate() });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Item
          </Button>
        }
      />

      <ErrorNote error={debts.error} />

      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="Em aberto" value={brl(total)} tone={total > 0 ? "negative" : "positive"} />
        <StatCard label="Já pago" value={brl(paidTotal)} />
      </div>

      {debts.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nada registrado."
          description="Adicione os itens que você pegou fiado na lojinha."
          actionLabel="Adicionar item"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((d) => (
            <li key={d.id} className="surface flex items-center gap-3 px-4 py-3.5">
              <HabitCheck
                checked={d.paid}
                label={d.item}
                onToggle={() =>
                  save.mutate({
                    id: d.id,
                    paid: !d.paid,
                    paid_at: d.paid ? null : new Date().toISOString(),
                  })
                }
              />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "truncate text-sm font-medium",
                    d.paid && "text-muted-foreground line-through",
                  )}
                >
                  {d.item}
                </p>
                <p className="num text-xs text-muted-foreground">
                  {shortDate(d.date)}
                  {d.note ? ` · ${d.note}` : ""}
                </p>
              </div>
              <span
                className={cn(
                  "num shrink-0 text-sm font-medium",
                  d.paid ? "text-muted-foreground" : "text-destructive",
                )}
              >
                {brl(Number(d.amount))}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir item"
                onClick={() => remove.mutate(d.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo item da lojinha">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({
              item: form.item.trim(),
              amount: Number(form.amount) || 0,
              date: form.date,
              note: form.note || null,
            });
            setForm(EMPTY);
            setOpen(false);
          }}
        >
          <Field label="Item">
            <Input
              value={form.item}
              onChange={(e) => setForm({ ...form, item: e.target.value })}
              placeholder="Refrigerante"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Observação">
            <Input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Opcional"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar item
          </Button>
        </form>
      </FormModal>
    </>
  );
}
