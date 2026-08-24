import { useEffect, useRef, useState } from "react";
import { Timer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { label: "1:00", sec: 60 },
  { label: "1:30", sec: 90 },
  { label: "2:00", sec: 120 },
  { label: "2:30", sec: 150 },
];

function playAlarm() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const start = ctx.currentTime;
    // três bipes curtos
    for (let i = 0; i < 3; i++) {
      const t = start + i * 0.35;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.3);
    }
    setTimeout(() => ctx.close().catch(() => undefined), 1400);
  } catch {
    /* som indisponível */
  }
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([200, 100, 200]);
  }
}

function fmt(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function RestTimer({ defaultSec }: { defaultSec?: number }) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const endRef = useRef<number | null>(null);

  useEffect(() => {
    if (total === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((endRef.current ?? 0) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        playAlarm();
        setTotal(null);
        endRef.current = null;
      }
    };
    const t = window.setInterval(tick, 250);
    return () => window.clearInterval(t);
  }, [total]);

  function startTimer(sec: number) {
    endRef.current = Date.now() + sec * 1000;
    setLeft(sec);
    setTotal(sec);
    setOpen(false);
  }

  if (total !== null) {
    const pct = total ? ((total - left) / total) * 100 : 0;
    return (
      <div className="flex items-center gap-1.5">
        <div className="relative flex h-9 min-w-[62px] items-center justify-center overflow-hidden rounded-lg bg-muted">
          <div
            className="absolute inset-y-0 left-0 bg-primary/20 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
          <span className={cn("num relative text-sm font-semibold", left <= 5 && "text-destructive")}>
            {fmt(left)}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Cancelar descanso"
          onClick={() => {
            setTotal(null);
            endRef.current = null;
          }}
        >
          <X className="size-4 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Iniciar descanso">
          <Timer className="size-4 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <p className="px-1 pb-2 text-xs text-muted-foreground">Tempo de descanso</p>
        <div className="grid grid-cols-2 gap-1.5">
          {OPTIONS.map((o) => (
            <Button
              key={o.sec}
              size="sm"
              variant={defaultSec === o.sec ? "default" : "secondary"}
              className="num"
              onClick={() => startTimer(o.sec)}
            >
              {o.label}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
