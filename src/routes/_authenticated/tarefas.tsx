import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { fromISODate, toISODate } from "@/lib/format";
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
import { EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/tarefas")({
  head: () => ({
    meta: [
      { title: "Tarefas — Life Hub" },
      { name: "description", content: "Suas tarefas com prioridade, prazo e categoria." },
      { property: "og:title", content: "Tarefas — Life Hub" },
      { property: "og:description", content: "Suas tarefas com prioridade, prazo e categoria." },
    ],
  }),
  component: TasksPage,
});

export type Task = {
  id: string;
  title: string;
  due_date: string | null;
  due_time: string | null;
  priority: string;
  category: string;
  done: boolean;
  note: string | null;
};

const PRIORITIES = [
  { value: "baixa", label: "Baixa" },
  { value: "media", label: "Média" },
  { value: "alta", label: "Alta" },
];

function TasksPage() {
  const tasks = useList<Task>("tarefas_placeholder", { enabled: false });
  const all = useList<Task>("tasks", { order: { column: "created_at", ascending: false } });
  const save = useSave("tasks");
  const remove = useRemove("tasks", "Tarefa excluída");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    due_date: toISODate(),
    due_time: "",
    priority: "media",
    category: "Geral",
    note: "",
  });
  void tasks;

  const pending = (all.data ?? []).filter((t) => !t.done);
  const done = (all.data ?? []).filter((t) => t.done);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      title: form.title.trim(),
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      priority: form.priority,
      category: form.category || "Geral",
      note: form.note || null,
    });
    setForm({ ...form, title: "", note: "" });
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Tarefas"
        subtitle={`${pending.length} pendentes`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nova
          </Button>
        }
      />

      <ErrorNote error={all.error} />
      {all.isLoading ? (
        <LoadingList />
      ) : (all.data ?? []).length === 0 ? (
        <EmptyState
          title="Nenhuma tarefa por aqui."
          description="Adicione sua primeira tarefa para começar."
          actionLabel="Adicionar tarefa"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          <ul className="space-y-2">
            {pending.map((t) => (
              <TaskRow key={t.id} task={t} onToggle={save} onRemove={remove} />
            ))}
          </ul>
          {done.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Concluídas ({done.length})
              </h2>
              <ul className="space-y-2">
                {done.map((t) => (
                  <TaskRow key={t.id} task={t} onToggle={save} onRemove={remove} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Nova tarefa">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome">
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
                value={form.due_date}
                onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              />
            </Field>
            <Field label="Horário (opcional)">
              <Input
                type="time"
                value={form.due_time}
                onChange={(e) => setForm({ ...form, due_time: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Prioridade">
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Categoria">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
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
            Salvar tarefa
          </Button>
        </form>
      </FormModal>
    </>
  );
}

function TaskRow({
  task,
  onToggle,
  onRemove,
}: {
  task: Task;
  onToggle: ReturnType<typeof useSave>;
  onRemove: ReturnType<typeof useRemove>;
}) {
  return (
    <li className="surface flex items-center gap-3 px-4 py-3">
      <input
        type="checkbox"
        checked={task.done}
        aria-label={`Concluir ${task.title}`}
        onChange={() => onToggle.mutate({ id: task.id, done: !task.done })}
        className="size-5 shrink-0 accent-[var(--color-primary)]"
      />
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-sm", task.done && "text-muted-foreground line-through")}>
          {task.title}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {task.due_date ? fromISODate(task.due_date).toLocaleDateString("pt-BR") : "sem data"}
          {task.due_time ? ` · ${task.due_time}` : ""} · {task.category}
        </p>
      </div>
      <span
        className={cn(
          "rounded-full px-2 py-0.5 text-[11px]",
          task.priority === "alta" && "bg-destructive/12 text-destructive",
          task.priority === "media" && "bg-accent text-accent-foreground",
          task.priority === "baixa" && "bg-muted text-muted-foreground",
        )}
      >
        {task.priority}
      </span>
      <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => onRemove.mutate(task.id)}>
        <Trash2 className="size-4 text-muted-foreground" />
      </Button>
    </li>
  );
}
