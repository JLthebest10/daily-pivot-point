import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useList } from "@/lib/db";
import type { Completion, Habit } from "@/lib/habits";
import { habitStartISO, habitStats, isScheduled, monthlyRate, streaks } from "@/lib/habits";
import { MONTHS, addDays, fromISODate, toISODate } from "@/lib/format";
import { EmptyState, LoadingList, StatCard } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/habitos/$id")({
  head: () => ({
    meta: [
      { title: "Análise do hábito — Life Hub" },
      { name: "description", content: "Sequências, consistência e histórico completo do hábito." },
      { property: "og:title", content: "Análise do hábito — Life Hub" },
      {
        property: "og:description",
        content: "Sequências, consistência e histórico completo do hábito.",
      },
    ],
  }),
  component: HabitDetail,
});

type Range = "1m" | "3m" | "6m" | "1y";

const RANGES: { value: Range; label: string; days: number }[] = [
  { value: "1m", label: "1 mês", days: 30 },
  { value: "3m", label: "3 meses", days: 90 },
  { value: "6m", label: "6 meses", days: 180 },
  { value: "1y", label: "1 ano", days: 365 },
];

function HabitDetail() {
  const { id } = Route.useParams();
  const [range, setRange] = useState<Range>("3m");
  const habits = useList<Habit>("habits", { eq: { id } });
  const completions = useList<Completion>("habit_completions", { eq: { habit_id: id } });
  const habit = habits.data?.[0];

  if (habits.isLoading) return <LoadingList rows={4} />;
  if (!habit)
    return (
      <EmptyState title="Hábito não encontrado." description="Ele pode ter sido excluído." />
    );

  const hc = completions.data ?? [];
  const now = new Date();
  const days = RANGES.find((r) => r.value === range)!.days;
  // dataInicial = maior entre (hoje - período) e (data de início do hábito)
  const periodStartISO = toISODate(addDays(now, -(days - 1)));
  const habitStart = habitStartISO(habit);
  const rangeStartISO = periodStartISO > habitStart ? periodStartISO : habitStart;
  const rangeStart = fromISODate(rangeStartISO);
  const stats = habitStats(habit, hc, rangeStart, now);
  const s = streaks(habit, hc);

  const thisMonth = monthlyRate(habit, hc, now.getFullYear(), now.getMonth());
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthlyRate(habit, hc, prevDate.getFullYear(), prevDate.getMonth());

  const doneSet = new Set(hc.map((c) => c.date));
  const todayISO = toISODate(now);

  // chart buckets: weekly for 1 month, monthly otherwise
  const chart =
    range === "1m"
      ? Array.from({ length: 5 }).map((_, i) => {
          const end = addDays(now, -(7 * (4 - i)));
          const start = addDays(end, -6);
          const m = habitStats(habit, hc, start, end);
          return {
            label: end.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            consistencia: Math.round(m.rate),
          };
        })
      : Array.from({ length: range === "3m" ? 3 : range === "6m" ? 6 : 12 }).map((_, i, arr) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (arr.length - 1 - i), 1);
          const m = monthlyRate(habit, hc, d.getFullYear(), d.getMonth());
          return { label: MONTHS[d.getMonth()]!.slice(0, 3), consistencia: Math.round(m.rate) };
        });

  // heatmap: left→right, top row first
  const cells: { iso: string; done: boolean; scheduled: boolean }[] = [];
  for (let iso = rangeStartISO; iso <= todayISO; iso = toISODate(addDays(fromISODate(iso), 1))) {
    cells.push({
      iso,
      done: doneSet.has(iso),
      scheduled: isScheduled(habit, fromISODate(iso)),
    });
  }

  return (
    <>
      <Link
        to="/habitos"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Hábitos
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">
        <span className="mr-2">{habit.icon}</span>
        {habit.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {habit.category}
        {habit.unit ? ` · meta ${habit.target} ${habit.unit}` : ""}
        {habit.time ? ` · ${habit.time}` : ""}
      </p>

      <div className="mt-6 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              range === r.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label="Taxa de conclusão" value={`${Math.round(stats.rate)}%`} />
        <StatCard label="Sequência atual" value={`${s.current} dias`} />
        <StatCard label="Maior sequência" value={`${s.longest} dias`} />
        <StatCard label="Dias concluídos" value={String(stats.completed)} />
        <StatCard label="Dias previstos" value={String(stats.scheduled)} />
        <StatCard label="Total histórico" value={String(s.total)} />
      </div>

      <div className="surface mt-4 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-medium">Calendário de consistência</h2>
          <span className="num text-xs text-muted-foreground">
            {stats.completed}/{stats.scheduled}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-[3px]">
          {cells.map((c) => (
            <span
              key={c.iso}
              title={`${fromISODate(c.iso).toLocaleDateString("pt-BR")} — ${c.done ? "concluído" : "não concluído"}`}
              className={cn(
                "size-3 rounded-[3px] transition-colors",
                c.done
                  ? "bg-primary shadow-[0_0_6px_-1px_var(--color-primary)]"
                  : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-muted" /> não marcado
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[3px] bg-primary" /> concluído
          </span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {MONTHS[now.getMonth()]}: {thisMonth.completed} dias cumpridos ·{" "}
          {Math.round(thisMonth.rate)}% de consistência ({MONTHS[prevDate.getMonth()]}:{" "}
          {Math.round(prevMonth.rate)}%)
        </p>
      </div>

      <div className="surface mt-4 p-4">
        <h2 className="text-sm font-medium">Consistência ao longo do tempo</h2>
        <div className="mt-4 h-52">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chart} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="consistencyFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 6" vertical={false} opacity={0.25} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                width={38}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.3 }}
                formatter={(v) => [`${v}%`, "Consistência"]}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--color-border)",
                  background: "var(--color-popover)",
                  color: "var(--color-popover-foreground)",
                  fontSize: 12,
                }}
              />
              <Area
                type="monotone"
                dataKey="consistencia"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#consistencyFill)"
                dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>


      <div className="surface mt-4 p-4">
        <h2 className="text-sm font-medium">Últimos registros</h2>
        {hc.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Nenhum registro ainda.</p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {[...hc]
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 10)
              .map((c) => (
                <li key={c.id} className="num flex justify-between text-sm">
                  <span>{fromISODate(c.date).toLocaleDateString("pt-BR")}</span>
                  <span className="text-muted-foreground">concluído</span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </>
  );
}
