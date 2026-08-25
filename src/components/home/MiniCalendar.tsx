import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek, toISODate, WEEKDAYS, shortDate, relativeDays } from "@/lib/format";
import { importanceOf } from "@/lib/importance";
import { holidaysOn } from "@/lib/holidays";

type Item = {
  id: string;
  title: string;
  date: string;
  time?: string | null;
  importance?: string | null;
};

export function MiniCalendar({ events, tasks }: { events: Item[]; tasks: Item[] }) {
  const today = toISODate();
  const days = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 21 }, (_, i) => addDays(start, i));
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, { dots: string[]; tasks: number }>();
    for (const e of events) {
      const c = m.get(e.date) ?? { dots: [], tasks: 0 };
      c.dots.push(importanceOf(e.importance).dot);
      m.set(e.date, c);
    }
    for (const t of tasks) {
      const c = m.get(t.date) ?? { dots: [], tasks: 0 };
      c.tasks += 1;
      m.set(t.date, c);
    }
    return m;
  }, [events, tasks]);

  const upcoming = useMemo(
    () =>
      [...events, ...tasks]
        .filter((e) => e.date >= today)
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
        .slice(0, 4),
    [events, tasks, today],
  );

  return (
    <div className="surface px-4 py-4">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const iso = toISODate(d);
          const marks = byDate.get(iso);
          const isToday = iso === today;
          return (
            <Link
              key={iso}
              to="/calendario"
              search={{ date: iso }}
              className={cn(
                "flex flex-col items-center rounded-lg py-1.5 text-xs transition-colors",
                isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                d.getMonth() !== new Date().getMonth() && !isToday && "text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "num",
                  holidaysOn(iso).length > 0 && !isToday && "text-destructive",
                )}
                title={holidaysOn(iso).map((h) => h.name).join(" · ")}
              >
                {d.getDate()}
              </span>
              <span className="mt-1 flex h-1 gap-0.5">
                {marks?.dots.slice(0, 3).map((dot, i) => (
                  <span
                    key={i}
                    className={cn("size-1 rounded-full", isToday ? "bg-primary-foreground" : dot)}
                  />
                ))}
                {marks?.tasks ? (
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      isToday ? "bg-primary-foreground/70" : "bg-muted-foreground",
                    )}
                  />
                ) : null}
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        {upcoming.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhum compromisso futuro.</p>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((e) => {
              const level = importanceOf(e.importance);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className={cn("size-1.5 shrink-0 rounded-full", level.dot)} />
                    <span className="truncate">{e.title}</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="text-foreground">{relativeDays(e.date)}</span>
                    <span className="num ml-1.5 text-muted-foreground">
                      {shortDate(e.date)}
                      {e.time ? ` · ${e.time}` : ""}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
