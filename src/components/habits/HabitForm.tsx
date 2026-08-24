import { useEffect, useState } from "react";
import { useSave } from "@/lib/db";
import type { Habit } from "@/lib/habits";
import { WEEKDAYS } from "@/lib/format";
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
import { Field, FormModal } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const HABIT_ICONS = ["💧", "🏋️", "📚", "🧘", "🧹", "💻", "🌙", "🍎", "🚶", "✍️"];
export const HABIT_CATEGORIES = ["Saúde", "Treino", "Estudo", "Casa", "Trabalho", "Mente", "Geral"];

const empty = {
  name: "",
  icon: "💧",
  category: "Geral",
  color: "sage",
  days: [0, 1, 2, 3, 4, 5, 6],
  time: "",
  target: 1,
  unit: "",
  note: "",
};

export function HabitForm({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  habit?: Habit | null;
}) {
  const save = useSave("habits", habit ? "Hábito atualizado" : "Hábito criado");
  const [form, setForm] = useState({ ...empty });

  useEffect(() => {
    if (!open) return;
    setForm(
      habit
        ? {
            name: habit.name,
            icon: habit.icon,
            category: habit.category,
            color: habit.color,
            days: habit.days,
            time: habit.time ?? "",
            target: Number(habit.target),
            unit: habit.unit ?? "",
            note: habit.note ?? "",
          }
        : { ...empty },
    );
  }, [open, habit]);

  function toggleDay(d: number) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d].sort(),
    }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || form.days.length === 0) return;
    await save.mutateAsync({
      ...(habit ? { id: habit.id } : {}),
      name: form.name.trim(),
      icon: form.icon,
      category: form.category,
      color: form.color,
      days: form.days,
      time: form.time || null,
      target: form.target || 1,
      unit: form.unit || null,
      note: form.note || null,
    });
    onOpenChange(false);
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={habit ? "Editar hábito" : "Novo hábito"}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Nome">
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Beber água"
            required
          />
        </Field>

        <Field label="Ícone">
          <Input
            value={form.icon}
            onChange={(e) => {
              // Pega apenas o primeiro emoji/grapheme do campo
              const value = Array.from(e.target.value.trim())[0] ?? "";
              setForm({ ...form, icon: value || "⭐" });
            }}
            placeholder="Digite ou cole um emoji"
            className="text-lg"
            maxLength={4}
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {HABIT_ICONS.map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => setForm({ ...form, icon: i })}
                className={cn(
                  "size-9 rounded-lg border text-base",
                  form.icon === i ? "border-primary bg-accent" : "border-border",
                )}
              >
                {i}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Categoria">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HABIT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Horário (opcional)">
            <Input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Dias da semana">
          <div className="flex gap-1.5">
            {WEEKDAYS.map((d, i) => (
              <button
                key={d}
                type="button"
                onClick={() => toggleDay(i)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs",
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="Meta diária">
            <Input
              type="number"
              min={1}
              step="any"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: Number(e.target.value) })}
            />
          </Field>
          <Field label="Unidade (opcional)">
            <Input
              value={form.unit}
              placeholder="litros, páginas..."
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
        </div>

        <Field label="Observação">
          <Textarea
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={save.isPending}>
          {save.isPending ? "Salvando..." : "Salvar hábito"}
        </Button>
      </form>
    </FormModal>
  );
}
