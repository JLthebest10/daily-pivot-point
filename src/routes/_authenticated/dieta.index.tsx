import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Activity, Camera, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  currentUserId,
  db,
  optimisticDelete,
  optimisticInsert,
  restoreTable,
  useList,
  useRemove,
  useSave,
  type Row,
} from "@/lib/db";
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
type MealOption = {
  id: string;
  meal_id: string;
  name: string;
  kcal: number | null;
  note: string | null;
  order_index: number;
};
type MealLog = { id: string; meal_id: string; date: string; option_id: string | null };
type HabitRow = { id: string; name: string; category: string; archived: boolean; target: number };

const EMPTY = {
  name: "",
  time: "",
  kcal: "",
  note: "",
  days: [0, 1, 2, 3, 4, 5, 6] as number[],
  options: "",
};

function useToggleMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      mealId,
      date,
      logId,
      optionId,
    }: {
      mealId: string;
      date: string;
      logId?: string;
      optionId?: string | null;
    }) => {
      if (logId) {
        const { error } = await db.from("meal_logs").delete().eq("id", logId);
        if (error) throw error;
        return;
      }
      const user_id = await currentUserId();
      const { error } = await db
        .from("meal_logs")
        .insert({ meal_id: mealId, date, user_id, option_id: optionId ?? null });
      if (error) throw error;
    },
    // Check imediato na interface; persistência em segundo plano.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["meal_logs"] });
      const snapshots = vars.logId
        ? optimisticDelete(qc, "meal_logs", vars.logId)
        : optimisticInsert(qc, "meal_logs", {
            id: `optimistic-${Math.random().toString(36).slice(2)}`,
            meal_id: vars.mealId,
            date: vars.date,
            option_id: vars.optionId ?? null,
            created_at: new Date().toISOString(),
          } as Row);
      return { snapshots };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.snapshots) restoreTable(qc, ctx.snapshots);
      toast.error(e.message || "Não foi possível salvar. Tente novamente.");
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["meal_logs"] }),
  });
}

function DietPage() {
  const today = toISODate();
  const weekday = new Date().getDay();
  const qc = useQueryClient();
  const meals = useList<Meal>("meals", { order: { column: "time" } });
  const options = useList<MealOption>("meal_options", { order: { column: "order_index" } });
  const logs = useList<MealLog>("meal_logs", { eq: { date: today } });
  const habits = useList<HabitRow>("habits", { eq: { archived: false } });
  const save = useSave("meals", "Refeição salva");
  const remove = useRemove("meals", "Refeição excluída");
  const toggle = useToggleMeal();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Meal | null>(null);
  const [form, setForm] = useState(EMPTY);
  /** Opção escolhida antes de marcar o check. */
  const [picked, setPicked] = useState<Record<string, string | null>>({});
  const habitMarked = useRef(false);

  const list = (meals.data ?? []).filter((m) => !m.archived);
  const optionsOf = (mealId: string) => (options.data ?? []).filter((o) => o.meal_id === mealId);
  const todayMeals = list.filter((m) => m.days.includes(weekday));
  const doneLogs = logs.data ?? [];
  const doneCount = doneLogs.filter((l) => todayMeals.some((m) => m.id === l.meal_id)).length;
  const rate = todayMeals.length ? (doneCount / todayMeals.length) * 100 : 0;
  const kcalDone = todayMeals
    .filter((m) => doneLogs.some((l) => l.meal_id === m.id))
    .reduce((a, m) => {
      const log = doneLogs.find((l) => l.meal_id === m.id);
      const opt = log?.option_id ? optionsOf(m.id).find((o) => o.id === log.option_id) : null;
      return a + (opt?.kcal ?? m.kcal ?? 0);
    }, 0);

  /** Ao concluir todas as refeições do dia, marca o hábito de dieta automaticamente. */
  useEffect(() => {
    if (habitMarked.current) return;
    if (todayMeals.length === 0 || doneCount < todayMeals.length) return;
    const candidates = (habits.data ?? []).filter(
      (h) =>
        h.category?.toLowerCase() === "dieta" || /diet|aliment|refei|nutri/i.test(h.name ?? ""),
    );
    if (candidates.length === 0) return;
    habitMarked.current = true;
    void (async () => {
      const user_id = await currentUserId();
      let marked = 0;
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
        marked += 1;
      }
      if (marked > 0) {
        qc.invalidateQueries({ queryKey: ["habit_completions"] });
        toast.success("Todas as refeições concluídas — hábito de dieta marcado!");
      }
    })();
  }, [doneCount, todayMeals.length, habits.data, today, qc]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }

  /** Regrava as opções de substituição da refeição. */
  async function saveOptions(mealId: string, text: string) {
    const user_id = await currentUserId();
    await db.from("meal_options").delete().eq("meal_id", mealId);
    const rows = text
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, i) => {
        const [name, kcal] = line.split("|").map((p) => p.trim());
        return {
          user_id,
          meal_id: mealId,
          name: name || "Opção",
          kcal: kcal ? Number(kcal) || null : null,
          order_index: i,
        };
      });
    if (rows.length) await db.from("meal_options").insert(rows);
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

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <Link
          to="/dieta/evolucao"
          className="surface flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Camera className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Evolução visual</p>
            <p className="text-xs text-muted-foreground">Uma foto por dia, lado a lado.</p>
          </div>
        </Link>
        <Link
          to="/dieta/consistencia"
          className="surface flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40"
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
            <Activity className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Consistência</p>
            <p className="text-xs text-muted-foreground">Gráfico dos últimos 30 dias.</p>
          </div>
        </Link>
      </div>

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
            const opts = optionsOf(meal.id);
            const selected = log ? log.option_id : (picked[meal.id] ?? null);
            const selectedOpt = selected ? opts.find((o) => o.id === selected) : null;
            return (
              <li key={meal.id} className="surface px-4 py-3.5">
                <div className="flex items-center gap-3">
                  {scheduled ? (
                    <HabitCheck
                      checked={!!log}
                      label={meal.name}
                      onToggle={() =>
                        toggle.mutate({
                          mealId: meal.id,
                          date: today,
                          ...(log ? { logId: log.id } : { optionId: picked[meal.id] ?? null }),
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
                      {selectedOpt ? ` · ${selectedOpt.name}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {meal.time ? `${meal.time} · ` : ""}
                      {(selectedOpt?.kcal ?? meal.kcal)
                        ? `${selectedOpt?.kcal ?? meal.kcal} kcal · `
                        : ""}
                      {meal.days.length === 7
                        ? "todos os dias"
                        : meal.days.map((d) => WEEKDAYS[d]).join(", ")}
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
                        options: opts
                          .map((o) => (o.kcal ? `${o.name} | ${o.kcal}` : o.name))
                          .join("\n"),
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
                </div>

                {opts.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pl-10">
                    <OptionChip
                      label={meal.name}
                      active={!selected}
                      disabled={!!log}
                      onClick={() => setPicked({ ...picked, [meal.id]: null })}
                    />
                    {opts.map((o) => (
                      <OptionChip
                        key={o.id}
                        label={o.kcal ? `${o.name} · ${o.kcal} kcal` : o.name}
                        active={selected === o.id}
                        disabled={!!log}
                        onClick={() => setPicked({ ...picked, [meal.id]: o.id })}
                      />
                    ))}
                  </div>
                )}
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
            const saved = (await save.mutateAsync({
              ...(editing ? { id: editing.id } : {}),
              name: form.name.trim(),
              time: form.time || null,
              kcal: form.kcal ? Number(form.kcal) : null,
              note: form.note || null,
              days: form.days,
            })) as { id: string };
            await saveOptions(saved.id, form.options);
            qc.invalidateQueries({ queryKey: ["meal_options"] });
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
          <Field label="Opções de substituição (uma por linha: nome | kcal)">
            <Textarea
              rows={3}
              value={form.options}
              onChange={(e) => setForm({ ...form, options: e.target.value })}
              placeholder={"Tapioca com ovo | 320\nIogurte com granola | 280"}
            />
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

function OptionChip({
  label,
  active,
  disabled,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-primary/60",
        disabled && "opacity-60",
      )}
    >
      {label}
    </button>
  );
}
