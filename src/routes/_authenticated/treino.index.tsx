import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronRight, Dumbbell, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { WEEKDAYS } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/treino/")({
  head: () => ({
    meta: [
      { title: "Treino — Life Hub" },
      { name: "description", content: "Seus treinos, exercícios e evolução de carga." },
      { property: "og:title", content: "Treino — Life Hub" },
      { property: "og:description", content: "Seus treinos, exercícios e evolução de carga." },
    ],
  }),
  component: WorkoutsPage,
});

export type Workout = { id: string; name: string; focus: string | null; weekdays: number[] };
export type Exercise = {
  id: string;
  workout_id: string;
  name: string;
  sets: number;
  reps: string;
  rest_sec: number;
  notes: string | null;
  position: number;
};
export type WorkoutSession = {
  id: string;
  workout_id: string;
  date: string;
  duration_min: number | null;
  notes: string | null;
};

function WorkoutsPage() {
  const workouts = useList<Workout>("workouts", { order: { column: "created_at" } });
  const exercises = useList<Exercise>("exercises");
  const sessions = useList<WorkoutSession>("workout_sessions", {
    order: { column: "date", ascending: false },
  });
  const save = useSave("workouts", "Treino salvo");
  const remove = useRemove("workouts", "Treino excluído");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{ name: string; focus: string; weekdays: number[] }>({
    name: "",
    focus: "",
    weekdays: [],
  });

  const countFor = (id: string) => (exercises.data ?? []).filter((e) => e.workout_id === id).length;
  const lastFor = (id: string) => (sessions.data ?? []).find((s) => s.workout_id === id);

  return (
    <>
      <PageHeader
        title="Treino"
        subtitle={`${(sessions.data ?? []).length} sessões registradas`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Novo treino
          </Button>
        }
      />

      <ErrorNote error={workouts.error} />
      {workouts.isLoading ? (
        <LoadingList />
      ) : (workouts.data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhum treino cadastrado."
          description="Monte seu treino A, B, C e registre cada série com a carga usada."
          actionLabel="Criar treino"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {(workouts.data ?? []).map((w) => {
            const last = lastFor(w.id);
            return (
              <li key={w.id} className="surface flex items-center gap-3 px-4 py-4">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Dumbbell className="size-5" />
                </span>
                <Link
                  to="/treino/$id"
                  params={{ id: w.id }}
                  className="min-w-0 flex-1"
                  aria-label={`Abrir ${w.name}`}
                >
                  <p className="truncate text-sm font-medium">{w.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {w.focus ? `${w.focus} · ` : ""}
                    {countFor(w.id)} exercícios
                    {w.weekdays?.length
                      ? ` · ${w.weekdays.map((d) => WEEKDAYS[d]).join(", ")}`
                      : ""}
                    {last ? ` · último em ${new Date(last.date).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => remove.mutate(w.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
                <ChevronRight className="size-4 text-muted-foreground" />
              </li>
            );
          })}
        </ul>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo treino">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({
              name: form.name.trim(),
              focus: form.focus || null,
              weekdays: form.weekdays,
            });
            setForm({ name: "", focus: "", weekdays: [] });
            setOpen(false);
          }}
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Treino A"
              required
            />
          </Field>
          <Field label="Foco">
            <Input
              value={form.focus}
              onChange={(e) => setForm({ ...form, focus: e.target.value })}
              placeholder="Peito e tríceps"
            />
          </Field>
          <Field label="Dias da semana">
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      weekdays: form.weekdays.includes(i)
                        ? form.weekdays.filter((x) => x !== i)
                        : [...form.weekdays, i],
                    })
                  }
                  className={cn(
                    "size-9 rounded-full border text-xs",
                    form.weekdays.includes(i)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar treino
          </Button>
        </form>
      </FormModal>
    </>
  );
}
