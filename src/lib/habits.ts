import { addDays, toISODate } from "@/lib/format";

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
};

export type Completion = { id: string; habit_id: string; date: string; value: number };

export function isScheduled(habit: Habit, date: Date) {
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
  const scheduled = scheduledDatesBetween(habit, from, to);
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
