import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { db, useList, useRemove, useSave } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/comprar")({
  head: () => ({
    meta: [
      { title: "Comprar — Life Hub" },
      {
        name: "description",
        content: "Lista do que você precisa comprar, com ordem de prioridade arrastável.",
      },
      { property: "og:title", content: "Comprar — Life Hub" },
      {
        property: "og:description",
        content: "Anote o que precisa comprar e organize por prioridade.",
      },
    ],
  }),
  component: ShoppingPage,
});

type Item = {
  id: string;
  name: string;
  note: string | null;
  bought: boolean;
  order_index: number;
};

function ShoppingPage() {
  const qc = useQueryClient();
  const list = useList<Item>("shopping_items", { order: { column: "order_index" } });
  const save = useSave("shopping_items");
  const remove = useRemove("shopping_items", "Item excluído");

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", note: "" });
  const [order, setOrder] = useState<Item[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLLIElement>());

  const rows = list.data ?? [];
  useEffect(() => {
    if (!dragId) setOrder(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, dragId]);

  const pending = order.filter((i) => !i.bought);
  const bought = order.filter((i) => i.bought);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    const min = Math.min(0, ...rows.map((r) => r.order_index));
    await save.mutateAsync({ name, note: form.note.trim() || null, order_index: min - 1 });
    setForm({ name: "", note: "" });
    setOpen(false);
  }

  async function persist(next: Item[]) {
    setOrder(next);
    const updates = next
      .map((item, index) => ({ item, index }))
      .filter(({ item, index }) => item.order_index !== index);
    if (updates.length === 0) return;
    await Promise.all(
      updates.map(({ item, index }) =>
        db.from("shopping_items").update({ order_index: index }).eq("id", item.id),
      ),
    );
    void qc.invalidateQueries({ queryKey: ["shopping_items"] });
  }

  function startDrag(id: string, e: React.PointerEvent) {
    e.preventDefault();
    setDragId(id);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onDragMove(e: React.PointerEvent) {
    if (!dragId) return;
    const current = order.findIndex((i) => i.id === dragId);
    if (current < 0) return;
    const y = e.clientY;
    let target = current;
    order.forEach((item, index) => {
      const el = rowRefs.current.get(item.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (y > rect.top && y < rect.bottom) target = index;
    });
    if (target !== current) {
      const next = [...order];
      const [moved] = next.splice(current, 1);
      next.splice(target, 0, moved!);
      setOrder(next);
    }
  }

  function endDrag() {
    if (!dragId) return;
    setDragId(null);
    void persist(order);
  }

  return (
    <>
      <PageHeader
        title="Comprar"
        subtitle={`${pending.length} item(ns) para comprar`}
        action={
          <Button onClick={() => setOpen(true)}>
            <Plus className="size-4" /> Novo
          </Button>
        }
      />

      <ErrorNote error={list.error} />
      {list.isLoading ? (
        <LoadingList />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nada anotado ainda."
          description="Adicione o que você precisa comprar para não esquecer."
          actionLabel="Adicionar item"
          onAction={() => setOpen(true)}
        />
      ) : (
        <div className="space-y-6" onPointerMove={onDragMove} onPointerUp={endDrag} onPointerCancel={endDrag}>
          <ul className="space-y-2">
            {pending.map((item) => (
              <li
                key={item.id}
                ref={(el) => {
                  if (el) rowRefs.current.set(item.id, el);
                  else rowRefs.current.delete(item.id);
                }}
                className={cn(
                  "surface flex items-center gap-2 px-3 py-3 transition-shadow",
                  dragId === item.id && "ring-2 ring-primary/50",
                )}
              >
                <button
                  type="button"
                  aria-label={`Reordenar ${item.name}`}
                  onPointerDown={(e) => startDrag(item.id, e)}
                  className="cursor-grab touch-none p-1 text-muted-foreground active:cursor-grabbing"
                >
                  <GripVertical className="size-4" />
                </button>
                <input
                  type="checkbox"
                  checked={item.bought}
                  aria-label={`Marcar ${item.name} como comprado`}
                  onChange={() => save.mutate({ id: item.id, bought: true })}
                  className="size-5 shrink-0 accent-[var(--color-primary)]"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{item.name}</p>
                  {item.note && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.note}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir"
                  onClick={() => remove.mutate(item.id)}
                >
                  <Trash2 className="size-4 text-muted-foreground" />
                </Button>
              </li>
            ))}
          </ul>

          {bought.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-medium text-muted-foreground">
                Comprados ({bought.length})
              </h2>
              <ul className="space-y-2">
                {bought.map((item) => (
                  <li key={item.id} className="surface flex items-center gap-3 px-4 py-3">
                    <input
                      type="checkbox"
                      checked
                      aria-label={`Desmarcar ${item.name}`}
                      onChange={() => save.mutate({ id: item.id, bought: false })}
                      className="size-5 shrink-0 accent-[var(--color-primary)]"
                    />
                    <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground line-through">
                      {item.name}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Excluir"
                      onClick={() => remove.mutate(item.id)}
                    >
                      <Trash2 className="size-4 text-muted-foreground" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Novo item para comprar">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Item">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Whey protein"
              required
            />
          </Field>
          <Field label="Observação">
            <Textarea
              rows={2}
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </Field>
          <Button type="submit" className="w-full" disabled={save.isPending}>
            Salvar item
          </Button>
        </form>
      </FormModal>
    </>
  );
}
