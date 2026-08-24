import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { currentUserId, db, useList, useRemove, useSave } from "@/lib/db";
import { WEEKDAYS, toISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HabitCheck } from "@/components/habits/HabitCheck";
import {
  Bar,
  EmptyState,
  ErrorNote,
  Field,
  FormModal,
  LoadingList,
  PageHeader,
} from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta/")({
  head: () => ({
    meta: [
      { title: "Dieta — Life Hub" },
      { name: "description", content: "Registre suas refeições do dia e acompanhe sua evolução." },
      { property: "og:title", content: "Dieta — Life Hub" },
      { property: "og:description", content: "Refeições, checks diários e evolução visual." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DietPage,
});

type Meal = {
  id: string;
  name: string;
  time: string | null;
  kcal: number | null;
  note: string | null;
  days: number[];
  archived: boolean;
};
type MealLog = { id: string; meal_id: string; date: string };

const EMPTY = { name: "", time: "", kcal: "", note: "", days: [0, 1, 2, 3, 4, 5, 6] as number[] };

function useToggleMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ mealId, date, logId }: { mealId: string; date: string; logId?: string }) => {
      if (logId) {
        const { error } = await db.from("meal_logs").delete().eq("id", logId);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await db.from("meal_logs").insert({ meal_id: mealId, date, user_id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: (e: Error) => toast.error(e.message),
  });
}

function DietPage() {
  const today = toISODate();
  const weekday = new Date().getDay();
  const meals = useList<Meal>("meals", { order: { column: "time" } });
  const logs = useList<MealLog>("meal_logs", { eq: { date: today } });
  const save = useSave("meals", "Refeição salva");
  const remove = useRemove("meals", "Refeição excluída");
  const toggle = useToggleMeal();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [form, setForm] = useState(EMPTY);

  const list = (meals.data ?? []).filter((m) => !m.archived);
  const todayMeals = list.filter((m) => m.days.includes(weekday));
  const doneLogs = logs.data ?? [];
  const doneCount = doneLogs.filter((l) => todayMeals.some((m) => m.id === l.meal_id)).length;
  const rate = todayMeals.length ? (doneCount / todayMeals.length) * 100 : 0;
  const kcalDone = todayMeals
    .filter((m) => doneLogs.some((l) => l.meal_id === m.id))
    .reduce((a, m) => a + (m.kcal ?? 0), 0);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  return (
    <>
      <PageHeader
        title="Dieta"
        subtitle="Suas refeições do dia, marcadas uma a uma."
        action={
          <Button onClick={openNew}>
            <Plus className="size-4" /> Refeição
          </Button>
        }
      />

      <Link
        to="/dieta/evolucao"
        className="surface mb-6 flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
      >
        <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
          <Camera className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Evolução visual</p>
          <p className="text-xs text-muted-foreground">Tire uma foto por dia e compare lado a lado.</p>
        </div>
      </Link>

      <ErrorNote error={meals.error} />

      {todayMeals.length > 0 && (
        <section className="surface mb-6 px-4 py-4">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="text-sm font-medium">Conclusão de hoje</p>
            <span className="num text-sm text-muted-foreground">
              {doneCount}/{todayMeals.length} · {Math.round(rate)}%
            </span>
          </div>
          <Bar value={rate} />
          <p className="mt-2 text-xs text-muted-foreground">
            {kcalDone > 0 ? `${kcalDone} kcal registradas hoje · ` : ""}
            As refeições reiniciam automaticamente todo dia.
          </p>
        </section>
      )}

      {meals.isLoading ? (
        <LoadingList />
      ) : list.length === 0 ? (
        <EmptyState
          title="Nenhuma refeição cadastrada."
          description="Monte seu plano alimentar e marque cada refeição ao longo do dia."
          actionLabel="Adicionar refeição"
          onAction={openNew}
        />
      ) : (
        <ul className="space-y-2">
          {list.map((meal) => {
            const scheduled = meal.days.includes(weekday);
            const log = doneLogs.find((l) => l.meal_id === meal.id);
            return (
              <li key={meal.id} className="surface flex items-center gap-3 px-4 py-3.5">
                {scheduled ? (
                  <HabitCheck
                    checked={!!log}
                    label={meal.name}
                    onToggle={() =>
                      toggle.mutate({
                        mealId: meal.id,
                        date: today,
                        ...(log ? { logId: log.id } : {}),
                      })
                    }
                  />
                ) : (
                  <span className="size-7 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-sm font-medium",
                      log && "text-muted-foreground line-through",
                    )}
                  >
                    {meal.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {meal.time ? `${meal.time} · ` : ""}
                    {meal.kcal ? `${meal.kcal} kcal · ` : ""}
                    {meal.days.length === 7 ? "todos os dias" : meal.days.map((d) => WEEKDAYS[d]).join(", ")}
                  </p>
                  {meal.note && <p className="mt-1 text-xs text-muted-foreground">{meal.note}</p>}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar refeição"
                  onClick={() => {
                    setEditing(meal);
                    setForm({
                      name: meal.name,
                      time: meal.time ?? "",
                      kcal: meal.kcal ? String(meal.kcal) : "",
                      note: meal.note ?? "",
                      days: meal.days,
                    });
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir refeição"
                  onClick={() => remove.mutate(meal.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <FormModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? "Editar refeição" : "Nova refeição"}
      >
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await save.mutateAsync({
              ...(editing ? { id: editing.id } : {}),
              name: form.name.trim(),
              time: form.time || null,
              kcal: form.kcal ? Number(form.kcal) : null,
              note: form.note || null,
              days: form.days,
            });
            setOpen(false);
            setEditing(null);
            setForm(EMPTY);
          }}
        >
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Café da manhã"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Horário">
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
            <Field label="Calorias (kcal)">
              <Input
                type="number"
                min={0}
                value={form.kcal}
                onChange={(e) => setForm({ ...form, kcal: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Dias da semana">
            <div className="flex gap-1.5">
              {WEEKDAYS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      days: form.days.includes(i)
                        ? form.days.filter((x) => x !== i)
                        : [...form.days, i].sort(),
                    })
                  }
                  className={cn(
                    "size-9 rounded-full border text-xs",
                    form.days.includes(i)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground",
                  )}
                >
                  {d[0]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Observação">
            <Textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Ovos, aveia e fruta"
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar refeição
          </Button>
        </form>
      </FormModal>
    </>
  );
}
