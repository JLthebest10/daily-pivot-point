import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave, currentUserId, db } from "@/lib/db";
import { toISODate } from "@/lib/format";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormModal, LoadingList, PageHeader, SectionTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/treino/$id")({
  head: () => ({
    meta: [
      { title: "Treino — Life Hub" },
      { name: "description", content: "Registre séries, cargas e repetições do seu treino." },
      { property: "og:title", content: "Treino — Life Hub" },
      { property: "og:description", content: "Execute e registre seu treino no Life Hub." },
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
  const saveExercise = useSave("exercises", "Exercício adicionado");
  const removeExercise = useRemove("exercises", "Exercício removido");
  const saveSet = useSave("exercise_sets");
  const removeSet = useRemove("exercise_sets", "Série removida");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", target_sets: "3", target_reps: "10", rest_sec: "60" });
  const [entry, setEntry] = useState<Record<string, { weight: string; reps: string }>>({});
  const [finishing, setFinishing] = useState(false);

  const workout = (workouts.data ?? [])[0];
  const todaySets = (sets.data ?? []).filter((s) =>
    (exercises.data ?? []).some((e) => e.id === s.exercise_id),
  );

  async function finish() {
    setFinishing(true);
    try {
      const user_id = await currentUserId();
      const { error } = await db
        .from("workout_sessions")
        .insert({ user_id, workout_id: id, date: today });
      if (error) throw error;
      qc.invalidateQueries();
      toast.success("Treino concluído!");
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
          <Button onClick={finish} disabled={finishing}>
            <Check className="size-4" /> Concluir
          </Button>
        }
      />

      <SectionTitle
        action={
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Exercício
          </Button>
        }
      >
        Exercícios · {todaySets.length} séries hoje
      </SectionTitle>

      {(exercises.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Adicione exercícios para registrar suas séries.
        </p>
      ) : (
        <ul className="space-y-3">
          {(exercises.data ?? []).map((ex) => {
            const exSets = todaySets
              .filter((s) => s.exercise_id === ex.id)
              .sort((a, b) => a.set_number - b.set_number);
            const value = entry[ex.id] ?? { weight: "", reps: String(ex.target_reps) };
            return (
              <li key={ex.id} className="surface px-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ex.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.target_sets}×{ex.target_reps} · descanso {ex.rest_sec}s
                    </p>
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
                  className="mt-3 flex items-center gap-2"
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
                  <Input
                    type="number"
                    step="0.5"
                    min={0}
                    placeholder="kg"
                    value={value.weight}
                    onChange={(e) => setEntry({ ...entry, [ex.id]: { ...value, weight: e.target.value } })}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="reps"
                    value={value.reps}
                    onChange={(e) => setEntry({ ...entry, [ex.id]: { ...value, reps: e.target.value } })}
                    className="h-9"
                  />
                  <Button type="submit" size="sm" variant="secondary">
                    <Plus className="size-4" />
                  </Button>
                </form>
              </li>
            );
          })}
        </ul>
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
              order_index: (exercises.data ?? []).length,
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
          <Button type="submit" className="w-full">
            Adicionar
          </Button>
        </form>
      </FormModal>
    </>
  );
}
