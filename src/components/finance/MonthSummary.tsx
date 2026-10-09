import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MONTHS, money } from "@/lib/format";
import { monthKey } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui-kit";

export type SummaryTx = { id: string; type: string; description: string; amount: number; category: string; date: string };

const PIE = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

/** Rows of a given "YYYY-MM" (date strings compared directly, avoiding timezone shifts). */
export function rowsInMonth<T extends { date: string }>(rows: T[], key: string) {
  return rows.filter((r) => r.date.slice(0, 7) === key);
}

export function MonthSummary({ rows }: { rows: SummaryTx[] }) {
  const now = new Date();
  const currentKey = monthKey(now.getFullYear(), now.getMonth());
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [selected, setSelected] = useState<string | null>(null);
  const key = monthKey(ym.y, ym.m);
  const isCurrent = key >= currentKey;

  const shift = (d: number) => {
    const dt = new Date(ym.y, ym.m + d, 1);
    if (monthKey(dt.getFullYear(), dt.getMonth()) > currentKey) return;
    setYm({ y: dt.getFullYear(), m: dt.getMonth() });
    setSelected(null);
  };

  const month = useMemo(() => rowsInMonth(rows, key), [rows, key]);
  const income = month.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const expenses = month.filter((r) => r.type !== "income");
  const expense = expenses.reduce((a, r) => a + Number(r.amount), 0);
  const balance = income - expense;

  const byCategory = useMemo(() => {
    const acc = new Map<string, number>();
    for (const r of expenses) acc.set(r.category, (acc.get(r.category) ?? 0) + Number(r.amount));
    return [...acc.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const trend = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(ym.y, ym.m - (5 - i), 1);
    const inMonth = rowsInMonth(rows, monthKey(d.getFullYear(), d.getMonth()));
    return {
      mes: MONTHS[d.getMonth()]!.slice(0, 3),
      receitas: inMonth.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0),
      despesas: inMonth.filter((r) => r.type !== "income").reduce((a, r) => a + Number(r.amount), 0),
    };
  });

  const selItems = selected
    ? expenses.filter((r) => r.category === selected).sort((a, b) => b.date.localeCompare(a.date))
    : [];
  const selTotal = selItems.reduce((a, r) => a + Number(r.amount), 0);
  const toggle = (name: string) => setSelected((s) => (s === name ? null : name));
  const pctOf = (v: number) => (expense > 0 ? (v / expense) * 100 : 0);

  return (
    <div className="space-y-4">
      <div className="surface flex items-center gap-2 px-2 py-2">
        <Button variant="ghost" size="icon" aria-label="Mês anterior" onClick={() => shift(-1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <label className="relative flex flex-1 cursor-pointer flex-col items-center">
          <span className="text-sm font-semibold capitalize">{MONTHS[ym.m]} de {ym.y}</span>
          <span className="text-[11px] text-muted-foreground">{isCurrent ? "Mês atual" : "Toque para escolher"}</span>
          <input
            type="month"
            aria-label="Escolher mês"
            className="absolute inset-0 opacity-0"
            value={key}
            max={currentKey}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-").map(Number);
              if (!y || !m || e.target.value > currentKey) return;
              setYm({ y, m: m - 1 });
              setSelected(null);
            }}
          />
        </label>
        <Button variant="ghost" size="icon" aria-label="Próximo mês" disabled={isCurrent} onClick={() => shift(1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <StatCard label="Receitas" value={money(income)} tone="positive" />
        <StatCard label="Despesas" value={money(expense)} tone="negative" />
        <StatCard label="Saldo do mês" value={money(balance)} tone={balance >= 0 ? "positive" : "negative"} />
      </div>

      <div className="surface p-4">
        <h2 className="text-sm font-medium">Gastos por categoria</h2>
        {byCategory.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem despesas em {MONTHS[ym.m]?.toLowerCase()}.</p>
        ) : (
          <>
            <div className="relative mt-2 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byCategory}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={62}
                    outerRadius={86}
                    paddingAngle={2}
                    stroke="none"
                    onClick={(d: { name?: string }) => d?.name && toggle(d.name)}
                    className="cursor-pointer outline-none"
                  >
                    {byCategory.map((c, i) => (
                      <Cell key={c.name} fill={PIE[i % PIE.length]} opacity={!selected || selected === c.name ? 1 : 0.3} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-muted-foreground">{selected ?? "Total"}</span>
                <span className="num text-base font-semibold">{money(selected ? selTotal : expense)}</span>
              </div>
            </div>
            <ul className="mt-2 divide-y divide-border">
              {byCategory.map((c, i) => (
                <li key={c.name}>
                  <button
                    type="button"
                    onClick={() => toggle(c.name)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-muted/50",
                      selected === c.name && "bg-muted/60",
                    )}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: PIE[i % PIE.length] }} />
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <span className="num text-xs text-muted-foreground">{pctOf(c.value).toFixed(1).replace(".", ",")}%</span>
                    <span className="num w-24 text-right text-sm font-medium">{money(c.value)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {selected && (
        <div className="surface animate-in fade-in-0 slide-in-from-top-1 p-4 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">{selected}</h3>
              <p className="num text-xs text-muted-foreground">
                {money(selTotal)} · {pctOf(selTotal).toFixed(1).replace(".", ",")}% das despesas
              </p>
            </div>
            <Button variant="ghost" size="icon" className="size-8" aria-label="Fechar detalhes" onClick={() => setSelected(null)}>
              <X className="size-4" />
            </Button>
          </div>
          {selItems.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Nenhum lançamento nesta categoria.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {selItems.map((r) => (
                <li key={r.id} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{r.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(`${r.date}T00:00:00`).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <span className="num text-sm font-medium text-destructive">−{money(Number(r.amount))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="surface p-4">
        <h2 className="text-sm font-medium">Receitas x despesas · 6 meses</h2>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis width={44} tickLine={false} axisLine={false} fontSize={11} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend />
              <Line type="monotone" dataKey="receitas" stroke="var(--color-chart-2)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="despesas" stroke="var(--color-chart-1)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
