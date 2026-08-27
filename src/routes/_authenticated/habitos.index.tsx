import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import { useList, useRemove } from "@/lib/db";
import type { Completion, Habit } from "@/lib/habits";
import { habitStats, isScheduled } from "@/lib/habits";
import { addDays, toISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { HabitForm } from "@/components/habits/HabitForm";
import { HabitCheck, useToggleCompletion } from "@/components/habits/HabitCheck";
import {
  EmptyState,
  ErrorNote,
  LoadingList,
  PageHeader,
  Bar,
  DayTrack,
} from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/habitos/")({
  head: () => ({
    meta: [
      { title: "Hábitos — Life Hub" },
      { name: "description", content: "Crie, acompanhe e analise seus hábitos diários." },
      { property: "og:title", content: "Hábitos — Life Hub" },
      { property: "og:description", content: "Crie, acompanhe e analise seus hábitos diários." },
    ],
  }),
  component: HabitsPage,
});

function HabitsPage() {
  const today = toISODate();
  const habits = useList<Habit>("habits", { order: { column: "created_at" } });
  const completions = useList<Completion>("habit_completions", {
    gte: ["date", toISODate(addDays(new Date(), -60))],
  });
  const remove = useRemove("habits", "Hábito excluído");
  const toggle = useToggleCompletion();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);

  const list = (habits.data ?? []).filter((h) => !h.archived);
  const todayList = list.filter((h) => isScheduled(h, new Date()));
  const offToday = list.filter((h) => !isScheduled(h, new Date()));
  const doneToday = (completions.data ?? []).filter((c) => c.date === today);
  const doneCount = doneToday.filter((c) => todayList.some((h) => h.id === c.habit_id)).length;
  const dayRate = todayList.length ? (doneCount / todayList.length) * 100 : 0;
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13));

  function renderHabit(habit: Habit, muted = false) {
    const hc = (completions.data ?? []).filter((c) => c.habit_id === habit.id);
    const done = hc.find((c) => c.date === today);
    const stats = habitStats(habit, hc, addDays(new Date(), -29), new Date());
    return (
      <li
        key={habit.id}
        className={cn("surface flex items-center gap-3 px-4 py-3.5", muted && "opacity-60")}
      >
        {!muted ? (
          <HabitCheck
            checked={!!done}
            label={habit.name}
            onToggle={() =>
              toggle.mutate({
                habitId: habit.id,
                date: today,
                ...(done ? { completionId: done.id } : {}),
              })
            }
          />
        ) : (
          <span className="size-7 shrink-0" />
        )}
        <Link to="/habitos/$id" params={{ id: habit.id }} className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            <span className="mr-1.5">{habit.icon}</span>
            {habit.name}
          </p>
          <div className="mt-2 flex items-center gap-2">
            <Bar value={stats.rate} />
            <span className="num shrink-0 text-xs text-muted-foreground">
              {Math.round(stats.rate)}%
            </span>
          </div>
          <div className="mt-2">
            <DayTrack
              days={last14.map((d) => {
                const iso = toISODate(d);
                return {
                  date: iso,
                  done: hc.some((c) => c.date === iso),
                  scheduled: isScheduled(habit, d),
                  label: d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
                };
              })}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">últimos 14 dias</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Editar"
          onClick={() => {
            setEditing(habit);
            setOpen(true);
          }}
        >
          <Pencil className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Excluir"
          onClick={() => remove.mutate(habit.id)}
        >
          <Trash2 className="size-4 text-muted-foreground" />
        </Button>
      </li>
    );
  }

  return (
    <>
      <PageHeader
        title="Hábitos"
        subtitle="Constância acima de intensidade."
        action={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Novo
          </Button>
        }
      />

      <ErrorNote error={habits.error} />
      {todayList.length > 0 && (
        <section className="surface mb-6 px-4 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium">Progresso de hoje</p>
            <span className="num text-sm text-muted-foreground">
              {doneCount}/{todayList.length} · {Math.round(dayRate)}%
            </span>
          </div>
          <Bar value={dayRate} />
          <p className="mt-2 text-xs text-muted-foreground">
            Os hábitos reiniciam automaticamente todo dia.
          </p>
        </section>
      )}
      {habits.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState
          title="Você ainda não possui hábitos."
          description="Adicione seu primeiro hábito e comece a construir consistência."
          actionLabel="Adicionar hábito"
          onAction={() => {
            setEditing(null);
            setOpen(true);
          }}
        />
      ) : (
        <>
          {todayList.length === 0 ? (
            <EmptyState
              title="Nenhum hábito para hoje."
              description="Os hábitos aparecem aqui apenas nos dias em que devem ser marcados."
            />
          ) : (
            <ul className="space-y-2">{todayList.map((h) => renderHabit(h))}</ul>
          )}
          {offToday.length > 0 && (
            <details className="mt-6">
              <summary className="cursor-pointer text-xs text-muted-foreground">
                Não é dia hoje ({offToday.length})
              </summary>
              <ul className="mt-2 space-y-2">{offToday.map((h) => renderHabit(h, true))}</ul>
            </details>
          )}
        </>
      )}

      <HabitForm open={open} onOpenChange={setOpen} habit={editing} />
    </>
  );
}
