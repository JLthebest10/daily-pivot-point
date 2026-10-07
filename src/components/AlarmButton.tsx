import { AlarmClock } from "lucide-react";
import { Button } from "@/components/ui/button";

export const SHORTCUT_NAME = "Life Hub Alarme";

/** Opens the iOS Shortcuts app, running a shortcut that creates a Clock alarm. Input: "HH:MM|Title". */
export function AlarmButton({ time, title }: { time: string | null; title: string }) {
  if (!time) return null;
  const hhmm = time.slice(0, 5);
  const text = `${hhmm}|${title.replace(/\|/g, " ")}`;
  const url = `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}&input=text&text=${encodeURIComponent(text)}`;
  return (
    <Button variant="ghost" size="icon" asChild aria-label={`Criar alarme às ${hhmm}`}>
      <a href={url}>
        <AlarmClock className="size-4 text-muted-foreground" />
      </a>
    </Button>
  );
}
