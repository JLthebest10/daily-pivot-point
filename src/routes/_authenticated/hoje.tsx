import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, ListTodo, Wallet } from "lucide-react";
import { useList, useSave } from "@/lib/db";
import { money, toISODate } from "@/lib/format";
import { isScheduled, type Completion, type Habit } from "@/lib/habits";
import { HabitCheck, useToggleCompletion } from "@/components/habits/HabitCheck";
import {
  Bar,
  CircularProgress,
  EmptyState,
  LoadingList,
  PageHeader,
  SectionTitle,
  StatCard,
} from "@/components/ui-kit";
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

type Task = { id: string; title: string; due_date: string | null; done: boolean };
type Event = { id: string; title: string; date: string; start_time: string | null };
type Tx = { id: string; amount: number; date: string; type?: string; kind?: string };

function TodayPage() {
  const today = toISODate();
  const { data: profile } = useProfile();
  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions", { eq: { date: today } });
  const tasks = useList<Task>("tasks", { order: { column: "created_at" } });
  const events = useList<Event>("events", { eq: { date: today } });
  const now = new Date();
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

  // Somente tarefas do dia (mesma data de hoje).
  const todayTasks = (tasks.data ?? []).filter((t) => t.due_date === today);
  const openTasks = todayTasks.filter((t) => !t.done);
  const doneTasks = todayTasks.filter((t) => t.done);

  const habitsDone = doneToday.filter((c) => todayHabits.some((h) => h.id === c.habit_id)).length;
  const habitRate = todayHabits.length ? (habitsDone / todayHabits.length) * 100 : 0;

  const totalGoals = todayHabits.length + todayTasks.length;
  const completedGoals = habitsDone + doneTasks.length;
  const productivity = totalGoals ? (completedGoals / totalGoals) * 100 : 0;

  const rows = tx.data ?? [];
  const kindOf = (r: Tx) => r.type ?? r.kind ?? "expense";
  const income = rows.filter((r) => kindOf(r) === "income").reduce((a, r) => a + Number(r.amount), 0);
  const expense = rows
    .filter((r) => kindOf(r) !== "income")
    .reduce((a, r) => a + Number(r.amount), 0);
  const spentToday = rows
    .filter((r) => r.date === today && kindOf(r) !== "income")
    .reduce((a, r) => a + Number(r.amount), 0);

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

      <section className="surface flex items-center gap-5 px-4 py-5">
        <CircularProgress value={productivity} label="do dia" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Produtividade de hoje</p>
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
      </section>

      <section className="mt-8">
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <Wallet className="size-3.5" /> Resumo financeiro do mês
          </span>
        </SectionTitle>
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="Entradas" value={money(income)} tone="positive" />
          <StatCard label="Saídas" value={money(expense)} tone="negative" />
          <StatCard
            label="Saldo"
            value={money(income - expense)}
            tone={income - expense >= 0 ? "positive" : "negative"}
            hint={`hoje: ${money(spentToday)}`}
          />
        </div>
        <Link to="/financas" className="mt-2 inline-block text-xs text-primary">
          Ver finanças
        </Link>
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

      <section className="mt-8">
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" /> Compromissos de hoje
          </span>
        </SectionTitle>
        {(events.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Nada marcado para hoje.</p>
        ) : (
          <ul className="space-y-2">
            {(events.data ?? []).map((e) => (
              <li key={e.id} className="surface px-4 py-3.5">
                <p className="text-sm font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.start_time ?? "Dia todo"}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <SectionTitle>
          <span className="inline-flex items-center gap-1.5">
            <ListTodo className="size-3.5" /> Tarefas de hoje
          </span>
        </SectionTitle>
        {todayTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma tarefa marcada para hoje.</p>
        ) : (
          <ul className="space-y-2">
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
    </>
  );
}
