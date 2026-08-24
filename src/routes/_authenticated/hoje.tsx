import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, ChevronRight, Wallet } from "lucide-react";
import { useList, useSave } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { isScheduled, type Completion, type Habit } from "@/lib/habits";
import { HabitCheck, useToggleCompletion } from "@/components/habits/HabitCheck";
import { MiniCalendar } from "@/components/home/MiniCalendar";
import { QuickMoney } from "@/components/home/QuickMoney";
import { Bar, CircularProgress, EmptyState, LoadingList, PageHeader, SectionTitle } from "@/components/ui-kit";
import { useProfile } from "@/hooks/use-profile";

export const Route = createFileRoute("/_authenticated/hoje")({
  head: () => ({
    meta: [
      { title: "Hoje — Life Hub" },
      { name: "description", content: "Seu resumo do dia: hábitos, tarefas e compromissos." },
      { property: "og:title", content: "Hoje — Life Hub" },
      { property: "og:description", content: "Seu resumo do dia no Life Hub." },
    ],
  }),
  component: TodayPage,
});

type Task = { id: string; title: string; due_date: string | null; due_time: string | null; done: boolean };
type Event = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  importance: string;
};
type Tx = { id: string; amount: number; date: string; type?: string };

function TodayPage() {
  const today = toISODate();
  const { data: profile } = useProfile();
  const now = new Date();

  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions", { eq: { date: today } });
  const tasks = useList<Task>("tasks", { order: { column: "created_at" } });
  const events = useList<Event>("events", { order: { column: "date" } });

  const monthStart = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));
  const monthEnd = toISODate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const tx = useList<Tx>("transactions", { gte: ["date", monthStart], lte: ["date", monthEnd] });

  const toggle = useToggleCompletion();
  const saveTask = useSave("tasks");

  const todayHabits = useMemo(
    () => (habits.data ?? []).filter((h) => isScheduled(h, new Date())),
    [habits.data],
  );
  const doneToday = completions.data ?? [];

  const allTasks = tasks.data ?? [];
  const todayTasks = allTasks.filter((t) => t.due_date === today);
  const doneTasks = todayTasks.filter((t) => t.done);
  const todayEvents = (events.data ?? []).filter((e) => e.date === today);

  const habitsDone = doneToday.filter((c) => todayHabits.some((h) => h.id === c.habit_id)).length;
  const habitRate = todayHabits.length ? (habitsDone / todayHabits.length) * 100 : 0;

  const totalGoals = todayHabits.length + todayTasks.length;
  const completedGoals = habitsDone + doneTasks.length;
  const productivity = totalGoals ? (completedGoals / totalGoals) * 100 : 0;

  const rows = tx.data ?? [];
  const income = rows.filter((r) => r.type === "income").reduce((a, r) => a + Number(r.amount), 0);
  const expense = rows.filter((r) => r.type !== "income").reduce((a, r) => a + Number(r.amount), 0);

  return (
    <>
      <PageHeader
        title={`Olá, ${profile?.name || "você"}`}
        subtitle={now.toLocaleDateString("pt-BR", {
          weekday: "long",
          day: "2-digit",
          month: "long",
        })}
      />

      <Link
        to="/produtividade"
        className="surface flex items-center gap-5 px-4 py-5 transition-colors hover:bg-muted/40"
      >
        <CircularProgress value={productivity} label="do dia" />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-1 text-sm font-medium">
            Produtividade de hoje <ChevronRight className="size-3.5 text-muted-foreground" />
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {completedGoals} de {totalGoals || 0} objetivos concluídos
          </p>
          <div className="mt-4 space-y-2">
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Hábitos</span>
                <span className="num">
                  {habitsDone}/{todayHabits.length}
                </span>
              </div>
              <Bar value={habitRate} />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                <span>Tarefas</span>
                <span className="num">
                  {doneTasks.length}/{todayTasks.length}
                </span>
              </div>
              <Bar value={todayTasks.length ? (doneTasks.length / todayTasks.length) * 100 : 0} />
            </div>
          </div>
        </div>
      </Link>

      <section className="mt-8">
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> Seu dia
          </span>
        </SectionTitle>
        {todayEvents.length === 0 && todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada marcado para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {todayEvents.map((e) => (
              <li key={e.id} className="surface flex items-center gap-3 px-4 py-3.5">
                <span className="num w-12 shrink-0 text-xs text-muted-foreground">
                  {e.start_time ?? "—"}
                </span>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{e.title}</p>
              </li>
            ))}
            {todayTasks.map((t) => (
              <li key={t.id} className="surface flex items-center gap-3 px-4 py-3.5">
                <HabitCheck
                  checked={t.done}
                  label={t.title}
                  onToggle={() => saveTask.mutate({ id: t.id, done: !t.done })}
                />
                <span
                  className={
                    t.done
                      ? "min-w-0 flex-1 truncate text-sm text-muted-foreground line-through"
                      : "min-w-0 flex-1 truncate text-sm"
                  }
                >
                  {t.title}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>Próximas semanas</SectionTitle>
        <MiniCalendar
          events={(events.data ?? []).map((e) => ({
            id: e.id,
            title: e.title,
            date: e.date,
            time: e.start_time,
            importance: e.importance,
          }))}
          tasks={allTasks
            .filter((t) => t.due_date && !t.done)
            .map((t) => ({
              id: t.id,
              title: t.title,
              date: t.due_date!,
              time: t.due_time,
            }))}
        />
      </section>

      <section className="mt-8">
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Entrou / Saiu
          </span>
        </SectionTitle>
        <QuickMoney balance={income - expense} />
      </section>

      <section className="mt-8">
        <SectionTitle>Hábitos de hoje</SectionTitle>
        {habits.isLoading ? (
          <LoadingList rows={2} />
        ) : todayHabits.length === 0 ? (
          <EmptyState
            title="Nenhum hábito para hoje."
            description="Cadastre hábitos para acompanhar sua rotina."
          />
        ) : (
          <ul className="space-y-2">
            {todayHabits.map((h) => {
              const completion = doneToday.find((c) => c.habit_id === h.id);
              return (
                <li key={h.id} className="surface flex items-center gap-3 px-4 py-3.5">
                  <HabitCheck
                    checked={!!completion}
                    label={h.name}
                    onToggle={() =>
                      toggle.mutate({
                        habitId: h.id,
                        date: today,
                        ...(completion ? { completionId: completion.id } : {}),
                        value: h.target,
                      })
                    }
                  />
                  <Link to="/habitos/$id" params={{ id: h.id }} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{h.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {h.category}
                      {h.time ? ` · ${h.time}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
