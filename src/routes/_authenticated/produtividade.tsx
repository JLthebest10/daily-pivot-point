import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useList } from "@/lib/db";
import { MONTHS, WEEKDAYS, toISODate } from "@/lib/format";
import { isScheduled, type Completion, type Habit } from "@/lib/habits";
import { PageHeader, StatCard } from "@/components/ui-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/produtividade")({
  head: () => ({
    meta: [
      { title: "Histórico de produtividade — Life Hub" },
      {
        name: "description",
        content: "Veja sua produtividade diária em anéis, mês a mês, no Life Hub.",
      },
      { property: "og:title", content: "Histórico de produtividade — Life Hub" },
      { property: "og:description", content: "Seus anéis de produtividade diária no Life Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProductivityPage,
});

type Task = { id: string; title: string; due_date: string | null; done: boolean };

function Ring({ value, day, muted }: { value: number; day: number; muted: boolean }) {
  const size = 46;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(100, Math.max(0, value));
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        {!muted && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            className="stroke-primary"
            strokeDasharray={c}
            strokeDashoffset={c - (c * v) / 100}
          />
        )}
      </svg>
      <span className="absolute flex flex-col items-center leading-none">
        <span
          className={cn(
            "num text-[11px] font-semibold",
            muted ? "text-muted-foreground/50" : "text-foreground",
          )}
        >
          {muted ? "–" : `${Math.round(value)}%`}
        </span>
        <span className="num mt-0.5 text-[9px] text-muted-foreground">{day}</span>
      </span>
    </span>
  );
}

function ProductivityPage() {
  const now = new Date();
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState<string | null>(null);

  const from = toISODate(new Date(cursor.getFullYear(), cursor.getMonth(), 1));
  const to = toISODate(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0));

  const habits = useList<Habit>("habits", { eq: { archived: false } });
  const completions = useList<Completion>("habit_completions", {
    gte: ["date", from],
    lte: ["date", to],
  });
  const tasks = useList<Task>("tasks", { gte: ["due_date", from], lte: ["due_date", to] });

  const days = useMemo(() => {
    const last = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1));
  }, [cursor]);

  const stats = useMemo(() => {
    const hs = habits.data ?? [];
    const cs = completions.data ?? [];
    const ts = tasks.data ?? [];
    const today = toISODate();
    const map = new Map<string, { total: number; done: number; habits: number; tasks: number }>();
    for (const d of days) {
      const iso = toISODate(d);
      if (iso > today) continue;
      const scheduled = hs.filter((h) => isScheduled(h, d));
      const doneHabits = cs.filter(
        (c) => c.date === iso && scheduled.some((h) => h.id === c.habit_id),
      ).length;
      const dayTasks = ts.filter((t) => t.due_date === iso);
      const doneTasks = dayTasks.filter((t) => t.done).length;
      map.set(iso, {
        total: scheduled.length + dayTasks.length,
        done: doneHabits + doneTasks,
        habits: doneHabits,
        tasks: doneTasks,
      });
    }
    return map;
  }, [habits.data, completions.data, tasks.data, days]);

  const withData = [...stats.values()].filter((s) => s.total > 0);
  const average = withData.length
    ? withData.reduce((a, s) => a + (s.done / s.total) * 100, 0) / withData.length
    : 0;
  const perfect = withData.filter((s) => s.done === s.total).length;

  const firstWeekday = new Date(cursor.getFullYear(), cursor.getMonth(), 1).getDay();
  const detail = selected ? stats.get(selected) : undefined;

  return (
    <>
      <PageHeader
        title="Produtividade"
        subtitle="Seu histórico diário, dia a dia"
        action={
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Média do mês" value={`${Math.round(average)}%`} tone="positive" />
        <StatCard label="Dias em 100%" value={String(perfect)} />
      </div>

      <section className="surface mt-6 px-4 py-4">
        <p className="mb-3 text-sm font-medium">
          {MONTHS[cursor.getMonth()]} de {cursor.getFullYear()}
        </p>
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <span key={w}>{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 place-items-center gap-y-2">
          {Array.from({ length: firstWeekday }).map((_, i) => (
            <span key={`b${i}`} />
          ))}
          {days.map((d) => {
            const iso = toISODate(d);
            const s = stats.get(iso);
            const value = s && s.total ? (s.done / s.total) * 100 : 0;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setSelected(iso)}
                className={cn(
                  "rounded-full p-0.5",
                  selected === iso && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                <Ring value={value} day={d.getDate()} muted={!s || s.total === 0} />
              </button>
            );
          })}
        </div>
      </section>

      {selected && (
        <section className="surface mt-4 px-4 py-4">
          <p className="text-sm font-medium">
            {new Date(selected + "T00:00:00").toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
            })}
          </p>
          {!detail || detail.total === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">Sem objetivos registrados nesse dia.</p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              {detail.done} de {detail.total} objetivos concluídos · {detail.habits} hábitos ·{" "}
              {detail.tasks} tarefas
            </p>
          )}
        </section>
      )}
    </>
  );
}
