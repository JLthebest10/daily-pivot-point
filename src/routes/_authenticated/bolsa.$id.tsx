import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Check, Copy, Pencil, Pin, Plus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { db, useList, useRemove, useSave } from "@/lib/db";
import { bagProgress, createBagList, type BagItem, type BagList, type BagListItem } from "@/lib/bag";
import { addDays, fromISODate, shortDate, toISODate, relativeDays } from "@/lib/format";
import { openReminder } from "@/components/AlarmButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bar, ErrorNote, Field, FormModal, LoadingList } from "@/components/ui-kit";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bolsa/$id")({
  head: () => ({
    meta: [
      { title: "Checklist da bolsa — Life Hub" },
      { name: "description", content: "Marque o que já está na bolsa." },
      { property: "og:title", content: "Checklist da bolsa — Life Hub" },
      { property: "og:description", content: "Confira cada item antes de sair de casa." },
    ],
  }),
  component: BagListPage,
});

function BagListPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const lists = useList<BagList>("bag_lists", { eq: { id } });
  const items = useList<BagListItem>("bag_list_items", { eq: { list_id: id }, order: { column: "order_index" } });
  const fixed = useList<BagItem>("bag_items", { order: { column: "order_index" } });
  const saveItem = useSave("bag_list_items");
  const removeItem = useRemove("bag_list_items", "Item tirado desta lista");
  const saveList = useSave("bag_lists");
  const removeList = useRemove("bag_lists", "Lista excluída");
  const saveFixed = useSave("bag_items", "Agora é um item fixo");

  const [newItem, setNewItem] = useState("");
  const [byCategory, setByCategory] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<BagListItem | null>(null);

  const list = lists.data?.[0];
  const rows = items.data ?? [];
  const p = bagProgress(rows);

  const groups = useMemo(() => {
    if (!byCategory) return [["", rows] as const];
    const m = new Map<string, BagListItem[]>();
    for (const r of rows) m.set(r.category || "Sem categoria", [...(m.get(r.category || "Sem categoria") ?? []), r]);
    return [...m.entries()];
  }, [rows, byCategory]);

  if (lists.isLoading) return <LoadingList />;
  if (!list) return <ErrorNote error={lists.error ?? new Error("Lista não encontrada.")} />;

  function add() {
    const v = newItem.trim();
    if (!v) return;
    saveItem.mutate({ list_id: id, name: v, checked: false, order_index: rows.length });
    setNewItem("");
  }

  async function resetAll() {
    const { error } = await db.from("bag_list_items").update({ checked: false }).eq("list_id", id);
    if (error) toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["bag_list_items"] });
    setResetOpen(false);
  }

  function reminder() {
    const prev = toISODate(addDays(fromISODate(list!.date), -1));
    openReminder(prev, "21:00", `Preparar bolsa: ${list!.title}`);
  }

  const isFixedSource = (r: BagListItem) => (fixed.data ?? []).some((f) => f.id === r.source_item_id && f.is_fixed);

  return (
    <div className="pb-8">
      <Link to="/bolsa" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Minha Bolsa
      </Link>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-semibold tracking-tight">{list.title}</h1>
          <p className="text-sm text-muted-foreground">
            {shortDate(list.date)} · {relativeDays(list.date)}
          </p>
        </div>
        <Button variant="ghost" size="icon" aria-label="Editar lista" onClick={() => setEditOpen(true)}>
          <Pencil className="size-4" />
        </Button>
      </div>

      <div className="surface mb-5 space-y-2 px-4 py-4">
        <div className="flex items-baseline justify-between">
          <p className="num text-sm font-medium">
            {p.done} de {p.total} itens na bolsa
          </p>
          <p className={cn("text-xs", p.ready ? "text-primary" : "text-muted-foreground")}>
            {p.ready ? "Bolsa pronta ✓" : `Faltam ${p.left}`}
          </p>
        </div>
        <Bar value={p.pct} />
        {list.note && <p className="pt-1 text-sm text-muted-foreground">{list.note}</p>}
      </div>

      <div className="mb-3 flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={byCategory} onCheckedChange={setByCategory} /> Agrupar por categoria
        </label>
        <Button variant="ghost" size="sm" disabled={!p.done} onClick={() => setResetOpen(true)}>
          <RotateCcw className="size-4" /> Desmarcar todos
        </Button>
      </div>

      <div className="space-y-4">
        {groups.map(([cat, group]) => (
          <div key={cat}>
            {cat && <p className="mb-1.5 text-xs font-medium text-muted-foreground">{cat}</p>}
            <div className="surface divide-y divide-border overflow-hidden">
              {group.length === 0 && <p className="px-4 py-6 text-center text-sm text-muted-foreground">Lista vazia. Adicione itens abaixo.</p>}
              {group.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                  <button
                    onClick={() => saveItem.mutate({ id: r.id, checked: !r.checked })}
                    aria-label={r.checked ? `Tirar ${r.name} da bolsa` : `Colocar ${r.name} na bolsa`}
                    aria-pressed={r.checked}
                    className="flex min-w-0 flex-1 items-center gap-3 py-1.5 text-left"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg border-2 transition-all",
                        r.checked ? "animate-pop border-primary bg-primary text-primary-foreground" : "border-border",
                      )}
                    >
                      {r.checked && <Check className="size-5" />}
                    </span>
                    {r.icon && <span>{r.icon}</span>}
                    <span className={cn("truncate text-[15px] transition-colors", r.checked && "text-muted-foreground line-through decoration-1")}>
                      {r.name}
                    </span>
                  </button>
                  <Button variant="ghost" size="icon" aria-label={`Editar ${r.name}`} onClick={() => setEditing(r)}>
                    <Pencil className="size-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Adicionar item a esta lista"
        />
        <Button size="icon" onClick={add} aria-label="Adicionar">
          <Plus className="size-4" />
        </Button>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => setDupOpen(true)}>
          <Copy className="size-4" /> Duplicar
        </Button>
        <Button variant="outline" onClick={reminder}>
          <Bell className="size-4" /> Lembrete
        </Button>
        <Button variant="ghost" className="col-span-2 text-destructive" onClick={() => setDelOpen(true)}>
          <Trash2 className="size-4" /> Excluir lista
        </Button>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        O lembrete usa o atalho do iPhone e é criado para as 21h da véspera.
      </p>

      <ItemModal
        item={editing}
        isFixed={editing ? isFixedSource(editing) : false}
        onClose={() => setEditing(null)}
        onSave={(v) => saveItem.mutate({ id: editing!.id, ...v })}
        onRemove={() => removeItem.mutate(editing!.id)}
        onMakeFixed={() => {
          const r = editing!;
          saveFixed.mutate(
            { name: r.name, category: r.category, icon: r.icon, is_fixed: true, active: true, order_index: fixed.data?.length ?? 0 },
            { onSuccess: (row) => row && saveItem.mutate({ id: r.id, source_item_id: (row as { id: string }).id }) },
          );
        }}
      />

      <EditListModal open={editOpen} onOpenChange={setEditOpen} list={list} onSave={(v) => saveList.mutate({ id, ...v })} />
      <DuplicateModal open={dupOpen} onOpenChange={setDupOpen} list={list} items={rows} />

      <Confirm open={resetOpen} onOpenChange={setResetOpen} title="Desmarcar todos os itens?" desc="As marcações desta lista serão limpas. Os itens continuam na lista." action="Desmarcar" onConfirm={() => void resetAll()} />
      <Confirm
        open={delOpen}
        onOpenChange={setDelOpen}
        title="Excluir esta lista?"
        desc="Só esta lista e seus itens serão apagados. Seus itens fixos continuam."
        action="Excluir"
        onConfirm={() => {
          removeList.mutate(id);
          navigate({ to: "/bolsa" });
        }}
      />
    </div>
  );
}

function Confirm(p: { open: boolean; onOpenChange: (v: boolean) => void; title: string; desc: string; action: string; onConfirm: () => void }) {
  return (
    <AlertDialog open={p.open} onOpenChange={p.onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{p.title}</AlertDialogTitle>
          <AlertDialogDescription>{p.desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={p.onConfirm}>{p.action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ItemModal(p: {
  item: BagListItem | null;
  isFixed: boolean;
  onClose: () => void;
  onSave: (v: { name: string; category: string | null; icon: string | null }) => void;
  onRemove: () => void;
  onMakeFixed: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [icon, setIcon] = useState("");
  const [loaded, setLoaded] = useState<string | null>(null);
  if (p.item && loaded !== p.item.id) {
    setLoaded(p.item.id);
    setName(p.item.name);
    setCategory(p.item.category ?? "");
    setIcon(p.item.icon ?? "");
  }
  return (
    <FormModal open={!!p.item} onOpenChange={(v) => !v && (p.onClose(), setLoaded(null))} title="Item da lista" description="Mudanças valem só para esta lista.">
      <div className="space-y-3">
        <div className="grid grid-cols-[3.5rem_1fr] gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎒" maxLength={4} className="text-center" aria-label="Emoji" />
          <Input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome" />
        </div>
        <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria (opcional)" />
        <Button
          className="w-full"
          onClick={() => {
            if (!name.trim()) return;
            p.onSave({ name: name.trim(), category: category.trim() || null, icon: icon.trim() || null });
            p.onClose();
            setLoaded(null);
          }}
        >
          Salvar
        </Button>
        {!p.isFixed && (
          <Button variant="outline" className="w-full" onClick={() => (p.onMakeFixed(), p.onClose(), setLoaded(null))}>
            <Pin className="size-4" /> Tornar item fixo
          </Button>
        )}
        <Button variant="ghost" className="w-full text-destructive" onClick={() => (p.onRemove(), p.onClose(), setLoaded(null))}>
          <Trash2 className="size-4" /> Tirar desta lista
        </Button>
      </div>
    </FormModal>
  );
}

function EditListModal(p: { open: boolean; onOpenChange: (v: boolean) => void; list: BagList; onSave: (v: Partial<BagList>) => void }) {
  const [title, setTitle] = useState(p.list.title);
  const [date, setDate] = useState(p.list.date);
  const [note, setNote] = useState(p.list.note ?? "");
  return (
    <FormModal open={p.open} onOpenChange={p.onOpenChange} title="Editar lista">
      <div className="space-y-3">
        <Field label="Nome">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Observações">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        <Button
          className="w-full"
          onClick={() => {
            if (!title.trim() || !date) return;
            p.onSave({ title: title.trim(), date, note: note.trim() || null });
            p.onOpenChange(false);
          }}
        >
          Salvar
        </Button>
      </div>
    </FormModal>
  );
}

function DuplicateModal(p: { open: boolean; onOpenChange: (v: boolean) => void; list: BagList; items: BagListItem[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState(p.list.title);
  const [date, setDate] = useState(toISODate(addDays(new Date(), 1)));
  const [keepNote, setKeepNote] = useState(true);
  const [busy, setBusy] = useState(false);
  async function submit() {
    if (!title.trim() || !date) return;
    setBusy(true);
    try {
      const list = await createBagList({
        title: title.trim(),
        date,
        note: keepNote ? p.list.note : null,
        items: p.items.map((i) => ({ source_item_id: i.source_item_id, name: i.name, category: i.category, icon: i.icon })),
      });
      await qc.invalidateQueries({ queryKey: ["bag_lists"] });
      await qc.invalidateQueries({ queryKey: ["bag_list_items"] });
      p.onOpenChange(false);
      toast.success("Lista duplicada, tudo desmarcado");
      navigate({ to: "/bolsa/$id", params: { id: list.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <FormModal open={p.open} onOpenChange={p.onOpenChange} title="Duplicar lista" description={`${p.items.length} itens serão copiados, todos desmarcados.`}>
      <div className="space-y-3">
        <Field label="Novo nome">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Nova data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm">
          Copiar observações
          <Switch checked={keepNote} onCheckedChange={setKeepNote} />
        </label>
        <Button className="w-full" disabled={busy} onClick={() => void submit()}>
          Duplicar
        </Button>
      </div>
    </FormModal>
  );
}
