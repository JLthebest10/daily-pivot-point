import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useList, useRemove, useSave } from "@/lib/db";
import { MONTHS, money, toISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  EmptyState,
  ErrorNote,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";
import { BankConnections } from "@/components/finance/BankConnections";

export const Route = createFileRoute("/_authenticated/financas")({
  head: () => ({
    meta: [
      { title: "Finanças — Life Hub" },
      {
        name: "description",
        content: "Receitas, despesas, compras planejadas e reserva de emergência.",
      },
      { property: "og:title", content: "Finanças — Life Hub" },
      {
        property: "og:description",
        content: "Receitas, despesas, compras planejadas e reserva de emergência.",
      },
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
export type Purchase = {
  id: string;
  name: string;
  price: number;
  priority: string;
  saved: number;
  bought: boolean;
};
export type Saving = { id: string; name: string; target: number; current: number };

const EXPENSE_CATS = ["Moradia", "Alimentação", "Transporte", "Saúde", "Lazer", "Educação", "Outros"];
const INCOME_CATS = ["Salário", "Freelance", "Investimentos", "Outros"];
const PIE = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

type Tab = "resumo" | "lancamentos" | "compras" | "reserva";

function FinancePage() {
  const [tab, setTab] = useState<Tab>("resumo");
  const tx = useList<Transaction>("transactions", { order: { column: "date", ascending: false } });
  const purchases = useList<Purchase>("purchases", { order: { column: "created_at" } });
  const savings = useList<Saving>("savings", { order: { column: "created_at" } });

  const saveTx = useSave("transactions", "Lançamento salvo");
  const removeTx = useRemove("transactions", "Lançamento excluído");
  const savePurchase = useSave("purchases", "Compra salva");
  const removePurchase = useRemove("purchases", "Compra excluída");
  const saveSaving = useSave("savings", "Reserva salva");
  const removeSaving = useRemove("savings", "Reserva excluída");

  const [openTx, setOpenTx] = useState(false);
  const [openPurchase, setOpenPurchase] = useState(false);
  const [openSaving, setOpenSaving] = useState(false);

  const [txForm, setTxForm] = useState({
    type: "expense",
    description: "",
    amount: 0,
    category: "Alimentação",
    date: toISODate(),
  });
  const [pForm, setPForm] = useState({ name: "", price: 0, priority: "media", saved: 0 });
  const [sForm, setSForm] = useState({ name: "", target: 0, current: 0 });

  const rows = tx.data ?? [];
  const now = new Date();
  const monthRows = rows.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const income = monthRows.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const expense = monthRows
    .filter((r) => r.type === "expense")
    .reduce((a, r) => a + Number(r.amount), 0);
  const balance = income - expense;

  const byCategory = Object.entries(
    monthRows
      .filter((r) => r.type === "expense")
      .reduce<Record<string, number>>((acc, r) => {
        acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
        return acc;
      }, {}),
  ).map(([name, value]) => ({ name, value }));

  const trend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const inMonth = rows.filter((r) => {
      const rd = new Date(r.date);
      return rd.getMonth() === d.getMonth() && rd.getFullYear() === d.getFullYear();
    });
    return {
      mes: MONTHS[d.getMonth()]!.slice(0, 3),
      receitas: inMonth.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0),
      despesas: inMonth.filter((r) => r.type === "expense").reduce((a, r) => a + Number(r.amount), 0),
    };
  });

  return (
    <>
      <PageHeader
        title="Finanças"
        subtitle={`${MONTHS[now.getMonth()]} de ${now.getFullYear()}`}
        action={
          <Button onClick={() => setOpenTx(true)}>
            <Plus className="size-4" /> Lançamento
          </Button>
        }
      />

      <div className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ["resumo", "Resumo"],
            ["lancamentos", "Lançamentos"],
            ["compras", "Compras"],
            ["reserva", "Reserva"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-1.5 text-xs",
              tab === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <ErrorNote error={tx.error} />

      {tab === "resumo" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatCard label="Receitas" value={money(income)} />
            <StatCard label="Despesas" value={money(expense)} />
            <StatCard
              label="Saldo"
              value={money(balance)}
              tone={balance >= 0 ? "positive" : "negative"}
            />
          </div>

          <div className="surface p-4">
            <h2 className="text-sm font-medium">Receitas x despesas</h2>
            <div className="mt-4 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis width={44} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="receitas"
                    stroke="var(--color-chart-2)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="despesas"
                    stroke="var(--color-chart-1)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="surface p-4">
            <h2 className="text-sm font-medium">Gastos por categoria</h2>
            {byCategory.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sem despesas neste mês.</p>
            ) : (
              <div className="mt-2 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                      {byCategory.map((_, i) => (
                        <Cell key={i} fill={PIE[i % PIE.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip formatter={(v: number) => money(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

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
                  <p className="truncate text-sm">{r.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(r.date).toLocaleDateString("pt-BR")} · {r.category}
                  </p>
                </div>
                <span
                  className={cn(
                    "num text-sm font-medium",
                    r.type === "income" ? "text-[var(--color-positive)]" : "text-destructive",
                  )}
                >
                  {r.type === "income" ? "+" : "−"}
                  {money(Number(r.amount))}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => removeTx.mutate(r.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        ))}

      {tab === "compras" && (
        <div className="space-y-3">
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => setOpenPurchase(true)}>
                <Plus className="size-4" /> Adicionar
              </Button>
            }
          >
            Compras planejadas
          </SectionTitle>
          {(purchases.data ?? []).length === 0 ? (
            <EmptyState
              title="Nada planejado ainda."
              description="Liste o que deseja comprar e acompanhe quanto já juntou."
            />
          ) : (
            <ul className="space-y-2">
              {(purchases.data ?? []).map((p) => (
                <li key={p.id} className="surface px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="num text-xs text-muted-foreground">
                        {money(Number(p.saved))} de {money(Number(p.price))} · prioridade {p.priority}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => removePurchase.mutate(p.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Bar value={(Number(p.saved) / Math.max(1, Number(p.price))) * 100} />
                  </div>
                  <Input
                    type="number"
                    step="any"
                    aria-label="Valor guardado"
                    defaultValue={p.saved}
                    className="mt-3 h-9 w-36"
                    onBlur={(e) => savePurchase.mutate({ id: p.id, saved: Number(e.target.value) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "reserva" && (
        <div className="space-y-3">
          <SectionTitle
            action={
              <Button size="sm" variant="secondary" onClick={() => setOpenSaving(true)}>
                <Plus className="size-4" /> Adicionar
              </Button>
            }
          >
            Reservas
          </SectionTitle>
          {(savings.data ?? []).length === 0 ? (
            <EmptyState
              title="Nenhuma reserva criada."
              description="Crie uma reserva de emergência e acompanhe o progresso."
            />
          ) : (
            <ul className="space-y-2">
              {(savings.data ?? []).map((s) => (
                <li key={s.id} className="surface px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">{s.name}</p>
                      <p className="num text-xs text-muted-foreground">
                        {money(Number(s.current))} de {money(Number(s.target))}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => removeSaving.mutate(s.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                  <div className="mt-3">
                    <Bar value={(Number(s.current) / Math.max(1, Number(s.target))) * 100} />
                  </div>
                  <Input
                    type="number"
                    step="any"
                    aria-label="Valor atual"
                    defaultValue={s.current}
                    className="mt-3 h-9 w-36"
                    onBlur={(e) => saveSaving.mutate({ id: s.id, current: Number(e.target.value) })}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <FormModal open={openTx} onOpenChange={setOpenTx} title="Novo lançamento">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveTx.mutateAsync({
              type: txForm.type,
              description: txForm.description.trim(),
              amount: Number(txForm.amount),
              category: txForm.category,
              date: txForm.date,
            });
            setTxForm({ ...txForm, description: "", amount: 0 });
            setOpenTx(false);
          }}
        >
          <Field label="Tipo">
            <Select
              value={txForm.type}
              onValueChange={(v) =>
                setTxForm({
                  ...txForm,
                  type: v,
                  category: v === "income" ? "Salário" : "Alimentação",
                })
              }
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
            <Input
              value={txForm.description}
              onChange={(e) => setTxForm({ ...txForm, description: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor (R$)">
              <Input
                type="number"
                step="0.01"
                min={0}
                value={txForm.amount}
                onChange={(e) => setTxForm({ ...txForm, amount: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Data">
              <Input
                type="date"
                value={txForm.date}
                onChange={(e) => setTxForm({ ...txForm, date: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Categoria">
            <Select
              value={txForm.category}
              onValueChange={(v) => setTxForm({ ...txForm, category: v })}
            >
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

      <FormModal open={openPurchase} onOpenChange={setOpenPurchase} title="Compra planejada">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await savePurchase.mutateAsync({
              name: pForm.name.trim(),
              price: Number(pForm.price),
              priority: pForm.priority,
              saved: Number(pForm.saved),
              bought: false,
            });
            setPForm({ name: "", price: 0, priority: "media", saved: 0 });
            setOpenPurchase(false);
          }}
        >
          <Field label="Item">
            <Input
              value={pForm.name}
              onChange={(e) => setPForm({ ...pForm, name: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Preço (R$)">
              <Input
                type="number"
                step="0.01"
                value={pForm.price}
                onChange={(e) => setPForm({ ...pForm, price: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Já guardado (R$)">
              <Input
                type="number"
                step="0.01"
                value={pForm.saved}
                onChange={(e) => setPForm({ ...pForm, saved: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Prioridade">
            <Select value={pForm.priority} onValueChange={(v) => setPForm({ ...pForm, priority: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>

      <FormModal open={openSaving} onOpenChange={setOpenSaving} title="Nova reserva">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveSaving.mutateAsync({
              name: sForm.name.trim(),
              target: Number(sForm.target),
              current: Number(sForm.current),
            });
            setSForm({ name: "", target: 0, current: 0 });
            setOpenSaving(false);
          }}
        >
          <Field label="Nome">
            <Input
              value={sForm.name}
              onChange={(e) => setSForm({ ...sForm, name: e.target.value })}
              placeholder="Reserva de emergência"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta (R$)">
              <Input
                type="number"
                step="0.01"
                value={sForm.target}
                onChange={(e) => setSForm({ ...sForm, target: Number(e.target.value) })}
                required
              />
            </Field>
            <Field label="Atual (R$)">
              <Input
                type="number"
                step="0.01"
                value={sForm.current}
                onChange={(e) => setSForm({ ...sForm, current: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Button type="submit" className="w-full">
            Salvar
          </Button>
        </form>
      </FormModal>
    </>
  );
}
