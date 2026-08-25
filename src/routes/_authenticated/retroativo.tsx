import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useList, useSave } from "@/lib/db";
import { addDays, fromISODate, longDate, toISODate } from "@/lib/format";
import { isScheduled, type Completion, type Habit } from "@/lib/habits";
import { HabitCheck, useToggleCompletion } from "@/components/habits/HabitCheck";
import { CircularProgress, EmptyState, ErrorNote, PageHeader, SectionTitle } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/retroativo")({
  head: () => ({
    meta: [
      { title: "Marcar retroativo — Life Hub" },
      {
        name: "description",
        content: "Marque hábitos e tarefas de dias anteriores e atualize sua produtividade.",
      },
      { property: "og:title", content: "Marcar retroativo — Life Hub" },
      {
        property: "og:description",
        content: "Ajuste hábitos e tarefas de dias passados no Life Hub.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RetroPage,
});

type Task = { id: string; title: string; due_date: string | null; done: boolean; due_time: string | null };

function RetroPage() {
  const today = toISODate();
  const [date, setDate] = useState(() => toISODate(addDays(new Date(), -1)));
  const day = fromISODate(date);

  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions", { eq: { date } });
  const tasks = useList<Task>("tasks", { eq: { due_date: date } });

  const toggleHabit = useToggleCompletion();
  const saveTask = useSave("tasks");

  const scheduled = useMemo(
    () => (habits.data ?? []).filter((h) => isScheduled(h, day)),
    [habits.data, date],
  );
  const dayTasks = tasks.data ?? [];
  const doneHabits = scheduled.filter((h) =>
    (completions.data ?? []).some((c) => c.habit_id === h.id),
  ).length;
  const doneTasks = dayTasks.filter((t) => t.done).length;
  const total = scheduled.length + dayTasks.length;
  const value = total ? ((doneHabits + doneTasks) / total) * 100 : 0;

  function shift(n: number) {
    const next = toISODate(addDays(day, n));
    if (next > today) return;
    setDate(next);
  }

  return (
    <>
      <PageHeader title="Marcar retroativo" subtitle="Complete o que ficou para trás" />

      <section className="surface flex items-center justify-between gap-3 px-4 py-4">
        <Button size="icon" variant="ghost" onClick={() => shift(-1)} aria-label="Dia anterior">
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-sm font-medium capitalize">{longDate(day)}</p>
          <Input
            type="date"
            max={today}
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            className="mt-2"
          />
        </div>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => shift(1)}
          disabled={date >= today}
          aria-label="Próximo dia"
        >
          <ChevronRight className="size-4" />
        </Button>
      </section>

      <section className="surface mt-4 flex items-center gap-4 px-4 py-4">
        <CircularProgress value={value} />
        <div>
          <p className="text-sm font-medium">Produtividade do dia</p>
          <p className="text-sm text-muted-foreground">
            {doneHabits + doneTasks} de {total} objetivos concluídos
          </p>
        </div>
      </section>

      <ErrorNote error={habits.error ?? tasks.error ?? completions.error} />

      <section className="mt-6">
        <SectionTitle>Hábitos</SectionTitle>
        {scheduled.length === 0 ? (
          <EmptyState title="Nenhum hábito agendado nesse dia." />
        ) : (
          <ul className="space-y-2">
            {scheduled.map((h) => {
              const c = (completions.data ?? []).find((x) => x.habit_id === h.id);
              return (
                <li key={h.id} className="surface flex items-center gap-3 px-4 py-3">
                  <span className="text-lg">{h.icon}</span>
                  <span className={cn("flex-1 text-sm", c && "text-muted-foreground line-through")}>
                    {h.name}
                  </span>
                  <HabitCheck
                    checked={!!c}
                    label={h.name}
                    onToggle={() =>
                      toggleHabit.mutate(
                        c
                          ? { habitId: h.id, date, completionId: c.id, value: h.target }
                          : { habitId: h.id, date, value: h.target },
                      )
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-6">
        <SectionTitle>Tarefas</SectionTitle>
        {dayTasks.length === 0 ? (
          <EmptyState title="Nenhuma tarefa nesse dia." />
        ) : (
          <ul className="space-y-2">
            {dayTasks.map((t) => (
              <li key={t.id} className="surface flex items-center gap-3 px-4 py-3">
                <span className={cn("flex-1 text-sm", t.done && "text-muted-foreground line-through")}>
                  {t.title}
                </span>
                <HabitCheck
                  checked={t.done}
                  label={t.title}
                  onToggle={() => saveTask.mutate({ id: t.id, done: !t.done })}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
