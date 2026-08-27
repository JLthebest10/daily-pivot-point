import { addDays, fromISODate, toISODate } from "@/lib/format";

export type Habit = {
  id: string;
  name: string;
  icon: string;
  category: string;
  color: string;
  days: number[];
  time: string | null;
  target: number;
  unit: string | null;
  note: string | null;
  archived: boolean;
  schedule_type?: string | null;
  interval_days?: number | null;
  anchor_date?: string | null;
  created_at?: string | null;
};

/** First day this habit exists: creation date (or interval anchor, whichever is earlier). */
export function habitStartISO(habit: Habit) {
  const created = habit.created_at ? habit.created_at.slice(0, 10) : null;
  const anchor = habit.schedule_type === "interval" ? (habit.anchor_date ?? null) : null;
  if (created && anchor) return created < anchor ? created : anchor;
  return created ?? anchor ?? toISODate();
}

export type Completion = { id: string; habit_id: string; date: string; value: number };

export function isScheduled(habit: Habit, date: Date) {
  if (habit.schedule_type === "interval") {
    const step = Math.max(1, Number(habit.interval_days) || 2);
    const anchor = habit.anchor_date ?? toISODate();
    const iso = toISODate(date);
    if (iso < anchor) return false;
    const diff = Math.round(
      (fromISODate(iso).getTime() - fromISODate(anchor).getTime()) / 86_400_000,
    );
    return diff % step === 0;
  }
  return habit.days.includes(date.getDay());
}


export function scheduledDatesBetween(habit: Habit, from: Date, to: Date) {
  const out: string[] = [];
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
    if (isScheduled(habit, d)) out.push(toISODate(d));
  }
  return out;
}

export function habitStats(habit: Habit, completions: Completion[], from: Date, to: Date) {
  const done = new Set(completions.map((c) => c.date));
  const start = habitStartISO(habit);
  const clampedFrom = toISODate(from) < start ? fromISODate(start) : from;
  const scheduled = scheduledDatesBetween(habit, clampedFrom, to);
  const today = toISODate();
  const past = scheduled.filter((d) => d <= today);
  const completed = past.filter((d) => done.has(d));
  const missed = past.length - completed.length;
  const rate = past.length ? (completed.length / past.length) * 100 : 0;
  return { scheduled: past.length, completed: completed.length, missed, rate };
}

/** Current and longest streak counted over scheduled days only. */
export function streaks(habit: Habit, completions: Completion[]) {
  const done = new Set(completions.map((c) => c.date));
  const start = completions.length
    ? new Date(Math.min(...completions.map((c) => new Date(c.date + "T00:00:00").getTime())))
    : new Date();
  const days = scheduledDatesBetween(habit, start, new Date()).filter((d) => d <= toISODate());

  let longest = 0;
  let run = 0;
  for (const d of days) {
    if (done.has(d)) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (done.has(days[i]!)) current += 1;
    else break;
  }
  return { current, longest, total: completions.length };
}

export function monthlyRate(habit: Habit, completions: Completion[], year: number, month: number) {
  const from = new Date(year, month, 1);
  const to = new Date(year, month + 1, 0);
  return habitStats(habit, completions, from, to);
}
