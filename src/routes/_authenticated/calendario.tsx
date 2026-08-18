import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import {
  MONTHS,
  WEEKDAYS,
  addDays,
  fromISODate,
  longDate,
  startOfWeek,
  toISODate,
} from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/calendario")({
  head: () => ({
    meta: [
      { title: "Calendário — Life Hub" },
      { name: "description", content: "Seus compromissos por mês, semana e dia com lembretes." },
      { property: "og:title", content: "Calendário — Life Hub" },
      {
        property: "og:description",
        content: "Seus compromissos por mês, semana e dia com lembretes.",
      },
    ],
  }),
  component: CalendarPage,
});

export type EventRow = {
  id: string;
  title: string;
  date: string;
  start_time: string | null;
  duration_min: number;
  location: string | null;
  description: string | null;
  category: string;
  color: string;
  repeat: string;
  reminder_min: number | null;
};

const CATEGORIES = ["Trabalho", "Treino", "Faculdade", "Saúde", "Pessoal", "Geral"];
const REMINDERS = [
  { value: "0", label: "No horário" },
  { value: "5", label: "5 min antes" },
  { value: "15", label: "15 min antes" },
  { value: "30", label: "30 min antes" },
  { value: "60", label: "1 hora antes" },
  { value: "1440", label: "1 dia antes" },
];

type TaskRow = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  category: string;
  done: boolean;
};

type View = "month" | "week" | "day";

function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState<View>("month");
  const [selected, setSelected] = useState(toISODate());
  const [open, setOpen] = useState(false);
  const events = useList<EventRow>("events", { order: { column: "date" } });
  const tasks = useList<TaskRow>("tasks", { order: { column: "due_date" } });
  const save = useSave("events", "Compromisso salvo");
  const remove = useRemove("events", "Compromisso excluído");

  const [form, setForm] = useState({
    title: "",
    date: toISODate(),
    start_time: "09:00",
    duration_min: 60,
    location: "",
    description: "",
    category: "Geral",
    repeat: "none",
    reminder_min: "15",
  });

  const byDate = (iso: string) =>
    (events.data ?? [])
      .filter((e) => e.date === iso)
      .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""));

  const tasksByDate = (iso: string) =>
    (tasks.data ?? [])
      .filter((t) => t.due_date === iso)
      .sort((a, b) => (a.due_time ?? "").localeCompare(b.due_time ?? ""));

  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const gridDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(fromISODate(selected)), i));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      title: form.title.trim(),
      date: form.date,
      start_time: form.start_time || null,
      duration_min: Number(form.duration_min) || 60,
      location: form.location || null,
      description: form.description || null,
      category: form.category,
      color: "sage",
      repeat: form.repeat,
      reminder_min: form.reminder_min === "" ? null : Number(form.reminder_min),
    });
    setForm({ ...form, title: "", location: "", description: "" });
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Calendário"
        subtitle={`${MONTHS[cursor.getMonth()]} de ${cursor.getFullYear()}`}
        action={
          <Button
            onClick={() => {
              setForm({ ...form, date: selected });
              setOpen(true);
            }}
          >
            <Plus className="size-4" /> Evento
          </Button>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-1.5">
          {(
            [
              ["month", "Mês"],
              ["week", "Semana"],
              ["day", "Dia"],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-xs",
                view === v
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Anterior"
            onClick={() => {
              if (view === "month")
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
              else setSelected(toISODate(addDays(fromISODate(selected), view === "week" ? -7 : -1)));
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo"
            onClick={() => {
              if (view === "month")
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
              else setSelected(toISODate(addDays(fromISODate(selected), view === "week" ? 7 : 1)));
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {events.isLoading ? (
        <LoadingList rows={4} />
      ) : view === "month" ? (
        <div className="surface p-3">
          <div className="grid grid-cols-7 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <span key={d} className="py-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((d) => {
              const iso = toISODate(d);
              const items = byDate(iso);
              const muted = d.getMonth() !== cursor.getMonth();
              return (
                <button
                  key={iso}
                  onClick={() => {
                    setSelected(iso);
                    setView("day");
                  }}
                  className={cn(
                    "flex aspect-square flex-col items-center justify-start rounded-lg py-1.5 text-xs transition-colors",
                    muted && "text-muted-foreground/50",
                    iso === toISODate() && "bg-accent font-semibold text-accent-foreground",
                    iso === selected && iso !== toISODate() && "bg-muted",
                  )}
                >
                  <span className="num">{d.getDate()}</span>
                  <span className="mt-1 flex gap-0.5">
                    {items.length > 0 && <span className="size-1.5 rounded-full bg-primary" />}
                    {tasksByDate(iso).length > 0 && (
                      <span className="size-1.5 rounded-full bg-foreground/40" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ) : view === "week" ? (
        <div className="space-y-3">
          {weekDays.map((d) => (
            <DayBlock
              key={toISODate(d)}
              date={d}
              items={byDate(toISODate(d))}
              tasks={tasksByDate(toISODate(d))}
              onRemove={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      ) : (
        <DayBlock
          date={fromISODate(selected)}
          items={byDate(selected)}
          tasks={tasksByDate(selected)}
          onRemove={(id) => remove.mutate(id)}
        />
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo compromisso">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Título">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Data">
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                required
              />
            </Field>
            <Field label="Hora">
              <Input
                type="time"
                value={form.start_time}
                onChange={(e) => setForm({ ...form, start_time: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Duração (min)">
              <Input
                type="number"
                min={5}
                value={form.duration_min}
                onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })}
              />
            </Field>
            <Field label="Local">
              <Input
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Repetição">
              <Select value={form.repeat} onValueChange={(v) => setForm({ ...form, repeat: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Não repete</SelectItem>
                  <SelectItem value="daily">Diariamente</SelectItem>
                  <SelectItem value="weekly">Semanalmente</SelectItem>
                  <SelectItem value="monthly">Mensalmente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Lembrete">
            <Select
              value={form.reminder_min}
              onValueChange={(v) => setForm({ ...form, reminder_min: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REMINDERS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Descrição">
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar compromisso
          </Button>
        </form>
      </FormModal>
    </>
  );
}

function DayBlock({
  date,
  items,
  tasks,
  onRemove,
}: {
  date: Date;
  items: EventRow[];
  tasks: TaskRow[];
  onRemove: (id: string) => void;
}) {
  return (
    <div className="surface p-4">
      <h2 className="text-sm font-medium capitalize">{longDate(date)}</h2>
      {items.length === 0 && tasks.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Nada agendado.</p>
      ) : items.length === 0 ? null : (
        <ul className="mt-3 space-y-2">
          {items.map((e) => (
            <li key={e.id} className="flex items-start gap-3 border-l-2 border-primary pl-3">
              <div className="min-w-0 flex-1">
                <p className="num text-sm font-medium">
                  {e.start_time ?? "--:--"} — {e.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.category}
                  {e.location ? ` · ${e.location}` : ""} · {e.duration_min}min
                  {e.reminder_min !== null ? ` · lembrete ${e.reminder_min}min antes` : ""}
                </p>
                {e.description && (
                  <p className="mt-1 text-xs text-muted-foreground">{e.description}</p>
                )}
              </div>
              <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => onRemove(e.id)}>
                <Trash2 className="size-4 text-muted-foreground" />
              </Button>
            </li>
          ))}
        </ul>
      )}
      {tasks.length > 0 && (
        <ul className="mt-3 space-y-2">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-start gap-3 border-l-2 border-muted-foreground/40 pl-3">
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "num text-sm font-medium",
                    t.done && "text-muted-foreground line-through",
                  )}
                >
                  {t.due_time ?? "--:--"} — {t.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Tarefa · {t.category} · prioridade {t.priority}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export { EmptyState };
