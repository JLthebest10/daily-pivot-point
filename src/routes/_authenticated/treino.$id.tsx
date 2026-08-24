import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Play, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave, currentUserId, db } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HabitCheck } from "@/components/habits/HabitCheck";
import {
  Bar,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
  SectionTitle,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treino/$id")({
  head: () => ({
    meta: [
      { title: "Treino — Life Hub" },
      { name: "description", content: "Registre séries, cargas e repetições do seu treino." },
      { property: "og:title", content: "Treino — Life Hub" },
      { property: "og:description", content: "Execute e registre seu treino no Life Hub." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: WorkoutDetail,
});

type Workout = { id: string; name: string; note: string | null; focus?: string | null };
type Exercise = {
  id: string;
  workout_id: string;
  name: string;
  target_sets: number;
  target_reps: number;
  rest_sec: number;
  order_index: number;
};
type SetRow = {
  id: string;
  exercise_id: string;
  set_number: number;
  weight: number;
  reps: number;
  date: string;
};
type HabitRow = { id: string; name: string; category: string; archived: boolean; target: number };

function WorkoutDetail() {
  const { id } = Route.useParams();
  const today = toISODate();
  const qc = useQueryClient();

  const workouts = useList<Workout>("workouts", { eq: { id } });
  const exercises = useList<Exercise>("exercises", {
    eq: { workout_id: id },
    order: { column: "order_index" },
  });
  const sets = useList<SetRow>("exercise_sets", { eq: { date: today } });
  const history = useList<SetRow>("exercise_sets", {
    order: { column: "date", ascending: false },
  });
  const habits = useList<HabitRow>("habits", { eq: { archived: false } });
  const saveExercise = useSave("exercises", "Exercício adicionado");
  const removeExercise = useRemove("exercises", "Exercício removido");
  const saveSet = useSave("exercise_sets");
  const removeSet = useRemove("exercise_sets", "Série removida");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_sets: "3", target_reps: "10", rest_sec: "60" });
  const [entry, setEntry] = useState<Record<string, { weight: string; reps: string }>>({});
  const [finishing, setFinishing] = useState(false);
  const [started, setStarted] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const workout = (workouts.data ?? [])[0];
  const list = exercises.data ?? [];
  const todaySets = (sets.data ?? []).filter((s) => list.some((e) => e.id === s.exercise_id));
  const doneCount = list.filter((e) => checked[e.id]).length;
  const progress = list.length ? (doneCount / list.length) * 100 : 0;

  /** Última série registrada de cada exercício (qualquer data) — mantém a carga anterior. */
  const lastByExercise = new Map<string, SetRow>();
  for (const s of history.data ?? []) {
    const prev = lastByExercise.get(s.exercise_id);
    if (!prev || s.date > prev.date || (s.date === prev.date && s.set_number > prev.set_number)) {
      lastByExercise.set(s.exercise_id, s);
    }
  }

  function start() {
    setStarted(true);
    setStartedAt(Date.now());
    setChecked({});
    toast.success("Treino iniciado. Bom treino!");
  }

  /** Marca o hábito de treino do dia como concluído, se existir. */
  async function markWorkoutHabit(user_id: string) {
    const candidates = (habits.data ?? []).filter(
      (h) =>
        h.category?.toLowerCase() === "treino" ||
        /trein|academ|muscul|exerc/i.test(h.name ?? ""),
    );
    for (const h of candidates) {
      const { data: existing } = await db
        .from("habit_completions")
        .select("id")
        .eq("habit_id", h.id)
        .eq("date", today)
        .maybeSingle();
      if (existing) continue;
      await db
        .from("habit_completions")
        .insert({ habit_id: h.id, date: today, value: h.target ?? 1, user_id });
    }
    return candidates.length;
  }

  async function finish() {
    setFinishing(true);
    try {
      const user_id = await currentUserId();
      const duration = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60000)) : null;
      const { error } = await db.from("workout_sessions").insert({
        user_id,
        workout_id: id,
        date: today,
        ...(duration ? { duration_min: duration } : {}),
      });
      if (error) throw error;
      const marked = await markWorkoutHabit(user_id);
      qc.invalidateQueries();
      setStarted(false);
      setStartedAt(null);
      setChecked({});
      toast.success(
        marked > 0 ? "Treino salvo e hábito de treino marcado!" : "Treino salvo como realizado!",
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setFinishing(false);
    }
  }

  if (workouts.isLoading) return <LoadingList />;

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
        subtitle={workout?.focus || workout?.note || undefined}
        action={
          started ? (
            <Button onClick={finish} disabled={finishing}>
              <Check className="size-4" /> Finalizar treino
            </Button>
          ) : (
            <Button onClick={start}>
              <Play className="size-4" /> Iniciar treino
            </Button>
          )
        }
      />

      {started && (
        <section className="surface mb-6 px-4 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium">Treino em andamento</p>
            <span className="num text-sm text-muted-foreground">
              {doneCount}/{list.length} · {Math.round(progress)}%
            </span>
          </div>
          <Bar value={progress} />
          <p className="mt-2 text-xs text-muted-foreground">
            Marque cada exercício ao terminar e clique em “Finalizar treino”.
          </p>
        </section>
      )}

      <SectionTitle
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Exercício
          </Button>
        }
      >
        Exercícios · {todaySets.length} séries hoje
      </SectionTitle>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Adicione exercícios para registrar suas séries.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((ex) => {
            const exSets = todaySets
              .filter((s) => s.exercise_id === ex.id)
              .sort((a, b) => a.set_number - b.set_number);
            const last = lastByExercise.get(ex.id);
            const value =
              entry[ex.id] ??
              ({
                weight: last ? String(Number(last.weight)) : "",
                reps: String(last?.reps ?? ex.target_reps),
              } as { weight: string; reps: string });
            const isDone = !!checked[ex.id];
            return (
              <li key={ex.id} className="surface px-4 py-4">
                <div className="flex items-center gap-3">
                  {started && (
                    <HabitCheck
                      checked={isDone}
                      label={ex.name}
                      onToggle={() => setChecked({ ...checked, [ex.id]: !isDone })}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "truncate text-sm font-medium",
                        isDone && "text-muted-foreground line-through",
                      )}
                    >
                      {ex.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ex.target_sets}×{ex.target_reps} · descanso {ex.rest_sec}s
                    </p>
                    {last && (
                      <p className="num mt-0.5 text-xs text-muted-foreground">
                        Última vez: {Number(last.weight)}kg × {last.reps} ({shortDate(last.date)})
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Excluir exercício"
                    onClick={() => removeExercise.mutate(ex.id)}
                  >
                    <Trash2 className="size-4 text-muted-foreground" />
                  </Button>
                </div>

                {exSets.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {exSets.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-1.5 text-xs"
                      >
                        <span className="num">
                          Série {s.set_number} · {Number(s.weight)}kg × {s.reps}
                        </span>
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeSet.mutate(s.id)}
                        >
                          remover
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <form
                  className="mt-3 flex items-end gap-2"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await saveSet.mutateAsync({
                      exercise_id: ex.id,
                      set_number: exSets.length + 1,
                      weight: Number(value.weight) || 0,
                      reps: Number(value.reps) || 0,
                      date: today,
                    });
                    setEntry({ ...entry, [ex.id]: { weight: value.weight, reps: value.reps } });
                  }}
                >
                  <label className="flex-1 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Kg</span>
                    <Input
                      type="number"
                      step="0.5"
                      min={0}
                      aria-label="Peso em quilos"
                      value={value.weight}
                      onChange={(e) =>
                        setEntry({ ...entry, [ex.id]: { ...value, weight: e.target.value } })
                      }
                      className="h-9"
                    />
                  </label>
                  <label className="flex-1 space-y-1">
                    <span className="text-[11px] font-medium text-muted-foreground">Reps</span>
                    <Input
                      type="number"
                      min={0}
                      aria-label="Repetições"
                      value={value.reps}
                      onChange={(e) =>
                        setEntry({ ...entry, [ex.id]: { ...value, reps: e.target.value } })
                      }
                      className="h-9"
                    />
                  </label>
                  <Button type="submit" size="sm" variant="secondary" className="h-9">
                    <Plus className="size-4" />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
      )}

      {started && list.length > 0 && (
        <Button className="mt-6 w-full" size="lg" onClick={finish} disabled={finishing}>
          <Check className="size-4" /> Finalizar treino
        </Button>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo exercício">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await saveExercise.mutateAsync({
              workout_id: id,
              name: form.name.trim(),
              target_sets: Number(form.target_sets) || 3,
              target_reps: Number(form.target_reps) || 10,
              rest_sec: Number(form.rest_sec) || 60,
              order_index: list.length,
            });
            setForm({ name: "", target_sets: "3", target_reps: "10", rest_sec: "60" });
            setOpen(false);
          }}
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Séries">
              <Input
                type="number"
                min={1}
                value={form.target_sets}
                onChange={(e) => setForm({ ...form, target_sets: e.target.value })}
              />
            </Field>
            <Field label="Reps">
              <Input
                type="number"
                min={1}
                value={form.target_reps}
                onChange={(e) => setForm({ ...form, target_reps: e.target.value })}
              />
            </Field>
            <Field label="Descanso (s)">
              <Input
                type="number"
                min={0}
                value={form.rest_sec}
                onChange={(e) => setForm({ ...form, rest_sec: e.target.value })}
              />
            </Field>
          </div>
          <Button type="submit" className="w-full" disabled={saveExercise.isPending}>
            Adicionar exercício
          </Button>
        </form>
      </FormModal>
    </>
  );
}
