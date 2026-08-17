import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { CalendarDays, ListTodo } from "lucide-react";
import { useList, useSave } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { habitStats, isScheduled, type Completion, type Habit } from "@/lib/habits";
import { HabitCheck, useToggleCompletion } from "@/components/habits/HabitCheck";
import { EmptyState, LoadingList, PageHeader, SectionTitle, StatCard } from "@/components/ui-kit";
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

function TodayPage() {
  const today = toISODate();
  const { data: profile } = useProfile();
  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions");
  const tasks = useList<Task>("tasks", { order: { column: "created_at" } });
  const events = useList<Event>("events", { eq: { date: today } });
  const toggle = useToggleCompletion();
  const saveTask = useSave("tasks");

  const now = new Date();
  const todayHabits = useMemo(
    () => (habits.data ?? []).filter((h) => isScheduled(h, now)),
    [habits.data],
  );
  const doneToday = (completions.data ?? []).filter((c) => c.date === today);
  const openTasks = (tasks.data ?? []).filter((t) => !t.done);

  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthRate = todayHabits.length
    ? Math.round(
        (habits.data ?? []).reduce(
          (acc, h) =>
            acc +
            habitStats(
              h,
              (completions.data ?? []).filter((c) => c.habit_id === h.id),
              from,
              now,
            ).rate,
          0,
        ) / Math.max(1, (habits.data ?? []).length),
      )
    : 0;

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

      <div className="grid grid-cols-3 gap-2">
        <StatCard
          label="Hábitos hoje"
          value={`${doneToday.filter((c) => todayHabits.some((h) => h.id === c.habit_id)).length}/${todayHabits.length}`}
        />
        <StatCard label="Tarefas abertas" value={String(openTasks.length)} />
        <StatCard label="Consistência" value={`${monthRate}%`} hint="no mês" />
      </div>

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
            <ListTodo className="size-3.5" /> Tarefas
          </span>
        </SectionTitle>
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tudo em dia.</p>
        ) : (
          <ul className="space-y-2">
            {openTasks.slice(0, 6).map((t) => (
              <li key={t.id} className="surface flex items-center gap-3 px-4 py-3.5">
                <HabitCheck
                  checked={false}
                  label={t.title}
                  onToggle={() => saveTask.mutate({ id: t.id, done: true })}
                />
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
