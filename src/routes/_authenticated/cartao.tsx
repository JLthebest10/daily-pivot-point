import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarClock, CreditCard, Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EmptyState,
  ErrorNote,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui-kit";
import { money, toISODate } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  CARD_CATEGORIES,
  DEFAULT_CARD_SETTINGS,
  cycleFor,
  formatBR,
  fromCents,
  daysUntilISO,
  inCycle,
  shiftCycle,
  sumCents,
  toCents,
  type CardExpense,
  type CardSettings,
} from "@/lib/card";

export const Route = createFileRoute("/_authenticated/cartao")({
  head: () => ({
    meta: [
      { title: "Cartão Cinza — Life Hub" },
      {
        name: "description",
        content:
          "Registre os gastos do cartão e acompanhe o limite disponível do ciclo atual da fatura.",
      },
      { property: "og:title", content: "Cartão Cinza — Life Hub" },
      {
        property: "og:description",
        content: "Controle de limite, gastos e faturas do seu cartão no Life Hub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CardPage,
});

const emptyExpense = () => ({
  id: "",
  amount: "",
  description: "",
  date: toISODate(),
  category: "Outros",
});

function CardPage() {
  const settingsList = useList<CardSettings>("card_settings");
  const expenses = useList<CardExpense>("card_expenses", {
    order: { column: "date", ascending: false },
  });
  const saveSettings = useSave("card_settings", "Configurações salvas");
  const saveExpense = useSave("card_expenses");
  const removeExpense = useRemove("card_expenses", "Gasto excluído");

  const settings = settingsList.data?.[0];
  const limit = Number(settings?.credit_limit ?? DEFAULT_CARD_SETTINGS.credit_limit);
  const closingDay = settings?.closing_day ?? DEFAULT_CARD_SETTINGS.closing_day;
  const dueDay = settings?.due_day ?? DEFAULT_CARD_SETTINGS.due_day;

  const [offset, setOffset] = useState(0);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [form, setForm] = useState(emptyExpense);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [configOpen, setConfigOpen] = useState(false);
  const [config, setConfig] = useState({ limit: "", closing: "", due: "" });

  const current = useMemo(() => cycleFor(toISODate(), closingDay, dueDay), [closingDay, dueDay]);
  const cycle = useMemo(
    () => (offset === 0 ? current : shiftCycle(current, offset, closingDay, dueDay)),
    [current, offset, closingDay, dueDay],
  );

  const rows = expenses.data ?? [];
  const cycleRows = rows.filter((e) => inCycle(e.date, cycle));
  const spentCents = sumCents(cycleRows);
  const limitCents = toCents(limit);
  const availableCents = limitCents - spentCents;
  const usedPct = limitCents > 0 ? Math.min(100, (spentCents / limitCents) * 100) : 0;

  const daysToDue = daysUntilISO(current.due);
  const dueSoon = daysToDue >= 0 && daysToDue <= 5;

  function openNew() {
    setForm(emptyExpense());
    setExpenseOpen(true);
  }

  function openEdit(e: CardExpense) {
    setForm({
      id: e.id,
      amount: String(Number(e.amount)),
      description: e.description,
      date: e.date,
      category: e.category ?? "Outros",
    });
    setExpenseOpen(true);
  }

  async function submitExpense(ev: React.FormEvent) {
    ev.preventDefault();
    const amount = Number(String(form.amount).replace(",", "."));
    const description = form.description.trim();
    if (!description || !Number.isFinite(amount) || amount <= 0) return;
    const values: Record<string, unknown> = {
      amount: fromCents(toCents(amount)),
      description,
      date: form.date,
      category: form.category || null,
    };
    if (form.id) values['id'] = form.id;
    await saveExpense.mutateAsync(values);
    setExpenseOpen(false);
    setForm(emptyExpense());
  }

  function openConfig() {
    setConfig({ limit: String(limit), closing: String(closingDay), due: String(dueDay) });
    setConfigOpen(true);
  }

  async function submitConfig(ev: React.FormEvent) {
    ev.preventDefault();
    const nextLimit = Number(config.limit.replace(",", "."));
    const closing = Math.min(31, Math.max(1, Number(config.closing) || closingDay));
    const due = Math.min(31, Math.max(1, Number(config.due) || dueDay));
    if (!Number.isFinite(nextLimit) || nextLimit <= 0) return;
    const values: Record<string, unknown> = {
      credit_limit: fromCents(toCents(nextLimit)),
      closing_day: closing,
      due_day: due,
    };
    if (settings?.id) values['id'] = settings.id;
    await saveSettings.mutateAsync(values);
    setConfigOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Cartão Cinza"
        subtitle={`Ciclo ${formatBR(cycle.start)} — ${formatBR(cycle.end)}`}
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="icon" aria-label="Configurações do cartão" onClick={openConfig}>
              <Settings2 className="size-4" />
            </Button>
            <Button onClick={openNew}>
              <Plus className="size-4" /> Gasto
            </Button>
          </div>
        }
      />

      <ErrorNote error={expenses.error ?? settingsList.error} />

      <div className="surface mb-4 px-4 py-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <CreditCard className="size-4" /> Limite {money(limit)}
          </p>
          <p className="num text-sm font-semibold">{Math.round(usedPct)}%</p>
        </div>
        <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              usedPct >= 100 ? "bg-destructive" : usedPct >= 80 ? "bg-amber-500" : "bg-primary",
            )}
            style={{ width: `${usedPct}%` }}
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatCard label="Já gasto" value={money(fromCents(spentCents))} />
          <StatCard
            label="Disponível"
            value={money(fromCents(availableCents))}
            tone={availableCents < 0 ? "negative" : "positive"}
          />
        </div>
      </div>

      <div
        className={cn(
          "surface mb-6 flex items-center gap-3 px-4 py-3.5",
          dueSoon && "ring-2 ring-amber-500/60",
        )}
      >
        <CalendarClock className={cn("size-5", dueSoon ? "text-amber-500" : "text-muted-foreground")} />
        <div>
          <p className="text-xs text-muted-foreground">Próximo vencimento</p>
          <p className="num text-base font-semibold">{formatBR(current.due)}</p>
        </div>
        <p className="ml-auto text-xs text-muted-foreground">
          {daysToDue === 0
            ? "Vence hoje"
            : daysToDue > 0
              ? `Faltam ${daysToDue} dia(s)`
              : `Venceu há ${Math.abs(daysToDue)} dia(s)`}
        </p>
      </div>

      <SectionTitle
        action={
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setOffset((o) => o - 1)}>
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={offset >= 0}
              onClick={() => setOffset((o) => Math.min(0, o + 1))}
            >
              Próximo
            </Button>
          </div>
        }
      >
        {offset === 0 ? "Gastos do ciclo atual" : `Fatura ${cycle.label}`}
      </SectionTitle>

      {expenses.isLoading ? (
        <LoadingList />
      ) : cycleRows.length === 0 ? (
        <EmptyState
          title="Nenhum gasto neste ciclo."
          description="Registre um gasto para acompanhar o limite disponível."
          actionLabel="Adicionar gasto"
          onAction={openNew}
        />
      ) : (
        <ul className="space-y-2">
          {cycleRows.map((e) => (
            <li key={e.id} className="surface flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{e.description}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {formatBR(e.date)}
                  {e.category ? ` · ${e.category}` : ""}
                </p>
              </div>
              <p className="num text-sm font-semibold">{money(Number(e.amount))}</p>
              <Button variant="ghost" size="icon" aria-label="Editar gasto" onClick={() => openEdit(e)}>
                <Pencil className="size-4 text-muted-foreground" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Excluir gasto"
                onClick={() => setConfirmId(e.id)}
              >
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8">
        <SectionTitle>Histórico de faturas</SectionTitle>
        <ul className="space-y-2">
          {[1, 2, 3, 4, 5, 6].map((i) => {
            const past = shiftCycle(current, -i, closingDay, dueDay);
            const items = rows.filter((e) => inCycle(e.date, past));
            const total = sumCents(items);
            return (
              <li key={past.end}>
                <button
                  type="button"
                  onClick={() => setOffset(-i)}
                  className="surface flex w-full items-center gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">Fatura {past.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatBR(past.start)} — {formatBR(past.end)} · vence {formatBR(past.due)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="num text-sm font-semibold">{money(fromCents(total))}</p>
                    <p className="text-xs text-muted-foreground">
                      {items.length} gasto(s) · sobrou {money(fromCents(limitCents - total))}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <FormModal
        open={expenseOpen}
        onOpenChange={setExpenseOpen}
        title={form.id ? "Editar gasto" : "Novo gasto"}
      >
        <form onSubmit={submitExpense} className="space-y-3">
          <Field label="Valor (R$)">
            <Input
              autoFocus
              inputMode="decimal"
              placeholder="35,00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </Field>
          <Field label="Descrição">
            <Input
              placeholder="Almoço"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          <Field label="Data da compra">
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </Field>
          <Field label="Categoria">
            <Select
              value={form.category}
              onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                {CARD_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>

      <FormModal
        open={configOpen}
        onOpenChange={setConfigOpen}
        title="Configurações do cartão"
        description="Limite, fechamento e vencimento usados nos cálculos."
      >
        <form onSubmit={submitConfig} className="space-y-3">
          <Field label="Limite do cartão (R$)">
            <Input
              inputMode="decimal"
              value={config.limit}
              onChange={(e) => setConfig((c) => ({ ...c, limit: e.target.value }))}
            />
          </Field>
          <Field label="Dia de fechamento / virada">
            <Input
              inputMode="numeric"
              value={config.closing}
              onChange={(e) => setConfig((c) => ({ ...c, closing: e.target.value }))}
            />
          </Field>
          <Field label="Dia de vencimento">
            <Input
              inputMode="numeric"
              value={config.due}
              onChange={(e) => setConfig((c) => ({ ...c, due: e.target.value }))}
            />
          </Field>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>

      <AlertDialog open={confirmId !== null} onOpenChange={(v) => !v && setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gasto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita e o valor sairá do cálculo do ciclo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmId) removeExpense.mutate(confirmId);
                setConfirmId(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
