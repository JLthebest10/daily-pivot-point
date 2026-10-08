import { AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SHORTCUT_NAME = "Life Hub Lembrete 2";

/** Builds the local (no timezone) ISO text "YYYY-MM-DDTHH:MM:SS|Title" from DB date (YYYY-MM-DD) and time (HH:MM[:SS]). */
export function buildReminderText(date: string, time: string, title: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?/.exec(time);
  if (!m) return null;
  const hh = (m[1] ?? "").padStart(2, "0");
  return `${date}T${hh}:${m[2]}:${m[3] ?? "00"}|${title.replace(/\|/g, " ")}`;
}

export function buildReminderUrl(text: string) {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(text)}`;
}

/** Opens iOS Shortcuts running "Life Hub Lembrete 2", which creates a Reminder. */
export function AlarmButton({
  date,
  time,
  title,
}: {
  date: string | null;
  time: string | null;
  title: string;
}) {
  if (!date || !time) return null;
  const text = buildReminderText(date, time, title);
  if (!text) return null;
  return (
    <Button variant="ghost" size="icon" asChild aria-label={`Criar lembrete às ${time.slice(0, 5)}`}>
      <a href={buildReminderUrl(text)}>
        <AlarmClock className="size-4 text-muted-foreground" />
      </a>
    </Button>
  );
}
