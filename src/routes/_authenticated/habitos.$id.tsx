import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useList } from "@/lib/db";
import type { Completion, Habit } from "@/lib/habits";
import { habitStats, isScheduled, monthlyRate, streaks } from "@/lib/habits";
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

type Range = "week" | "month" | "year";

function HabitDetail() {
  const { id } = Route.useParams();
  const [range, setRange] = useState<Range>("month");
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
  const days = range === "week" ? 7 : range === "month" ? 30 : 365;
  const stats = habitStats(habit, hc, addDays(now, -(days - 1)), now);
  const s = streaks(habit, hc);

  const thisMonth = monthlyRate(habit, hc, now.getFullYear(), now.getMonth());
  const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonth = monthlyRate(habit, hc, prevDate.getFullYear(), prevDate.getMonth());

  const chart = Array.from({ length: 6 }).map((_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const m = monthlyRate(habit, hc, d.getFullYear(), d.getMonth());
    return { mes: MONTHS[d.getMonth()]!.slice(0, 3), consistencia: Math.round(m.rate) };
  });

  const doneSet = new Set(hc.map((c) => c.date));
  const heatStart = addDays(now, -181);
  const cells: { iso: string; state: "done" | "missed" | "off" | "future" }[] = [];
  for (let d = new Date(heatStart); d <= addDays(now, 6); d = addDays(d, 1)) {
    const iso = toISODate(d);
    const future = iso > toISODate(now);
    cells.push({
      iso,
      state: doneSet.has(iso)
        ? "done"
        : !isScheduled(habit, d)
          ? "off"
          : future
            ? "future"
            : "missed",
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
        {(
          [
            ["week", "Semana"],
            ["month", "Mês"],
            ["year", "Ano"],
          ] as const
        ).map(([v, label]) => (
          <button
            key={v}
            onClick={() => setRange(v)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs transition-colors",
              range === v
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <StatCard label="Taxa de conclusão" value={`${Math.round(stats.rate)}%`} />
        <StatCard label="Sequência atual" value={`${s.current} dias`} />
        <StatCard label="Maior sequência" value={`${s.longest} dias`} />
        <StatCard label="Dias concluídos" value={String(stats.completed)} />
        <StatCard label="Dias perdidos" value={String(stats.missed)} />
        <StatCard label="Total histórico" value={String(s.total)} />
      </div>

      <div className="surface mt-4 p-4">
        <h2 className="text-sm font-medium">Calendário de consistência</h2>
        <div className="mt-3 flex gap-[3px] overflow-x-auto pb-1">
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, w) => (
            <div key={w} className="flex flex-col gap-[3px]">
              {cells.slice(w * 7, w * 7 + 7).map((c) => (
                <span
                  key={c.iso}
                  title={c.iso}
                  className={cn(
                    "size-3 rounded-[3px]",
                    c.state === "done" && "bg-primary",
                    c.state === "missed" && "bg-destructive/25",
                    c.state === "off" && "bg-muted",
                    c.state === "future" && "bg-muted/50",
                  )}
                />
              ))}
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {MONTHS[now.getMonth()]}: {thisMonth.completed} dias cumpridos ·{" "}
          {Math.round(thisMonth.rate)}% de consistência ({MONTHS[prevDate.getMonth()]}:{" "}
          {Math.round(prevMonth.rate)}%)
        </p>
      </div>

      <div className="surface mt-4 p-4">
        <h2 className="text-sm font-medium">Consistência por mês</h2>
        <div className="mt-4 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis width={32} tickLine={false} axisLine={false} fontSize={12} domain={[0, 100]} />
              <Tooltip formatter={(v) => `${v}%`} />
              <RBar dataKey="consistencia" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
            </BarChart>
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
