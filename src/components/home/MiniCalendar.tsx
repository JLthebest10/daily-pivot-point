import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { addDays, startOfWeek, toISODate, WEEKDAYS, shortDate } from "@/lib/format";

type Item = { id: string; title: string; date: string; time?: string | null };

export function MiniCalendar({ events, tasks }: { events: Item[]; tasks: Item[] }) {
  const today = toISODate();
  const days = useMemo(() => {
    const start = startOfWeek(new Date());
    return Array.from({ length: 21 }, (_, i) => addDays(start, i));
  }, []);

  const byDate = useMemo(() => {
    const m = new Map<string, { events: number; tasks: number }>();
    for (const e of events) {
      const c = m.get(e.date) ?? { events: 0, tasks: 0 };
      c.events += 1;
      m.set(e.date, c);
    }
    for (const t of tasks) {
      const c = m.get(t.date) ?? { events: 0, tasks: 0 };
      c.tasks += 1;
      m.set(t.date, c);
    }
    return m;
  }, [events, tasks]);

  const upcoming = useMemo(
    () =>
      [...events]
        .filter((e) => e.date >= today)
        .sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))
        .slice(0, 3),
    [events, today],
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
              className={cn(
                "flex flex-col items-center rounded-lg py-1.5 text-xs transition-colors",
                isToday ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                d.getMonth() !== new Date().getMonth() && !isToday && "text-muted-foreground",
              )}
            >
              <span className="num">{d.getDate()}</span>
              <span className="mt-1 flex h-1 gap-0.5">
                {marks?.events ? (
                  <span
                    className={cn(
                      "size-1 rounded-full",
                      isToday ? "bg-primary-foreground" : "bg-primary",
                    )}
                  />
                ) : null}
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
          <ul className="space-y-1.5">
            {upcoming.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 text-xs">
                <span className="truncate">{e.title}</span>
                <span className="num shrink-0 text-muted-foreground">
                  {shortDate(e.date)}
                  {e.time ? ` · ${e.time}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
