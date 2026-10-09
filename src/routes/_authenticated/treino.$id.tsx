import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { currentUserId, db, useList } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import {
  buildDraft,
  elapsedMs,
  exerciseHistory,
  firstReps,
  formatClock,
  formatDecimal,
  parseDecimal,
  repsLabel,
  sanitizeDecimalInput,
  type DraftRow,
  type LibraryExercise,
  type Session,
  type SetLog,
  type WorkoutExercise,
} from "@/lib/training";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RestTimer } from "@/components/treino/RestTimer";
import { ExerciseThumb } from "@/components/treino/ExerciseMedia";
import { ExerciseHistory } from "@/components/treino/ExerciseHistory";
import { ExerciseForm } from "@/components/treino/ExerciseForm";
import { AddExerciseModal } from "@/components/treino/AddExerciseModal";
import { Bar, Field, FormModal, LoadingList, PageHeader, SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treino/$id")({
  head: () => ({
    meta: [
      { title: "Treino — Life Hub" },
      { name: "description", content: "Registre carga e repetições de cada série do seu treino." },
      { property: "og:title", content: "Treino — Life Hub" },
      { property: "og:description", content: "Execute e registre seu treino no Life Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkoutDetail,
});

type Workout = { id: string; name: string; note: string | null; focus?: string | null };
type HabitRow = { id: string; name: string; category: string; archived: boolean; target: number };
type PauseState = { pausedMs: number; pausedAt: number | null };

const pauseKey = (sid: string) => `treino-pause-${sid}`;
function readPause(sid: string): PauseState {
  try {
    return JSON.parse(localStorage.getItem(pauseKey(sid)) ?? "") as PauseState;
  } catch {
    return { pausedMs: 0, pausedAt: null };
  }
}

function WorkoutDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();

  const workouts = useList<Workout>("workouts", { eq: { id } });
  const exQ = useList<WorkoutExercise>("exercises", {
    eq: { workout_id: id },
    order: { column: "order_index" },
  });
  const libQ = useList<LibraryExercise>("exercise_library", { order: { column: "name" } });
  const sessQ = useList<Session>("workout_sessions", {
    order: { column: "created_at", ascending: false },
  });
  const setsQ = useList<SetLog>("exercise_sets", {
    order: { column: "created_at", ascending: false },
  });
  const habits = useList<HabitRow>("habits", { eq: { archived: false } });

  const workout = (workouts.data ?? [])[0];
  const list = useMemo(() => (exQ.data ?? []).filter((e) => !e.archived), [exQ.data]);
  const library = libQ.data ?? [];
  const libById = useMemo(() => new Map(library.map((l) => [l.id, l])), [library]);
  const sessions = sessQ.data ?? [];
  const allSets = setsQ.data ?? [];
  const active = sessions.find((s) => s.workout_id === id && s.started_at && !s.finished_at);

  /* ---------- rascunho da sessão (séries) ---------- */
  const [draft, setDraft] = useState<Record<string, DraftRow[]>>({});
  const draftRef = useRef<Record<string, DraftRow[]>>({});
  const draftSession = useRef<string | null>(null);
  const queues = useRef<Record<string, Promise<void>>>({});
  const timers = useRef<Record<string, number>>({});
  const listKey = list.map((e) => e.id).join();

  useEffect(() => {
    if (!active) {
      if (draftSession.current) {
        draftSession.current = null;
        draftRef.current = {};
        setDraft({});
      }
      return;
    }
    if (!setsQ.data || !sessQ.data) return;
    if (draftSession.current !== active.id) {
      draftSession.current = active.id;
      draftRef.current = {};
    }
    const next = { ...draftRef.current };
    let changed = false;
    for (const ex of list) {
      if (next[ex.id]) continue;
      const current = setsQ.data.filter((s) => s.session_id === active.id && s.exercise_id === ex.id);
      const prev = exerciseHistory(setsQ.data, sessQ.data, ex, active.id)[0]?.sets;
      next[ex.id] = buildDraft(ex.target_sets, ex.target_reps, current, prev);
      changed = true;
    }
    if (changed) {
      draftRef.current = next;
      setDraft(next);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active?.id, setsQ.data, sessQ.data, listKey]);

  function commit(exId: string, rows: DraftRow[]) {
    draftRef.current = { ...draftRef.current, [exId]: rows };
    setDraft(draftRef.current);
  }

  function enqueue(exId: string, job: () => Promise<void>) {
    const next = (queues.current[exId] ?? Promise.resolve())
      .catch(() => undefined)
      .then(job)
      .catch((e: Error) => {
        toast.error(`Não foi possível salvar: ${e.message}`);
      });
    queues.current[exId] = next;
    return next;
  }

  function saveRow(ex: WorkoutExercise, idx: number) {
    const session = active;
    if (!session) return Promise.resolve();
    return enqueue(ex.id, async () => {
      const row = draftRef.current[ex.id]?.[idx];
      if (!row) return;
      const values = {
        weight: parseDecimal(row.weight) ?? 0,
        reps: Number.parseInt(row.reps, 10) || 0,
        done: row.done,
      };
      if (row.id) {
        const { error } = await db.from("exercise_sets").update(values).eq("id", row.id);
        if (error) throw error;
        return;
      }
      const { data, error } = await db
        .from("exercise_sets")
        .insert({
          ...values,
          user_id: await currentUserId(),
          session_id: session.id,
          exercise_id: ex.id,
          library_id: ex.library_id,
          set_number: idx + 1,
          date: session.date,
        })
        .select("id")
        .single();
      if (error) throw error;
      const rows = [...(draftRef.current[ex.id] ?? [])];
      if (rows[idx]) {
        rows[idx] = { ...rows[idx]!, id: data.id as string };
        commit(ex.id, rows);
      }
    });
  }

  function scheduleSave(ex: WorkoutExercise, idx: number, delay = 600) {
    const key = `${ex.id}:${idx}`;
    window.clearTimeout(timers.current[key]);
    timers.current[key] = window.setTimeout(() => {
      delete timers.current[key];
      void saveRow(ex, idx);
    }, delay);
  }

  async function flushAll() {
    const pending = Object.keys(timers.current);
    for (const key of pending) {
      window.clearTimeout(timers.current[key]);
      delete timers.current[key];
      const [exId, idx] = key.split(":");
      const ex = list.find((e) => e.id === exId);
      if (ex) void saveRow(ex, Number(idx));
    }
    await Promise.all(Object.values(queues.current));
  }

  // salva imediatamente se o app for para segundo plano / aba fechada
  const flushRef = useRef(flushAll);
  flushRef.current = flushAll;
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden") void flushRef.current();
    };
    const onPageHide = () => void flushRef.current();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
      void flushRef.current();
    };
  }, []);

  function updateRow(ex: WorkoutExercise, idx: number, patch: Partial<DraftRow>, immediate = false) {
    const rows = [...(draftRef.current[ex.id] ?? [])];
    if (!rows[idx]) return;
    rows[idx] = { ...rows[idx]!, ...patch };
    commit(ex.id, rows);
    scheduleSave(ex, idx, immediate ? 0 : 600);
  }

  function addRow(ex: WorkoutExercise) {
    const rows = [...(draftRef.current[ex.id] ?? [])];
    const last = rows[rows.length - 1];
    rows.push({ weight: last?.weight ?? "", reps: last?.reps ?? String(ex.target_reps), done: false });
    commit(ex.id, rows);
    scheduleSave(ex, rows.length - 1, 0);
  }

  function removeRow(ex: WorkoutExercise) {
    const rows = [...(draftRef.current[ex.id] ?? [])];
    if (rows.length <= 1) return;
    const idx = rows.length - 1;
    window.clearTimeout(timers.current[`${ex.id}:${idx}`]);
    delete timers.current[`${ex.id}:${idx}`];
    commit(ex.id, rows.slice(0, -1));
    void enqueue(ex.id, async () => {
      // id pode ter chegado depois de um insert pendente
      const { error } = await db
        .from("exercise_sets")
        .delete()
        .eq("session_id", active!.id)
        .eq("exercise_id", ex.id)
        .eq("set_number", idx + 1);
      if (error) throw error;
    });
  }

  /* ---------- cronômetro / pausa ---------- */
  const [pause, setPause] = useState<PauseState>({ pausedMs: 0, pausedAt: null });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (active) setPause(readPause(active.id));
  }, [active?.id]);
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active?.id]);

  function togglePause() {
    if (!active) return;
    const next: PauseState = pause.pausedAt
      ? { pausedMs: pause.pausedMs + (Date.now() - pause.pausedAt), pausedAt: null }
      : { ...pause, pausedAt: Date.now() };
    localStorage.setItem(pauseKey(active.id), JSON.stringify(next));
    setPause(next);
  }

  const elapsed = active?.started_at
    ? elapsedMs(active.started_at, pause.pausedMs, pause.pausedAt, now)
    : 0;

  /* ---------- iniciar / finalizar ---------- */
  const [busy, setBusy] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  async function start() {
    setBusy(true);
    try {
      const today = toISODate();
      const { error } = await db.from("workout_sessions").insert({
        user_id: await currentUserId(),
        workout_id: id,
        date: today,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["workout_sessions"] });
      toast.success("Treino iniciado. Bom treino!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function markWorkoutHabit(user_id: string, date: string) {
    const candidates = (habits.data ?? []).filter(
      (h) =>
        h.category?.toLowerCase() === "treino" || /trein|academ|muscul|exerc/i.test(h.name ?? ""),
    );
    for (const h of candidates) {
      const { data: existing } = await db
        .from("habit_completions")
        .select("id")
        .eq("habit_id", h.id)
        .eq("date", date)
        .maybeSingle();
      if (existing) continue;
      await db
        .from("habit_completions")
        .insert({ habit_id: h.id, date, value: h.target ?? 1, user_id });
    }
    return candidates.length;
  }

  async function finish() {
    if (!active) return;
    setBusy(true);
    try {
      await flushAll();
      const user_id = await currentUserId();
      const duration = Math.max(1, Math.round(elapsed / 60000));
      const { error } = await db
        .from("workout_sessions")
        .update({ finished_at: new Date().toISOString(), duration_min: duration })
        .eq("id", active.id);
      if (error) throw error;
      localStorage.removeItem(pauseKey(active.id));
      const marked = await markWorkoutHabit(user_id, active.date);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workout_sessions"] }),
        qc.invalidateQueries({ queryKey: ["exercise_sets"] }),
        qc.invalidateQueries({ queryKey: ["habit_completions"] }),
      ]);
      toast.success(marked > 0 ? "Treino salvo e hábito marcado!" : "Treino salvo!");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setConfirmFinish(false);
    }
  }

  async function discard() {
    if (!active) return;
    setBusy(true);
    try {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
      timers.current = {};
      await Promise.all(Object.values(queues.current));
      const { error } = await db.from("workout_sessions").delete().eq("id", active.id);
      if (error) throw error;
      localStorage.removeItem(pauseKey(active.id));
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["workout_sessions"] }),
        qc.invalidateQueries({ queryKey: ["exercise_sets"] }),
      ]);
      toast.success("Sessão descartada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setConfirmDiscard(false);
    }
  }

  /* ---------- gerenciar exercícios ---------- */
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<WorkoutExercise | null>(null);
  const [editLib, setEditLib] = useState<LibraryExercise | null>(null);
  const [removing, setRemoving] = useState<WorkoutExercise | null>(null);
  const [pForm, setPForm] = useState({ sets: "", reps: "", rest: "", note: "" });
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  async function addFromLibrary(
    lib: LibraryExercise,
    p: { sets: number; reps: string; rest: number; note: string },
  ) {
    const { error } = await db.from("exercises").insert({
      user_id: await currentUserId(),
      workout_id: id,
      library_id: lib.id,
      name: lib.name,
      target_sets: p.sets,
      target_reps: firstReps(p.reps),
      target_reps_text: p.reps,
      rest_sec: p.rest,
      note: p.note || null,
      order_index: list.length ? Math.max(...list.map((e) => e.order_index)) + 1 : 0,
    });
    if (error) {
      toast.error(error.message);
      throw error;
    }
    await qc.invalidateQueries({ queryKey: ["exercises"] });
    toast.success("Exercício adicionado");
  }

  function openEdit(ex: WorkoutExercise) {
    setEditing(ex);
    setPForm({
      sets: String(ex.target_sets),
      reps: repsLabel(ex),
      rest: String(ex.rest_sec),
      note: ex.note ?? "",
    });
  }

  async function savePrescription(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const { error } = await db
      .from("exercises")
      .update({
        target_sets: Math.max(1, Number(pForm.sets) || 1),
        target_reps: firstReps(pForm.reps),
        target_reps_text: pForm.reps.trim() || null,
        rest_sec: Math.max(0, Number(pForm.rest) || 0),
        note: pForm.note.trim() || null,
      })
      .eq("id", editing.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["exercises"] });
    toast.success("Prescrição atualizada");
    setEditing(null);
  }

  async function archive(ex: WorkoutExercise) {
    const { error } = await db.from("exercises").update({ archived: true }).eq("id", ex.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["exercises"] });
    toast.success("Removido do treino (continua na biblioteca)");
    setRemoving(null);
  }

  async function move(ex: WorkoutExercise, dir: -1 | 1) {
    const i = list.findIndex((e) => e.id === ex.id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const order = [...list];
    [order[i], order[j]] = [order[j]!, order[i]!];
    await Promise.all(
      order.map((e, idx) =>
        e.order_index === idx ? null : db.from("exercises").update({ order_index: idx }).eq("id", e.id),
      ),
    );
    await qc.invalidateQueries({ queryKey: ["exercises"] });
  }

  if (workouts.isLoading || exQ.isLoading) return <LoadingList />;

  const totalSets = active ? list.reduce((a, e) => a + (draft[e.id]?.length ?? 0), 0) : 0;
  const doneSets = active
    ? list.reduce((a, e) => a + (draft[e.id]?.filter((r) => r.done).length ?? 0), 0)
    : 0;
  const currentEx = active
    ? list.find((e) => (draft[e.id] ?? []).some((r) => !r.done))?.id
    : undefined;
  const pastSessions = sessions.filter((s) => s.workout_id === id && s.finished_at).slice(0, 8);

  return (
    <>
      <Link
        to="/treino"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Treinos
      </Link>
      <PageHeader
        title={workout?.name ?? "Treino"}
        subtitle={workout?.focus || workout?.note || `${list.length} exercícios`}
        action={
          !active && (
            <Button onClick={start} disabled={busy || list.length === 0}>
              <Play className="size-4" /> Iniciar treino
            </Button>
          )
        }
      />

      {active && (
        <section className="surface sticky top-2 z-20 mb-5 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {pause.pausedAt ? "Pausado" : "Em andamento"}
              </p>
              <p className="num text-2xl font-semibold leading-tight">{formatClock(elapsed)}</p>
            </div>
            <Button
              size="icon"
              variant="secondary"
              onClick={togglePause}
              aria-label={pause.pausedAt ? "Retomar" : "Pausar"}
            >
              {pause.pausedAt ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
            <Button onClick={() => setConfirmFinish(true)} disabled={busy}>
              <Check className="size-4" /> Finalizar
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <div className="flex-1">
              <Bar value={totalSets ? (doneSets / totalSets) * 100 : 0} />
            </div>
            <span className="num text-xs text-muted-foreground">
              {doneSets}/{totalSets} séries
            </span>
          </div>
        </section>
      )}

      <SectionTitle
        action={
          <Button variant="ghost" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" /> Exercício
          </Button>
        }
      >
        Exercícios
      </SectionTitle>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Toque em “+ Exercício” para montar este treino.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((ex, i) => {
            const lib = ex.library_id ? libById.get(ex.library_id) : undefined;
            const history = exerciseHistory(allSets, sessions, ex, active?.id);
            const prev = history[0];
            const rows = draft[ex.id] ?? [];
            const isCurrent = currentEx === ex.id;
            const allDone = active && rows.length > 0 && rows.every((r) => r.done);
            return (
              <li
                key={ex.id}
                className={cn(
                  "surface px-4 py-4 transition-shadow",
                  isCurrent && "ring-2 ring-primary/60",
                  allDone && "opacity-80",
                )}
              >
                <div className="flex gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-snug">
                      {allDone && <Check className="size-4 shrink-0 text-primary" />}
                      <span className="break-words">{ex.name}</span>
                    </p>
                    <p className="num mt-1 text-xs text-muted-foreground">
                      {ex.target_sets} séries · {repsLabel(ex)} reps · {ex.rest_sec}s descanso
                    </p>
                    {(lib?.muscle_group || lib?.equipment) && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[lib.muscle_group, lib.equipment].filter(Boolean).join(" · ")}
                      </p>
                    )}
                    {ex.note && <p className="mt-1 text-xs italic text-muted-foreground">{ex.note}</p>}
                    {prev && (
                      <p className="num mt-1.5 text-xs">
                        <span className="text-muted-foreground">Última ({shortDate(prev.date)}): </span>
                        {prev.sets.map((s) => `${formatDecimal(s.weight)}×${s.reps}`).join(" · ")}
                      </p>
                    )}
                  </div>
                  <ExerciseThumb path={lib?.media_path} type={lib?.media_type} name={ex.name} />
                </div>

                {active && rows.length > 0 && (
                  <div className="mt-3">
                    <div className="grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 px-1 pb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span>Série</span>
                      <span>Anterior</span>
                      <span>Kg</span>
                      <span>Reps</span>
                      <span className="text-center">✓</span>
                    </div>
                    <ul className="space-y-1">
                      {rows.map((r, idx) => {
                        const ref = prev?.sets[idx];
                        return (
                          <li
                            key={idx}
                            className={cn(
                              "grid grid-cols-[1.75rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center gap-2 rounded-lg px-1 py-1 transition-colors",
                              r.done && "bg-primary/10",
                            )}
                          >
                            <span className="num text-center text-sm font-medium">{idx + 1}</span>
                            <span className="num truncate text-xs text-muted-foreground">
                              {ref ? `${formatDecimal(ref.weight)}×${ref.reps}` : "—"}
                            </span>
                            <Input
                              inputMode="decimal"
                              aria-label={`Kg da série ${idx + 1}`}
                              value={r.weight}
                              placeholder="0"
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                updateRow(ex, idx, { weight: sanitizeDecimalInput(e.target.value) })
                              }
                              className="num h-10 px-2 text-center"
                            />
                            <Input
                              inputMode="numeric"
                              aria-label={`Repetições da série ${idx + 1}`}
                              value={r.reps}
                              placeholder="0"
                              onFocus={(e) => e.currentTarget.select()}
                              onChange={(e) =>
                                updateRow(ex, idx, { reps: e.target.value.replace(/\D/g, "").slice(0, 3) })
                              }
                              className="num h-10 px-2 text-center"
                            />
                            <button
                              type="button"
                              aria-label={`Concluir série ${idx + 1}`}
                              aria-pressed={r.done}
                              onClick={() => updateRow(ex, idx, { done: !r.done }, true)}
                              className={cn(
                                "mx-auto flex size-9 items-center justify-center rounded-lg border transition-colors",
                                r.done
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              <Check className="size-4" />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <div className="mt-2 flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={() => addRow(ex)}>
                        <Plus className="size-4" /> Série
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeRow(ex)}
                        disabled={rows.length <= 1}
                      >
                        <Minus className="size-4" /> Série
                      </Button>
                      <div className="ml-auto">
                        <RestTimer defaultSec={ex.rest_sec} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="-ml-2 text-muted-foreground"
                    onClick={() => setExpanded({ ...expanded, [ex.id]: !expanded[ex.id] })}
                    aria-expanded={!!expanded[ex.id]}
                  >
                    Histórico
                    <ChevronDown
                      className={cn("size-4 transition-transform", expanded[ex.id] && "rotate-180")}
                    />
                  </Button>
                  <div className="ml-auto flex items-center">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Subir"
                      disabled={i === 0}
                      onClick={() => move(ex, -1)}
                    >
                      <ArrowUp className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Descer"
                      disabled={i === list.length - 1}
                      onClick={() => move(ex, 1)}
                    >
                      <ArrowDown className="size-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => openEdit(ex)}>
                      <Pencil className="size-4 text-muted-foreground" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remover do treino"
                      onClick={() => setRemoving(ex)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {expanded[ex.id] && (
                  <div className="pt-2 animate-in fade-in-0 slide-in-from-top-1">
                    {lib?.description && (
                      <p className="mb-2 text-xs text-muted-foreground">{lib.description}</p>
                    )}
                    <ExerciseHistory history={history} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {active && (
        <div className="mt-6 flex gap-2">
          <Button variant="ghost" onClick={() => setConfirmDiscard(true)} disabled={busy}>
            <X className="size-4" /> Descartar
          </Button>
          <Button className="flex-1" size="lg" onClick={() => setConfirmFinish(true)} disabled={busy}>
            <Check className="size-4" /> Finalizar treino
          </Button>
        </div>
      )}

      {pastSessions.length > 0 && (
        <>
          <SectionTitle>Sessões anteriores</SectionTitle>
          <ul className="space-y-1.5">
            {pastSessions.map((s) => {
              const ss = allSets.filter((x) => x.session_id === s.id && x.done);
              const vol = ss.reduce((a, x) => a + Number(x.weight) * x.reps, 0);
              return (
                <li key={s.id} className="surface flex items-center justify-between px-4 py-3 text-sm">
                  <span className="num">{shortDate(s.date)}</span>
                  <span className="num text-xs text-muted-foreground">
                    {ss.length} séries · {formatDecimal(Math.round(vol))} kg vol.
                    {s.duration_min ? ` · ${s.duration_min} min` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <AddExerciseModal
        key={adding ? "open" : "closed"}
        open={adding}
        onOpenChange={setAdding}
        library={library}
        onAdd={addFromLibrary}
      />

      <FormModal open={!!editing} onOpenChange={(v) => !v && setEditing(null)} title={editing?.name ?? ""}>
        <form className="space-y-4" onSubmit={savePrescription}>
          <p className="text-xs text-muted-foreground">Vale só para este treino.</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Séries">
              <Input
                inputMode="numeric"
                value={pForm.sets}
                onChange={(e) => setPForm({ ...pForm, sets: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
            <Field label="Reps">
              <Input value={pForm.reps} onChange={(e) => setPForm({ ...pForm, reps: e.target.value })} />
            </Field>
            <Field label="Descanso (s)">
              <Input
                inputMode="numeric"
                value={pForm.rest}
                onChange={(e) => setPForm({ ...pForm, rest: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>
          <Field label="Observação">
            <Input value={pForm.note} onChange={(e) => setPForm({ ...pForm, note: e.target.value })} />
          </Field>
          <Button type="submit" className="w-full">
            Salvar prescrição
          </Button>
          {editing?.library_id && libById.get(editing.library_id) && (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setEditLib(libById.get(editing.library_id!)!);
                setEditing(null);
              }}
            >
              Editar nome, mídia e informações
            </Button>
          )}
        </form>
      </FormModal>

      <FormModal open={!!editLib} onOpenChange={(v) => !v && setEditLib(null)} title="Editar exercício">
        {editLib && (
          <ExerciseForm
            initial={editLib}
            library={library}
            onSaved={() => {
              toast.success("Exercício atualizado em todos os treinos");
              setEditLib(null);
            }}
          />
        )}
      </FormModal>

      <AlertDialog open={!!removing} onOpenChange={(v) => !v && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover “{removing?.name}” deste treino?</AlertDialogTitle>
            <AlertDialogDescription>
              O exercício continua na sua biblioteca e o histórico de cargas é mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => removing && archive(removing)}>Remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmFinish} onOpenChange={setConfirmFinish}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalizar treino?</AlertDialogTitle>
            <AlertDialogDescription>
              {doneSets === 0
                ? "Nenhuma série foi marcada como concluída. Só as séries marcadas entram no histórico."
                : `${doneSets} de ${totalSets} séries concluídas em ${formatClock(elapsed)}. Só as séries marcadas entram no histórico.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar treinando</AlertDialogCancel>
            <AlertDialogAction onClick={finish} disabled={busy}>
              Finalizar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar esta sessão?</AlertDialogTitle>
            <AlertDialogDescription>
              As séries registradas hoje nesta sessão serão apagadas. Sessões anteriores não mudam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={discard}>Descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
