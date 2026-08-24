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

function fmt(total: number) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type AudioSession = {
  ctx: AudioContext;
  sources: AudioScheduledSourceNode[];
};

/** Cria (ou reaproveita) o motor de áudio dentro do gesto do usuário. */
function createSession(): AudioSession | null {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx();
    void ctx.resume().catch(() => undefined);
    return { ctx, sources: [] };
  } catch {
    return null;
  }
}

/** Som silencioso em loop: mantém a sessão de áudio viva em segundo plano. */
function startKeepAlive(session: AudioSession) {
  const { ctx } = session;
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const gain = ctx.createGain();
  gain.gain.value = 0.0001;
  source.connect(gain).connect(ctx.destination);
  source.start();
  session.sources.push(source);
}

/** Agenda o alarme no relógio do áudio — toca mesmo com o app em segundo plano. */
function scheduleAlarm(session: AudioSession, delaySec: number) {
  const { ctx } = session;
  const base = ctx.currentTime + Math.max(0, delaySec);
  // padrão longo e audível: 8 bipes ao longo de ~3s
  for (let i = 0; i < 8; i++) {
    const t = base + i * 0.4;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(i % 2 === 0 ? 990 : 740, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.32);
    session.sources.push(osc);
  }
}

function stopSession(session: AudioSession | null) {
  if (!session) return;
  for (const s of session.sources) {
    try {
      s.stop();
    } catch {
      /* já finalizado */
    }
  }
  session.sources = [];
  session.ctx.close().catch(() => undefined);
}

function notifyDone() {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate?.([300, 150, 300, 150, 300]);
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Descanso terminado", { body: "Hora da próxima série 💪", tag: "rest" });
    }
  } catch {
    /* notificação indisponível */
  }
}

export function RestTimer({ defaultSec }: { defaultSec?: number }) {
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const [left, setLeft] = useState(0);
  const endRef = useRef<number | null>(null);
  const sessionRef = useRef<AudioSession | null>(null);

  useEffect(() => () => stopSession(sessionRef.current), []);

  useEffect(() => {
    if (total === null) return;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil(((endRef.current ?? 0) - Date.now()) / 1000));
      setLeft(remaining);
      if (remaining <= 0) {
        notifyDone();
        // o som já foi agendado no início; encerra a sessão depois do alarme tocar
        const session = sessionRef.current;
        sessionRef.current = null;
        window.setTimeout(() => stopSession(session), 4000);
        setTotal(null);
        endRef.current = null;
      }
    };
    const t = window.setInterval(tick, 250);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [total]);

  function cancel() {
    stopSession(sessionRef.current);
    sessionRef.current = null;
    setTotal(null);
    endRef.current = null;
  }

  function startTimer(sec: number) {
    stopSession(sessionRef.current);
    const session = createSession();
    sessionRef.current = session;
    if (session) {
      startKeepAlive(session);
      scheduleAlarm(session, sec);
    }
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "default") {
        void Notification.requestPermission();
      }
    } catch {
      /* sem suporte */
    }
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
        <Button variant="ghost" size="icon" aria-label="Cancelar descanso" onClick={cancel}>
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
