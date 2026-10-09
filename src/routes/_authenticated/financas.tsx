import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useList, useRemove, useSave } from "@/lib/db";
import { money, toISODate } from "@/lib/format";
import { parseMoney } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader, SectionTitle, StatCard } from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { BankConnections } from "@/components/finance/BankConnections";
import { StatementImport } from "@/components/finance/StatementImport";
import { MoneyInput } from "@/components/finance/MoneyInput";
import { MonthSummary } from "@/components/finance/MonthSummary";
import {
  AddMoneyModal,
  GoalCard,
  GoalFormModal,
  removeFinancePhoto,
  type GoalFormValues,
  type GoalItem,
} from "@/components/finance/Goals";

export const Route = createFileRoute("/_authenticated/financas")({
  head: () => ({
    meta: [
      { title: "Finanças — Life Hub" },
      { name: "description", content: "Resumo mensal, lançamentos, compras planejadas e reservas." },
      { property: "og:title", content: "Finanças — Life Hub" },
      { property: "og:description", content: "Resumo mensal, lançamentos, compras planejadas e reservas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: FinancePage,
});

export type Transaction = {
  id: string;
  type: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  source?: string | null;
  payment_method?: string | null;
};
export type Saving = { id: string; name: string; target: number; current: number; photo_path: string | null };
export type FutureExpense = {
  id: string;
  name: string;
  amount: number;
  saved: number;
  target_date: string;
  note: string | null;
  done: boolean;
  photo_path: string | null;
};

const EXPENSE_CATS = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Outros"];
const INCOME_CATS = ["Salário", "Freelance", "Investimentos", "Outros"];

type Tab = "resumo" | "lancamentos" | "contas" | "compras" | "reserva";

const savingToGoal = (s: Saving): GoalItem => ({
  id: s.id,
  name: s.name,
  target: Number(s.target),
  saved: Number(s.current),
  photo_path: s.photo_path,
});
const futureToGoal = (f: FutureExpense): GoalItem => ({
  id: f.id,
  name: f.name,
  target: Number(f.amount),
  saved: Number(f.saved),
  photo_path: f.photo_path,
  date: f.target_date,
  note: f.note,
  done: f.done,
});

function FinancePage() {
  const [tab, setTab] = useState<Tab>("resumo");
  const tx = useList<Transaction>("transactions", { order: { column: "date", ascending: false } });
  const savings = useList<Saving>("savings", { order: { column: "created_at" } });
  const futures = useList<FutureExpense>("future_expenses", { order: { column: "target_date" } });

  const saveTx = useSave("transactions", "Lançamento salvo");
  const removeTx = useRemove("transactions", "Lançamento excluído");
  const saveSaving = useSave("savings", "Reserva salva");
  const removeSaving = useRemove("savings", "Reserva excluída");
  const saveFuture = useSave("future_expenses", "Compra salva");
  const removeFuture = useRemove("future_expenses", "Compra excluída");

  const [openTx, setOpenTx] = useState(false);
  const [txForm, setTxForm] = useState({ type: "expense", description: "", amount: "", category: "Alimentação", date: toISODate() });

  // goal modals (shared by Reserva and Compras)
  const [goalForm, setGoalForm] = useState<{ kind: "saving" | "future"; item: GoalItem | null } | null>(null);
  const [addMoney, setAddMoney] = useState<{ kind: "saving" | "future"; item: GoalItem } | null>(null);
  const [confirmDel, setConfirmDel] = useState<{ kind: "saving" | "future"; item: GoalItem } | null>(null);

  const rows = tx.data ?? [];
  const savingItems = (savings.data ?? []).map(savingToGoal);
  const futureItems = (futures.data ?? []).map(futureToGoal);

  async function submitGoal(v: GoalFormValues) {
    if (!goalForm) return;
    const id = goalForm.item?.id;
    if (goalForm.kind === "saving") {
      await saveSaving.mutateAsync({ ...(id ? { id } : {}), name: v.name, target: v.target, current: v.saved, photo_path: v.photo_path });
    } else {
      await saveFuture.mutateAsync({
        ...(id ? { id } : { done: false }),
        name: v.name,
        amount: v.target,
        saved: v.saved,
        target_date: v.date,
        note: v.note ?? null,
        photo_path: v.photo_path,
      });
    }
  }

  const pending = futureItems.filter((f) => !f.done);
  const totalNeeded = pending.reduce((a, f) => a + Math.max(0, f.target - f.saved), 0);
  const totalFutureSaved = pending.reduce((a, f) => a + f.saved, 0);
  const totalReserved = savingItems.reduce((a, s) => a + s.saved, 0);

  return (
    <>
      <PageHeader
        title="Finanças"
        subtitle="Seu dinheiro, mês a mês"
        action={
          <Button onClick={() => setOpenTx(true)}>
            <Plus className="size-4" /> Lançamento
          </Button>
        }
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(
          [
            ["resumo", "Resumo"],
            ["lancamentos", "Lançamentos"],
            ["compras", "Compras"],
            ["reserva", "Reserva"],
            ["contas", "Contas"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              tab === v ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorNote error={tx.error} />

      {tab === "resumo" && (tx.isLoading ? <LoadingList /> : <MonthSummary rows={rows} />)}

      {tab === "lancamentos" &&
        (tx.isLoading ? (
          <LoadingList />
        ) : rows.length === 0 ? (
          <EmptyState
            title="Nenhum lançamento registrado."
            description="Adicione receitas e despesas para ver seu fluxo."
            actionLabel="Novo lançamento"
            onAction={() => setOpenTx(true)}
          />
        ) : (
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id} className="surface flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm">
                    <span className="truncate">{r.description}</span>
                    {r.source && r.source !== "manual" && (
                      <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        importado
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR")} · {r.category}
                    {r.payment_method ? ` · ${r.payment_method}` : ""}
                  </p>
                </div>
                <span className={cn("num text-sm font-medium", r.type === "income" ? "text-[var(--color-positive)]" : "text-destructive")}>
                  {r.type === "income" ? "+" : "−"}
                  {money(Number(r.amount))}
                </span>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => removeTx.mutate(r.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        ))}

      {tab === "contas" && (
        <div className="space-y-6">
          <BankConnections />
          <StatementImport />
        </div>
      )}

      {tab === "compras" && (
        <div className="space-y-3">
          <ErrorNote error={futures.error} />
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Falta economizar" value={money(totalNeeded)} tone="negative" />
            <StatCard label="Já guardado" value={money(totalFutureSaved)} tone="positive" />
          </div>
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => setGoalForm({ kind: "future", item: null })}>
                <Plus className="size-4" /> Adicionar
              </Button>
            }
          >
            Compras planejadas
          </SectionTitle>
          {futures.isLoading ? (
            <LoadingList />
          ) : futureItems.length === 0 ? (
            <EmptyState
              title="Nenhuma compra planejada."
              description="Cadastre o que quer comprar, o preço e a data para se organizar."
              actionLabel="Planejar compra"
              onAction={() => setGoalForm({ kind: "future", item: null })}
            />
          ) : (
            <ul className="space-y-2">
              {[...futureItems].sort((a, b) => Number(a.done) - Number(b.done)).map((f) => (
                <GoalCard
                  key={f.id}
                  item={f}
                  onEdit={() => setGoalForm({ kind: "future", item: f })}
                  onDelete={() => setConfirmDel({ kind: "future", item: f })}
                  onAddMoney={() => setAddMoney({ kind: "future", item: f })}
                  onToggleDone={() => saveFuture.mutate({ id: f.id, done: !f.done })}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "reserva" && (
        <div className="space-y-3">
          <ErrorNote error={savings.error} />
          <StatCard label="Total reservado" value={money(totalReserved)} tone="positive" />
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => setGoalForm({ kind: "saving", item: null })}>
                <Plus className="size-4" /> Adicionar
              </Button>
            }
          >
            Reservas
          </SectionTitle>
          {savings.isLoading ? (
            <LoadingList />
          ) : savingItems.length === 0 ? (
            <EmptyState
              title="Nenhuma reserva criada."
              description="Crie um objetivo, como “Tênis novo”, e acompanhe quanto já guardou."
              actionLabel="Criar reserva"
              onAction={() => setGoalForm({ kind: "saving", item: null })}
            />
          ) : (
            <ul className="space-y-2">
              {savingItems.map((s) => (
                <GoalCard
                  key={s.id}
                  item={s}
                  onEdit={() => setGoalForm({ kind: "saving", item: s })}
                  onDelete={() => setConfirmDel({ kind: "saving", item: s })}
                  onAddMoney={() => setAddMoney({ kind: "saving", item: s })}
                />
              ))}
            </ul>
          )}
        </div>
      )}

      <GoalFormModal
        open={!!goalForm}
        onOpenChange={(v) => !v && setGoalForm(null)}
        title={
          goalForm?.kind === "future"
            ? goalForm.item ? "Editar compra" : "Nova compra"
            : goalForm?.item ? "Editar reserva" : "Nova reserva"
        }
        initial={goalForm?.item ?? null}
        withDate={goalForm?.kind === "future"}
        targetLabel={goalForm?.kind === "future" ? "Preço" : "Meta"}
        onSubmit={submitGoal}
      />

      <AddMoneyModal
        item={addMoney?.item ?? null}
        onOpenChange={(v) => !v && setAddMoney(null)}
        onSubmit={async (next) => {
          if (!addMoney) return;
          if (addMoney.kind === "saving") await saveSaving.mutateAsync({ id: addMoney.item.id, current: next });
          else await saveFuture.mutateAsync({ id: addMoney.item.id, saved: next });
        }}
      />

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{confirmDel?.item.name}”?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDel) return;
                const { kind, item } = confirmDel;
                setConfirmDel(null);
                if (kind === "saving") await removeSaving.mutateAsync(item.id);
                else await removeFuture.mutateAsync(item.id);
                await removeFinancePhoto(item.photo_path);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FormModal open={openTx} onOpenChange={setOpenTx} title="Novo lançamento">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const amount = parseMoney(txForm.amount);
            if (amount === null || amount <= 0) {
              toast.error("Informe um valor maior que zero.");
              return;
            }
            await saveTx.mutateAsync({
              type: txForm.type,
              description: txForm.description.trim(),
              amount,
              category: txForm.category,
              date: txForm.date,
            });
            setTxForm({ ...txForm, description: "", amount: "" });
            setOpenTx(false);
          }}
        >
          <Field label="Tipo">
            <Select
              value={txForm.type}
              onValueChange={(v) => setTxForm({ ...txForm, type: v, category: v === "income" ? "Salário" : "Alimentação" })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Despesa</SelectItem>
                <SelectItem value="income">Receita</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição">
            <Input value={txForm.description} onChange={(e) => setTxForm({ ...txForm, description: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <MoneyInput value={txForm.amount} onChange={(v) => setTxForm({ ...txForm, amount: v })} required />
            </Field>
            <Field label="Data">
              <Input type="date" value={txForm.date} onChange={(e) => setTxForm({ ...txForm, date: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <Select value={txForm.category} onValueChange={(v) => setTxForm({ ...txForm, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(txForm.type === "income" ? INCOME_CATS : EXPENSE_CATS).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full" disabled={saveTx.isPending}>
            Salvar
          </Button>
        </form>
      </FormModal>
    </>
  );
}
