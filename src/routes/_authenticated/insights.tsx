import { createFileRoute } from "@tanstack/react-router";
import { useList } from "@/lib/db";
import { money, toISODate, startOfMonth } from "@/lib/format";
import { habitStats, type Completion, type Habit } from "@/lib/habits";
import { PageHeader, SectionTitle, StatCard, Bar } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/insights")({
  head: () => ({
    meta: [
      { title: "Insights — Life Hub" },
      { name: "description", content: "Panorama do mês: hábitos, treinos, tarefas e finanças." },
      { property: "og:title", content: "Insights — Life Hub" },
      { property: "og:description", content: "Seu desempenho do mês no Life Hub." },
    ],
  }),
  component: InsightsPage,
});

type Transaction = { id: string; type: string; amount: number; date: string };
type Session = { id: string; date: string };
type Task = { id: string; done: boolean };

function InsightsPage() {
  const now = new Date();
  const from = startOfMonth(now);
  const fromISO = toISODate(from);

  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions");
  const sessions = useList<Session>("workout_sessions", { gte: ["date", fromISO] });
  const tasks = useList<Task>("tasks");
  const transactions = useList<Transaction>("transactions", { gte: ["date", fromISO] });

  const perHabit = (habits.data ?? []).map((h) => ({
    habit: h,
    stats: habitStats(
      h,
      (completions.data ?? []).filter((c) => c.habit_id === h.id),
      from,
      now,
    ),
  }));
  const avgRate = perHabit.length
    ? Math.round(perHabit.reduce((a, p) => a + p.stats.rate, 0) / perHabit.length)
    : 0;

  const income = (transactions.data ?? [])
    .filter((t) => t.type === "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const expense = (transactions.data ?? [])
    .filter((t) => t.type !== "income")
    .reduce((a, t) => a + Number(t.amount), 0);
  const doneTasks = (tasks.data ?? []).filter((t) => t.done).length;

  return (
    <>
      <PageHeader title="Insights" subtitle="Como está o seu mês" />

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Consistência" value={`${avgRate}%`} hint="hábitos do mês" />
        <StatCard label="Treinos" value={String((sessions.data ?? []).length)} hint="no mês" />
        <StatCard label="Tarefas feitas" value={String(doneTasks)} />
        <StatCard
          label="Saldo"
          value={money(income - expense)}
          tone={income - expense >= 0 ? "positive" : "negative"}
        />
      </div>

      <section className="mt-8">
        <SectionTitle>Hábitos por consistência</SectionTitle>
        {perHabit.length === 0 ? (
          <p className="text-sm text-muted-foreground">Cadastre hábitos para ver seus insights.</p>
        ) : (
          <ul className="space-y-3">
            {perHabit
              .sort((a, b) => b.stats.rate - a.stats.rate)
              .map(({ habit, stats }) => (
                <li key={habit.id} className="surface px-4 py-3.5">
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="truncate font-medium">{habit.name}</span>
                    <span className="num text-muted-foreground">{Math.round(stats.rate)}%</span>
                  </div>
                  <Bar value={stats.rate} />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {stats.completed} de {stats.scheduled} dias previstos
                  </p>
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  );
}
