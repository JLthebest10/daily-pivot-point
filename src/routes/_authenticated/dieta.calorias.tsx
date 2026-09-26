import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronLeft, ChevronRight, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import {
  Bar as RBar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import { currentUserId, db, useList, useRemove, useSave } from "@/lib/db";
import { WEEKDAYS, addDays, fromISODate, shortDate, startOfWeek, toISODate } from "@/lib/format";
import {
  ACTIVITY_LEVELS,
  EXERCISE_TYPES,
  MEAL_CATEGORIES,
  calculateBMR,
  calculateDailyCalories,
  calculateDailyDeficit,
  calculateExerciseCalories,
  calculateTDEE,
  calculateWeeklyDeficit,
  kcal,
  movingAverage,
  type DayBreakdown,
  type Sex,
} from "@/lib/calories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bar, EmptyState, Field, FormModal, PageHeader, SectionTitle, StatCard } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dieta/calorias")({
  head: () => ({
    meta: [
      { title: "Acompanhamento calórico — Life Hub" },
      { name: "description", content: "Calorias ingeridas, exercícios, déficit diário e semanal e evolução do peso." },
      { property: "og:title", content: "Acompanhamento calórico — Life Hub" },
      { property: "og:description", content: "Déficit calórico transparente, dia a dia e semana a semana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CaloriesPage,
});

type Profile = {
  id: string;
  name: string | null;
  sex: Sex;
  age: number | null;
  weight_kg: number | null;
  height_cm: number | null;
  body_fat: number | null;
  bmr: number | null;
  bmr_manual: boolean;
  activity_level: string;
  add_exercise: boolean;
  start_weight: number | null;
  goal_weight: number | null;
  start_body_fat: number | null;
  goal_body_fat: number | null;
  daily_kcal_goal: number | null;
  desired_deficit: number | null;
};
type DaySnap = { id: string; date: string; bmr: number; tdee: number; add_exercise: boolean; kcal_goal: number | null };
type Entry = {
  id: string;
  date: string;
  kind: "meal" | "exercise";
  category: string;
  name: string;
  description: string | null;
  quantity: string | null;
  kcal: number;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  time: string | null;
  duration_min: number | null;
  is_free: boolean;
  note: string | null;
};
type SavedMeal = { id: string; name: string; category: string; description: string | null; kcal: number; protein: number | null; carbs: number | null; fat: number | null };
type Weight = { id: string; date: string; weight_kg: number; body_fat: number | null; note: string | null };

type Tab = "hoje" | "semana" | "peso" | "perfil";

const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));
const str = (v: number | null | undefined) => (v == null ? "" : String(v));

function CaloriesPage() {
  const [tab, setTab] = useState<Tab>("hoje");
  const profiles = useList<Profile>("calorie_profiles");
  const snaps = useList<DaySnap>("calorie_days", { order: { column: "date" } });
  const profile = profiles.data?.[0] ?? null;

  /** Parâmetros usados num dia: foto salva daquele dia → última foto anterior → perfil atual. */
  function paramsFor(date: string) {
    const list = snaps.data ?? [];
    const exact = list.find((s) => s.date === date);
    const prev = [...list].reverse().find((s) => s.date < date);
    const snap = exact ?? prev;
    if (snap && (exact || !profile || date < toISODate()))
      return { tdee: Number(snap.tdee), bmr: Number(snap.bmr), addExercise: snap.add_exercise, goal: snap.kcal_goal };
    const bmr = Number(profile?.bmr ?? 0);
    return {
      bmr,
      tdee: calculateTDEE(bmr, profile?.activity_level ?? "sedentary"),
      addExercise: profile?.add_exercise ?? true,
      goal: profile?.daily_kcal_goal ?? null,
    };
  }

  return (
    <>
      <Link to="/dieta" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dieta
      </Link>
      <PageHeader title="Acompanhamento calórico" subtitle="Consumo, exercícios e déficit — com a conta à mostra." />

      <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
        {(
          [
            ["hoje", "Hoje"],
            ["semana", "Semana"],
            ["peso", "Peso e meta"],
            ["perfil", "Perfil"],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={cn(
              "shrink-0 rounded-full border px-4 py-1.5 text-sm transition-colors",
              tab === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground",
            )}
          >
            {l}
          </button>
        ))}
      </div>

      {!profiles.isLoading && !profile?.bmr && tab !== "perfil" && (
        <div className="surface mb-5 flex items-center justify-between gap-3 px-4 py-3">
          <p className="text-sm">Preencha seu perfil para calcular o gasto diário.</p>
          <Button size="sm" onClick={() => setTab("perfil")}>Preencher</Button>
        </div>
      )}

      {tab === "hoje" && <DayView paramsFor={paramsFor} profile={profile} />}
      {tab === "semana" && <WeekView paramsFor={paramsFor} />}
      {tab === "peso" && <WeightView profile={profile} />}
      {tab === "perfil" && <ProfileView profile={profile} />}
    </>
  );
}

type ParamsFor = (date: string) => { tdee: number; bmr: number; addExercise: boolean; goal: number | null };

/** Grava a foto dos parâmetros do dia para o histórico não mudar depois. */
async function ensureSnapshot(date: string, profile: Profile | null) {
  if (!profile?.bmr) return;
  const user_id = await currentUserId();
  const { data } = await db.from("calorie_days").select("id").eq("date", date).maybeSingle();
  if (data) return;
  await db.from("calorie_days").insert({
    user_id,
    date,
    bmr: profile.bmr,
    tdee: calculateTDEE(Number(profile.bmr), profile.activity_level),
    add_exercise: profile.add_exercise,
    kcal_goal: profile.daily_kcal_goal,
  });
}

/* ---------------------------------------------------------------- HOJE */

const EMPTY_MEAL = { category: "Almoço", name: "", description: "", quantity: "", kcal: "", protein: "", carbs: "", fat: "", time: "", is_free: false, save: false };
const EMPTY_EX = { category: "Musculação", name: "", duration_min: "", kcal: "", time: "", note: "" };

function DayView({ paramsFor, profile }: { paramsFor: ParamsFor; profile: Profile | null }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(toISODate());
  const entries = useList<Entry>("calorie_entries", { eq: { date }, order: { column: "created_at" } });
  const saved = useList<SavedMeal>("saved_meals", { order: { column: "name" } });
  const weights = useList<Weight>("weight_logs", { eq: { date } });
  const save = useSave("calorie_entries");
  const remove = useRemove("calorie_entries", "Registro excluído");
  const saveMeal = useSave("saved_meals", "Refeição salva no banco");
  const removeSaved = useRemove("saved_meals", "Removida do banco");

  const [mealOpen, setMealOpen] = useState(false);
  const [exOpen, setExOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [mf, setMf] = useState(EMPTY_MEAL);
  const [ef, setEf] = useState(EMPTY_EX);

  const all = entries.data ?? [];
  const meals = all.filter((e) => e.kind === "meal");
  const exercises = all.filter((e) => e.kind === "exercise");
  const p = paramsFor(date);
  const d = calculateDailyDeficit({
    tdee: p.tdee,
    consumed: calculateDailyCalories(meals),
    exercise: calculateExerciseCalories(exercises),
    addExercise: p.addExercise,
  });
  const target = p.goal ?? d.totalExpenditure;
  const freeKcal = calculateDailyCalories(meals.filter((m) => m.is_free));
  const isToday = date === toISODate();

  // Refeições já usadas: únicas por nome, para adicionar rápido.
  const recent = useList<Entry>("calorie_entries", { eq: { kind: "meal" }, order: { column: "created_at", ascending: false } });
  const quick = useMemo(() => {
    const seen = new Set<string>();
    const out: { name: string; category: string; kcal: number; description: string | null; protein: number | null; carbs: number | null; fat: number | null; saved?: string }[] = [];
    for (const s of saved.data ?? []) {
      seen.add(s.name.toLowerCase());
      out.push({ ...s, saved: s.id });
    }
    for (const e of recent.data ?? []) {
      const k = e.name.toLowerCase();
      if (!e.name || seen.has(k)) continue;
      seen.add(k);
      out.push(e);
      if (out.length >= 14) break;
    }
    return out;
  }, [saved.data, recent.data]);

  async function add(values: Record<string, unknown>) {
    await save.mutateAsync({ date, ...values });
    void ensureSnapshot(date, profile).then(() => qc.invalidateQueries({ queryKey: ["calorie_days"] }));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="Dia anterior" onClick={() => setDate(toISODate(addDays(fromISODate(date), -1)))}>
          <ChevronLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} max={toISODate()} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-auto" />
          {!isToday && (
            <Button variant="outline" size="sm" onClick={() => setDate(toISODate())}>Hoje</Button>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Próximo dia" disabled={isToday} onClick={() => setDate(toISODate(addDays(fromISODate(date), 1)))}>
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <section className="surface px-4 py-4">
        <p className="text-xs text-muted-foreground">{isToday ? "Saldo de hoje" : `Saldo de ${shortDate(date)}`}</p>
        <p className={cn("num mt-1 text-3xl font-semibold tracking-tight", d.balance >= 0 ? "text-primary" : "text-destructive")}>
          {d.balance >= 0 ? "Déficit" : "Superávit"} de {kcal(Math.abs(d.balance))}
        </p>
        <div className="mt-4 mb-1 flex justify-between text-xs text-muted-foreground">
          <span>Calorias consumidas</span>
          <span className="num">{Math.round(d.consumed)} / {Math.round(target)} kcal</span>
        </div>
        <Bar value={target ? (d.consumed / target) * 100 : 0} />
        <Breakdown d={d} />
        {freeKcal > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">Refeição livre hoje: {kcal(freeKcal)} (já incluída no consumo).</p>
        )}
        {weights.data?.[0] && <p className="mt-1 text-xs text-muted-foreground">Peso registrado: {weights.data[0].weight_kg} kg</p>}
      </section>

      <section>
        <SectionTitle
          action={
            <Button size="sm" onClick={() => { setEditing(null); setMf(EMPTY_MEAL); setMealOpen(true); }}>
              <Plus className="size-4" /> Refeição
            </Button>
          }
        >
          Refeições
        </SectionTitle>
        {quick.length > 0 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            {quick.map((q) => (
              <button
                key={q.name}
                onClick={() => add({ kind: "meal", category: q.category, name: q.name, description: q.description, kcal: q.kcal, protein: q.protein, carbs: q.carbs, fat: q.fat, time: new Date().toTimeString().slice(0, 5) })}
                className="flex shrink-0 items-center gap-1 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground hover:border-primary/60"
              >
                {q.saved && <Star className="size-3 fill-current" />}+ {q.name} · {Math.round(q.kcal)}
              </button>
            ))}
          </div>
        )}
        {meals.length === 0 ? (
          <EmptyState title="Nenhuma refeição neste dia." description="Toque em + Refeição ou num atalho acima." />
        ) : (
          <ul className="space-y-2">
            {meals.map((m) => (
              <li key={m.id} className="surface flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {m.name || m.category}
                    {m.is_free && <span className="ml-2 rounded-full bg-accent px-2 py-0.5 text-[10px] text-accent-foreground">livre</span>}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[m.time, m.category, m.description, m.quantity].filter(Boolean).join(" · ")}
                    {m.protein || m.carbs || m.fat ? ` · P${m.protein ?? 0} C${m.carbs ?? 0} G${m.fat ?? 0}` : ""}
                  </p>
                </div>
                <span className="num text-sm font-semibold">{Math.round(m.kcal)}</span>
                <Button variant="ghost" size="icon" aria-label="Duplicar" onClick={() => add({ kind: "meal", category: m.category, name: m.name, description: m.description, quantity: m.quantity, kcal: m.kcal, protein: m.protein, carbs: m.carbs, fat: m.fat, time: m.time, is_free: m.is_free })}>
                  <Copy className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => {
                  setEditing(m.id);
                  setMf({ category: m.category, name: m.name, description: m.description ?? "", quantity: m.quantity ?? "", kcal: str(m.kcal), protein: str(m.protein), carbs: str(m.carbs), fat: str(m.fat), time: m.time ?? "", is_free: m.is_free, save: false });
                  setMealOpen(true);
                }}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove.mutate(m.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-right text-sm">Total consumido: <b className="num">{kcal(d.consumed)}</b></p>
      </section>

      <section>
        <SectionTitle
          action={
            <Button size="sm" variant="outline" onClick={() => { setEditing(null); setEf(EMPTY_EX); setExOpen(true); }}>
              <Plus className="size-4" /> Exercício
            </Button>
          }
        >
          Gasto com exercícios
        </SectionTitle>
        {exercises.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum exercício registrado.</p>
        ) : (
          <ul className="space-y-2">
            {exercises.map((x) => (
              <li key={x.id} className="surface flex items-center gap-2 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{x.name || x.category}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[x.time, x.category, x.duration_min ? `${x.duration_min} min` : null, x.note].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="num text-sm font-semibold">{Math.round(x.kcal)}</span>
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => {
                  setEditing(x.id);
                  setEf({ category: x.category, name: x.name, duration_min: str(x.duration_min), kcal: str(x.kcal), time: x.time ?? "", note: x.note ?? "" });
                  setExOpen(true);
                }}>
                  <Pencil className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove.mutate(x.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-right text-sm">Total em exercícios: <b className="num">{kcal(d.exercise)}</b></p>
        {!p.addExercise && d.exercise > 0 && (
          <p className="mt-1 text-right text-xs text-muted-foreground">Não somado ao gasto: seu nível de atividade já inclui os treinos.</p>
        )}
      </section>

      {(saved.data?.length ?? 0) > 0 && (
        <section>
          <SectionTitle>Banco de refeições</SectionTitle>
          <ul className="space-y-1.5">
            {saved.data!.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-sm">
                <span className="flex-1 truncate">{s.name}</span>
                <span className="num text-muted-foreground">{Math.round(s.kcal)} kcal</span>
                <Button variant="ghost" size="icon" aria-label="Remover do banco" onClick={() => removeSaved.mutate(s.id)}>
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <FormModal open={mealOpen} onOpenChange={setMealOpen} title={editing ? "Editar refeição" : "Nova refeição"}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = {
              kind: "meal",
              category: mf.is_free ? "Livre" : mf.category,
              name: mf.name.trim() || mf.category,
              description: mf.description || null,
              quantity: mf.quantity || null,
              kcal: num(mf.kcal) ?? 0,
              protein: num(mf.protein),
              carbs: num(mf.carbs),
              fat: num(mf.fat),
              time: mf.time || null,
              is_free: mf.is_free || mf.category === "Livre",
            };
            if (editing) await save.mutateAsync({ id: editing, ...values });
            else await add(values);
            if (mf.save) {
              await saveMeal.mutateAsync({ name: values.name, category: values.category, description: values.description, kcal: values.kcal, protein: values.protein, carbs: values.carbs, fat: values.fat });
            }
            setMealOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorias (kcal)">
              <Input autoFocus inputMode="decimal" required value={mf.kcal} onChange={(e) => setMf({ ...mf, kcal: e.target.value })} placeholder="650" />
            </Field>
            <Field label="Horário">
              <Input type="time" value={mf.time} onChange={(e) => setMf({ ...mf, time: e.target.value })} />
            </Field>
          </div>
          <Field label="Categoria">
            <div className="flex flex-wrap gap-1.5">
              {MEAL_CATEGORIES.map((c) => (
                <button type="button" key={c} onClick={() => setMf({ ...mf, category: c, is_free: c === "Livre" ? true : mf.is_free })}
                  className={cn("rounded-full border px-3 py-1 text-xs", mf.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nome">
            <Input value={mf.name} onChange={(e) => setMf({ ...mf, name: e.target.value })} placeholder="Almoço" />
          </Field>
          <Field label="Alimentos / descrição">
            <Input value={mf.description} onChange={(e) => setMf({ ...mf, description: e.target.value })} placeholder="Arroz + feijão + frango" />
          </Field>
          <Field label="Quantidade (opcional)">
            <Input value={mf.quantity} onChange={(e) => setMf({ ...mf, quantity: e.target.value })} placeholder="1 prato" />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Proteína (g)"><Input inputMode="decimal" value={mf.protein} onChange={(e) => setMf({ ...mf, protein: e.target.value })} /></Field>
            <Field label="Carbo (g)"><Input inputMode="decimal" value={mf.carbs} onChange={(e) => setMf({ ...mf, carbs: e.target.value })} /></Field>
            <Field label="Gordura (g)"><Input inputMode="decimal" value={mf.fat} onChange={(e) => setMf({ ...mf, fat: e.target.value })} /></Field>
          </div>
          <label className="flex items-center justify-between text-sm">
            Refeição livre <Switch checked={mf.is_free} onCheckedChange={(v) => setMf({ ...mf, is_free: v })} />
          </label>
          {!editing && (
            <label className="flex items-center justify-between text-sm">
              Salvar no banco de refeições <Switch checked={mf.save} onCheckedChange={(v) => setMf({ ...mf, save: v })} />
            </label>
          )}
          <Button type="submit" className="w-full" disabled={save.isPending}>Salvar</Button>
        </form>
      </FormModal>

      <FormModal open={exOpen} onOpenChange={setExOpen} title={editing ? "Editar exercício" : "Novo exercício"}>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const values = {
              kind: "exercise",
              category: ef.category,
              name: ef.name.trim() || ef.category,
              duration_min: num(ef.duration_min),
              kcal: num(ef.kcal) ?? 0,
              time: ef.time || null,
              note: ef.note || null,
            };
            if (editing) await save.mutateAsync({ id: editing, ...values });
            else await add(values);
            setExOpen(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label="Calorias gastas">
              <Input autoFocus inputMode="decimal" required value={ef.kcal} onChange={(e) => setEf({ ...ef, kcal: e.target.value })} placeholder="300" />
            </Field>
            <Field label="Duração (min)">
              <Input inputMode="numeric" value={ef.duration_min} onChange={(e) => setEf({ ...ef, duration_min: e.target.value })} placeholder="60" />
            </Field>
          </div>
          <Field label="Tipo">
            <div className="flex flex-wrap gap-1.5">
              {EXERCISE_TYPES.map((c) => (
                <button type="button" key={c} onClick={() => setEf({ ...ef, category: c })}
                  className={cn("rounded-full border px-3 py-1 text-xs", ef.category === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                  {c}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Nome / descrição"><Input value={ef.name} onChange={(e) => setEf({ ...ef, name: e.target.value })} placeholder="Treino A" /></Field>
          <Field label="Horário"><Input type="time" value={ef.time} onChange={(e) => setEf({ ...ef, time: e.target.value })} /></Field>
          <Field label="Observações"><Textarea rows={2} value={ef.note} onChange={(e) => setEf({ ...ef, note: e.target.value })} /></Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>Salvar</Button>
        </form>
      </FormModal>
    </div>
  );
}

/** A conta do saldo, linha por linha. */
function Breakdown({ d }: { d: DayBreakdown }) {
  const row = (label: string, value: string, strong = false) => (
    <div className={cn("flex justify-between", strong && "font-semibold text-foreground")}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  );
  return (
    <div className="mt-4 space-y-1 border-t border-border pt-3 text-sm text-muted-foreground">
      {row("Gasto diário estimado", kcal(d.tdee))}
      {row("+ Exercícios", d.exerciseCounted === d.exercise ? kcal(d.exercise) : `${kcal(0)} (já no TDEE)`)}
      {row("= Gasto total", kcal(d.totalExpenditure), true)}
      {row("− Consumo", kcal(d.consumed))}
      {row(d.balance >= 0 ? "= Déficit" : "= Superávit", kcal(Math.abs(d.balance)), true)}
    </div>
  );
}

/* -------------------------------------------------------------- SEMANA */

type Range = "semana" | "anterior" | "7d" | "30d" | "custom";

function WeekView({ paramsFor }: { paramsFor: ParamsFor }) {
  const [range, setRange] = useState<Range>("semana");
  const today = new Date();
  const [custom, setCustom] = useState({ from: toISODate(addDays(today, -13)), to: toISODate(today) });
  const [from, to] = (() => {
    const wk = startOfWeek(today);
    switch (range) {
      case "semana": return [toISODate(wk), toISODate(addDays(wk, 6))];
      case "anterior": return [toISODate(addDays(wk, -7)), toISODate(addDays(wk, -1))];
      case "7d": return [toISODate(addDays(today, -6)), toISODate(today)];
      case "30d": return [toISODate(addDays(today, -29)), toISODate(today)];
      default: return [custom.from, custom.to];
    }
  })();
  const entries = useList<Entry>("calorie_entries", { gte: ["date", from], lte: ["date", to] });
  const todayISO = toISODate();

  const days = useMemo(() => {
    const out: { date: string; d: DayBreakdown }[] = [];
    const end = to < todayISO ? to : todayISO;
    for (let c = fromISODate(from); toISODate(c) <= end; c = addDays(c, 1)) {
      const iso = toISODate(c);
      const rows = (entries.data ?? []).filter((e) => e.date === iso);
      const p = paramsFor(iso);
      out.push({
        date: iso,
        d: calculateDailyDeficit({
          tdee: p.tdee,
          consumed: calculateDailyCalories(rows.filter((r) => r.kind === "meal")),
          exercise: calculateExerciseCalories(rows.filter((r) => r.kind === "exercise")),
          addExercise: p.addExercise,
        }),
      });
    }
    return out;
  }, [entries.data, from, to, todayISO, paramsFor]);

  // Só conta dias com algum consumo registrado para não inflar o déficit.
  const logged = days.filter((x) => x.d.consumed > 0);
  const w = calculateWeeklyDeficit(logged.map((x) => x.d));
  const freeKcal = calculateDailyCalories((entries.data ?? []).filter((e) => e.is_free));
  const chart = days.map((x) => ({ label: `${WEEKDAYS[fromISODate(x.date).getDay()]} ${x.date.slice(8)}`, saldo: x.d.consumed > 0 ? x.d.balance : 0 }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1.5">
        {([["semana", "Semana atual"], ["anterior", "Semana anterior"], ["7d", "Últimos 7 dias"], ["30d", "Últimos 30 dias"], ["custom", "Personalizado"]] as [Range, string][]).map(([k, l]) => (
          <button key={k} onClick={() => setRange(k)}
            className={cn("rounded-full border px-3 py-1 text-xs", range === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
            {l}
          </button>
        ))}
      </div>
      {range === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="De"><Input type="date" value={custom.from} onChange={(e) => setCustom({ ...custom, from: e.target.value })} /></Field>
          <Field label="Até"><Input type="date" value={custom.to} onChange={(e) => setCustom({ ...custom, to: e.target.value })} /></Field>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={w.balance >= 0 ? "Déficit no período" : "Superávit no período"} value={kcal(Math.abs(w.balance))} tone={w.balance >= 0 ? "positive" : "negative"} hint={`${logged.length} dia(s) com registro`} />
        <StatCard label="Média diária do saldo" value={kcal(w.avgBalance)} tone={w.avgBalance >= 0 ? "positive" : "negative"} />
        <StatCard label="Consumo total" value={kcal(w.consumed)} hint={`média ${kcal(w.avgConsumed)}/dia`} />
        <StatCard label="Gasto total" value={kcal(w.expenditure)} hint={`média ${kcal(w.avgExpenditure)}/dia`} />
        <StatCard label="Exercícios" value={kcal(w.exercise)} />
        <StatCard label="Refeições livres" value={kcal(freeKcal)} hint="já incluídas no consumo" />
      </div>

      <section className="surface px-2 py-4">
        <p className="mb-2 px-2 text-sm font-medium">Saldo por dia <span className="text-xs text-muted-foreground">(acima = déficit)</span></p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
              <YAxis tick={{ fontSize: 10 }} width={40} stroke="var(--muted-foreground)" />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" />
              <Tooltip formatter={(v: number) => [kcal(Math.abs(v)), v >= 0 ? "Déficit" : "Superávit"]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
              <RBar dataKey="saldo" radius={[4, 4, 0, 0]}>
                {chart.map((c, i) => <Cell key={i} fill={c.saldo >= 0 ? "var(--primary)" : "var(--destructive)"} />)}
              </RBar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <ul className="space-y-2">
        {[...days].reverse().map(({ date, d }) => (
          <li key={date} className="surface grid grid-cols-4 gap-2 px-4 py-3 text-xs">
            <div>
              <p className="font-medium text-foreground">{WEEKDAYS[fromISODate(date).getDay()]}</p>
              <p className="text-muted-foreground">{shortDate(date)}</p>
            </div>
            <div><p className="text-muted-foreground">Consumo</p><p className="num">{Math.round(d.consumed)}</p></div>
            <div><p className="text-muted-foreground">Gasto</p><p className="num">{Math.round(d.totalExpenditure)}{d.exercise ? <span className="text-muted-foreground"> ({Math.round(d.exercise)} ex)</span> : null}</p></div>
            <div>
              <p className="text-muted-foreground">Saldo</p>
              <p className={cn("num font-semibold", d.consumed === 0 ? "text-muted-foreground" : d.balance >= 0 ? "text-primary" : "text-destructive")}>
                {d.consumed === 0 ? "—" : `${d.balance >= 0 ? "−" : "+"}${Math.abs(Math.round(d.balance))}`}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---------------------------------------------------------------- PESO */

function WeightView({ profile }: { profile: Profile | null }) {
  const weights = useList<Weight>("weight_logs", { order: { column: "date" } });
  const save = useSave("weight_logs", "Peso registrado");
  const remove = useRemove("weight_logs", "Registro excluído");
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ date: toISODate(), weight_kg: "", body_fat: "", note: "" });

  const list = weights.data ?? [];
  const ma = movingAverage(list.map((w) => Number(w.weight_kg)));
  const chart = list.map((w, i) => ({ label: shortDate(w.date), peso: Number(w.weight_kg), media: ma[i] }));
  const first = list[0], last = list[list.length - 1];
  const startW = Number(profile?.start_weight ?? first?.weight_kg ?? 0);
  const currentW = Number(last?.weight_kg ?? profile?.weight_kg ?? 0);
  const weekAgo = toISODate(addDays(new Date(), -6));
  const weekList = list.filter((w) => w.date >= weekAgo);
  const weekAvg = weekList.length ? weekList.reduce((a, w) => a + Number(w.weight_kg), 0) / weekList.length : 0;
  const goalW = Number(profile?.goal_weight ?? 0);
  const wProgress = goalW && startW !== goalW ? ((startW - currentW) / (startW - goalW)) * 100 : 0;
  const lastBf = [...list].reverse().find((w) => w.body_fat != null)?.body_fat ?? profile?.body_fat ?? null;
  const startBf = Number(profile?.start_body_fat ?? list.find((w) => w.body_fat != null)?.body_fat ?? 0);
  const goalBf = Number(profile?.goal_body_fat ?? 0);
  const bfProgress = goalBf && lastBf != null && startBf !== goalBf ? ((startBf - Number(lastBf)) / (startBf - goalBf)) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Peso inicial" value={startW ? `${startW} kg` : "—"} />
        <StatCard label="Peso atual" value={currentW ? `${currentW} kg` : "—"} />
        <StatCard label="Diferença" value={startW && currentW ? `${(currentW - startW).toFixed(1)} kg` : "—"} tone={currentW < startW ? "positive" : undefined} />
        <StatCard label="Média dos últimos 7 dias" value={weekAvg ? `${weekAvg.toFixed(1)} kg` : "—"} />
      </div>

      {goalW > 0 && (
        <section className="surface space-y-3 px-4 py-4">
          <div>
            <div className="mb-1 flex justify-between text-sm"><span>Peso</span><span className="num">{startW} → {goalW} kg</span></div>
            <Bar value={wProgress} />
            <p className="mt-1 text-xs text-muted-foreground">{Math.max(0, Math.round(wProgress))}% do caminho, com base nos registros.</p>
          </div>
          {goalBf > 0 && startBf > 0 && (
            <div>
              <div className="mb-1 flex justify-between text-sm"><span>% de gordura</span><span className="num">{startBf}% → {goalBf}%</span></div>
              <Bar value={bfProgress} />
              <p className="mt-1 text-xs text-muted-foreground">Atual: {lastBf ?? "—"}%</p>
            </div>
          )}
        </section>
      )}

      <section>
        <SectionTitle action={<Button size="sm" onClick={() => { setF({ date: toISODate(), weight_kg: "", body_fat: "", note: "" }); setOpen(true); }}><Plus className="size-4" /> Peso</Button>}>
          Evolução do peso
        </SectionTitle>
        {list.length === 0 ? (
          <EmptyState title="Nenhum peso registrado." description="Registre seu peso para ver a evolução e a média móvel de 7 registros." />
        ) : (
          <>
            <div className="surface h-56 px-2 py-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart}>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fontSize: 10 }} width={36} stroke="var(--muted-foreground)" />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Line dataKey="peso" name="Peso" stroke="var(--muted-foreground)" strokeWidth={1} dot={{ r: 2 }} />
                  <Line dataKey="media" name="Média 7" stroke="var(--primary)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-3 space-y-1.5">
              {[...list].reverse().map((w) => (
                <li key={w.id} className="flex items-center gap-2 text-sm">
                  <span className="w-14 text-muted-foreground">{shortDate(w.date)}</span>
                  <span className="num flex-1 font-medium">{w.weight_kg} kg{w.body_fat != null ? ` · ${w.body_fat}%` : ""}{w.note ? <span className="font-normal text-muted-foreground"> · {w.note}</span> : null}</span>
                  <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => remove.mutate(w.id)}><Trash2 className="size-4 text-muted-foreground" /></Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <FormModal open={open} onOpenChange={setOpen} title="Registrar peso">
        <form className="space-y-4" onSubmit={async (e) => {
          e.preventDefault();
          await save.mutateAsync({ date: f.date, weight_kg: num(f.weight_kg), body_fat: num(f.body_fat), note: f.note || null });
          setOpen(false);
        }}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Peso (kg)"><Input autoFocus required inputMode="decimal" value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} /></Field>
            <Field label="% gordura (opcional)"><Input inputMode="decimal" value={f.body_fat} onChange={(e) => setF({ ...f, body_fat: e.target.value })} /></Field>
          </div>
          <Field label="Data"><Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} /></Field>
          <Field label="Observação"><Input value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>Salvar</Button>
        </form>
      </FormModal>
    </div>
  );
}

/* -------------------------------------------------------------- PERFIL */

function ProfileView({ profile }: { profile: Profile | null }) {
  const qc = useQueryClient();
  const save = useSave("calorie_profiles", "Perfil salvo");
  const [f, setF] = useState(() => ({
    name: profile?.name ?? "",
    sex: (profile?.sex ?? "M") as Sex,
    age: str(profile?.age),
    weight_kg: str(profile?.weight_kg),
    height_cm: str(profile?.height_cm),
    body_fat: str(profile?.body_fat),
    bmr: str(profile?.bmr),
    bmr_manual: profile?.bmr_manual ?? false,
    activity_level: profile?.activity_level ?? "sedentary",
    add_exercise: profile?.add_exercise ?? true,
    goal_weight: str(profile?.goal_weight),
    goal_body_fat: str(profile?.goal_body_fat),
    daily_kcal_goal: str(profile?.daily_kcal_goal),
    desired_deficit: str(profile?.desired_deficit),
  }));

  const autoBmr = calculateBMR({ sex: f.sex, age: Number(f.age), weightKg: Number(num(f.weight_kg)), heightCm: Number(num(f.height_cm)) });
  const bmr = f.bmr_manual ? Number(num(f.bmr) ?? 0) : autoBmr;
  const tdee = calculateTDEE(bmr, f.activity_level);
  const doubleRisk = f.add_exercise && f.activity_level !== "sedentary";

  return (
    <form className="space-y-5" onSubmit={async (e) => {
      e.preventDefault();
      const values = {
        ...(profile ? { id: profile.id } : {}),
        name: f.name || null,
        sex: f.sex,
        age: num(f.age),
        weight_kg: num(f.weight_kg),
        height_cm: num(f.height_cm),
        body_fat: num(f.body_fat),
        bmr: bmr || null,
        bmr_manual: f.bmr_manual,
        activity_level: f.activity_level,
        add_exercise: f.add_exercise,
        goal_weight: num(f.goal_weight),
        goal_body_fat: num(f.goal_body_fat),
        daily_kcal_goal: num(f.daily_kcal_goal),
        desired_deficit: num(f.desired_deficit),
        start_weight: profile?.start_weight ?? num(f.weight_kg),
        start_body_fat: profile?.start_body_fat ?? num(f.body_fat),
      };
      await save.mutateAsync(values);
      // Atualiza só a foto de hoje; dias anteriores mantêm os valores da época.
      if (bmr) {
        const user_id = await currentUserId();
        const { error } = await db.from("calorie_days").upsert(
          { user_id, date: toISODate(), bmr, tdee, add_exercise: f.add_exercise, kcal_goal: values.daily_kcal_goal },
          { onConflict: "user_id,date" },
        );
        if (error) toast.error(error.message);
        qc.invalidateQueries({ queryKey: ["calorie_days"] });
      }
    }}>
      <section className="surface space-y-4 px-4 py-4">
        <Field label="Nome"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Sexo">
          <div className="flex gap-1.5">
            {([["M", "Masculino"], ["F", "Feminino"]] as [Sex, string][]).map(([k, l]) => (
              <button type="button" key={k} onClick={() => setF({ ...f, sex: k })}
                className={cn("rounded-full border px-4 py-1.5 text-sm", f.sex === k ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>{l}</button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Idade"><Input inputMode="numeric" value={f.age} onChange={(e) => setF({ ...f, age: e.target.value })} /></Field>
          <Field label="Peso atual (kg)"><Input inputMode="decimal" value={f.weight_kg} onChange={(e) => setF({ ...f, weight_kg: e.target.value })} /></Field>
          <Field label="Altura (cm)"><Input inputMode="decimal" value={f.height_cm} onChange={(e) => setF({ ...f, height_cm: e.target.value })} /></Field>
          <Field label="% gordura (opcional)"><Input inputMode="decimal" value={f.body_fat} onChange={(e) => setF({ ...f, body_fat: e.target.value })} /></Field>
        </div>
      </section>

      <section className="surface space-y-4 px-4 py-4">
        <label className="flex items-center justify-between text-sm">
          Informar BMR manualmente <Switch checked={f.bmr_manual} onCheckedChange={(v) => setF({ ...f, bmr_manual: v, bmr: v ? f.bmr || String(autoBmr || "") : f.bmr })} />
        </label>
        {f.bmr_manual ? (
          <Field label="Gasto basal / BMR (kcal)"><Input inputMode="decimal" value={f.bmr} onChange={(e) => setF({ ...f, bmr: e.target.value })} /></Field>
        ) : (
          <p className="text-sm text-muted-foreground">BMR calculado (Mifflin-St Jeor): <b className="num text-foreground">{autoBmr ? kcal(autoBmr) : "preencha idade, peso e altura"}</b></p>
        )}
        <Field label="Nível de atividade">
          <select value={f.activity_level} onChange={(e) => setF({ ...f, activity_level: e.target.value })}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
            {Object.entries(ACTIVITY_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label} ×{v.factor}</option>)}
          </select>
        </Field>
        <label className="flex items-center justify-between gap-3 text-sm">
          Somar os exercícios registrados ao gasto <Switch checked={f.add_exercise} onCheckedChange={(v) => setF({ ...f, add_exercise: v })} />
        </label>
        {doubleRisk && (
          <p className="rounded-md bg-accent px-3 py-2 text-xs text-accent-foreground">
            Atenção: um nível acima de “Sedentário” já considera seus treinos. Somar os exercícios também pode contar as mesmas calorias duas vezes. Use “Sedentário” + somar exercícios, ou desligue a soma.
          </p>
        )}
        <div className="rounded-md border border-border px-3 py-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">BMR (basal, não é o gasto total)</span><span className="num">{kcal(bmr)}</span></div>
          <div className="flex justify-between font-semibold"><span>Gasto diário estimado (TDEE)</span><span className="num">{kcal(tdee)}</span></div>
        </div>
      </section>

      <section className="surface space-y-4 px-4 py-4">
        <p className="text-sm font-medium">Metas</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Peso objetivo (kg)"><Input inputMode="decimal" value={f.goal_weight} onChange={(e) => setF({ ...f, goal_weight: e.target.value })} /></Field>
          <Field label="% gordura objetivo"><Input inputMode="decimal" value={f.goal_body_fat} onChange={(e) => setF({ ...f, goal_body_fat: e.target.value })} /></Field>
          <Field label="Meta diária (kcal)"><Input inputMode="decimal" value={f.daily_kcal_goal} onChange={(e) => setF({ ...f, daily_kcal_goal: e.target.value })} placeholder={f.desired_deficit && tdee ? String(tdee - Number(f.desired_deficit)) : ""} /></Field>
          <Field label="Déficit diário desejado"><Input inputMode="decimal" value={f.desired_deficit} onChange={(e) => setF({ ...f, desired_deficit: e.target.value })} /></Field>
        </div>
        <p className="text-xs text-muted-foreground">Alterar o perfil só muda os cálculos a partir de hoje; dias anteriores mantêm os valores usados na época.</p>
      </section>

      <Button type="submit" className="w-full" disabled={save.isPending}>Salvar perfil</Button>
    </form>
  );
}
