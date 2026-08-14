import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { fromISODate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar, EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";

export const Route = createFileRoute("/_authenticated/metas")({
  head: () => ({
    meta: [
      { title: "Metas — Life Hub" },
      { name: "description", content: "Defina metas pessoais e acompanhe o progresso real." },
      { property: "og:title", content: "Metas — Life Hub" },
      { property: "og:description", content: "Defina metas pessoais e acompanhe o progresso real." },
    ],
  }),
  component: GoalsPage,
});

export type Goal = {
  id: string;
  name: string;
  category: string;
  deadline: string | null;
  start_value: number;
  target_value: number;
  current_value: number;
  unit: string | null;
};

export function goalProgress(g: Goal) {
  const span = Number(g.target_value) - Number(g.start_value);
  if (span === 0) return 100;
  return Math.max(
    0,
    Math.min(100, ((Number(g.current_value) - Number(g.start_value)) / span) * 100),
  );
}

function GoalsPage() {
  const goals = useList<Goal>("goals", { order: { column: "created_at", ascending: false } });
  const save = useSave("goals", "Meta salva");
  const remove = useRemove("goals", "Meta excluída");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Geral",
    deadline: "",
    start_value: 0,
    target_value: 100,
    current_value: 0,
    unit: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await save.mutateAsync({
      name: form.name.trim(),
      category: form.category || "Geral",
      deadline: form.deadline || null,
      start_value: Number(form.start_value),
      target_value: Number(form.target_value),
      current_value: Number(form.current_value),
      unit: form.unit || null,
    });
    setForm({ ...form, name: "" });
    setOpen(false);
  }

  return (
    <>
      <PageHeader
        title="Metas"
        subtitle="O que você quer alcançar."
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Nova
          </Button>
        }
      />

      <ErrorNote error={goals.error} />
      {goals.isLoading ? (
        <LoadingList />
      ) : (goals.data ?? []).length === 0 ? (
        <EmptyState
          title="Você ainda não possui metas."
          description="Crie uma meta e acompanhe o progresso ao longo do tempo."
          actionLabel="Criar meta"
          onAction={() => setOpen(true)}
        />
      ) : (
        <ul className="space-y-2">
          {(goals.data ?? []).map((g) => {
            const p = goalProgress(g);
            return (
              <li key={g.id} className="surface px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {g.category}
                      {g.deadline
                        ? ` · até ${fromISODate(g.deadline).toLocaleDateString("pt-BR")}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="num text-sm font-semibold">{Math.round(p)}%</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => remove.mutate(g.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <Bar value={p} />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    defaultValue={g.current_value}
                    className="h-9 w-32"
                    aria-label="Progresso atual"
                    onBlur={(e) =>
                      save.mutate({ id: g.id, current_value: Number(e.target.value) })
                    }
                  />
                  <span className="num text-xs text-muted-foreground">
                    de {g.target_value} {g.unit ?? ""}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Nova meta">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Nome">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Economizar R$ 5.000"
              required
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <Input
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </Field>
            <Field label="Prazo">
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Inicial">
              <Input
                type="number"
                step="any"
                value={form.start_value}
                onChange={(e) => setForm({ ...form, start_value: Number(e.target.value) })}
              />
            </Field>
            <Field label="Atual">
              <Input
                type="number"
                step="any"
                value={form.current_value}
                onChange={(e) => setForm({ ...form, current_value: Number(e.target.value) })}
              />
            </Field>
            <Field label="Meta">
              <Input
                type="number"
                step="any"
                value={form.target_value}
                onChange={(e) => setForm({ ...form, target_value: Number(e.target.value) })}
              />
            </Field>
          </div>
          <Field label="Unidade (opcional)">
            <Input
              value={form.unit}
              placeholder="R$, livros, treinos..."
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar meta
          </Button>
        </form>
      </FormModal>
    </>
  );
}
