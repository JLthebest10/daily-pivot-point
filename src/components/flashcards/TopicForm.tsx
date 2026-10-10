import { useState } from "react";
import { useSave } from "@/lib/db";
import type { Topic } from "@/lib/flashcards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";

export const selectCls =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground";

export function TopicForm({ initial, onDone }: { initial?: Topic; onDone: () => void }) {
  const save = useSave("flashcard_topics", initial ? "Assunto atualizado" : "Assunto adicionado");
  const [f, setF] = useState({
    name: initial?.name ?? "",
    category: initial?.category ?? "",
    notes: initial?.notes ?? "",
    priority: initial?.priority ?? "",
    deadline: initial?.deadline ?? "",
  });
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim()) return;
        await save.mutateAsync({
          ...(initial ? { id: initial.id } : {}),
          name: f.name.trim(),
          category: f.category.trim() || null,
          notes: f.notes.trim() || null,
          priority: f.priority || null,
          deadline: f.deadline || null,
        });
        onDone();
      }}
    >
      <Field label="Nome do assunto">
        <Input
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
          placeholder="Sistema muscular"
          maxLength={200}
          required
        />
      </Field>
      <Field label="Matéria ou categoria">
        <Input
          value={f.category}
          onChange={(e) => setF({ ...f, category: e.target.value })}
          placeholder="Anatomia"
          maxLength={100}
        />
      </Field>
      <Field label="Anotações (opcional)">
        <Textarea
          rows={5}
          value={f.notes}
          onChange={(e) => setF({ ...f, notes: e.target.value })}
          placeholder="Cole aqui o resumo ou o conteúdo que vai virar cartões."
        />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Prioridade">
          <select className={selectCls} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })}>
            <option value="">—</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </Field>
        <Field label="Prazo">
          <Input type="date" value={f.deadline} onChange={(e) => setF({ ...f, deadline: e.target.value })} />
        </Field>
      </div>
      <Button type="submit" className="w-full" disabled={save.isPending}>
        {initial ? "Salvar alterações" : "Adicionar assunto"}
      </Button>
    </form>
  );
}
