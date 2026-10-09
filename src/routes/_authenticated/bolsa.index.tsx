import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Package, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useList, useRemove, useSave } from "@/lib/db";
import {
  bagProgress,
  createBagList,
  groupLists,
  templatesForNewList,
  type BagItem,
  type BagList,
  type BagListItem,
} from "@/lib/bag";
import { addDays, shortDate, toISODate, relativeDays } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Bar, EmptyState, ErrorNote, Field, FormModal, LoadingList, PageHeader, SectionTitle } from "@/components/ui-kit";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/bolsa/")({
  head: () => ({
    meta: [
      { title: "Minha Bolsa — Life Hub" },
      { name: "description", content: "Checklists para preparar a bolsa para cada dia ou ocasião." },
      { property: "og:title", content: "Minha Bolsa — Life Hub" },
      { property: "og:description", content: "Prepare a bolsa com antecedência e saia com tudo pronto." },
    ],
  }),
  component: BagPage,
});

function BagPage() {
  const lists = useList<BagList>("bag_lists", { order: { column: "date" } });
  const items = useList<BagListItem>("bag_list_items");
  const fixed = useList<BagItem>("bag_items", { order: { column: "order_index" } });
  const [newOpen, setNewOpen] = useState(false);
  const [fixedOpen, setFixedOpen] = useState(false);

  const byList = useMemo(() => {
    const m = new Map<string, BagListItem[]>();
    for (const it of items.data ?? []) m.set(it.list_id, [...(m.get(it.list_id) ?? []), it]);
    return m;
  }, [items.data]);
  const prog = (id: string) => bagProgress(byList.get(id) ?? []);
  const today = toISODate();
  const groups = groupLists(lists.data ?? [], today, toISODate(addDays(new Date(), 7)), (id) => prog(id).ready);

  return (
    <div>
      <PageHeader
        title="Minha Bolsa"
        subtitle="Prepare a bolsa antes e saia com tudo."
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" /> Nova lista
          </Button>
        }
      />
      <ErrorNote error={lists.error} />

      <button
        onClick={() => setFixedOpen(true)}
        className="surface mb-6 flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <Package className="size-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Meus itens fixos</p>
          <p className="text-xs text-muted-foreground">
            {(fixed.data ?? []).filter((i) => i.is_fixed && i.active).length} entram automaticamente nas novas listas
          </p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground" />
      </button>

      {lists.isLoading ? (
        <LoadingList />
      ) : !lists.data?.length ? (
        <EmptyState
          title="Nenhuma lista ainda"
          description="Cadastre seus itens fixos e crie a lista da bolsa de amanhã."
          actionLabel="Nova lista"
          onAction={() => setNewOpen(true)}
        />
      ) : (
        <div className="space-y-6">
          {groups.next && (
            <div>
              <SectionTitle>Próxima para preparar</SectionTitle>
              <ListCard list={groups.next} p={prog(groups.next.id)} highlight />
            </div>
          )}
          <Section title="Próximos 7 dias" lists={groups.upcoming.filter((l) => l.id !== groups.next?.id)} prog={prog} />
          <Section title="Futuras" lists={groups.future.filter((l) => l.id !== groups.next?.id)} prog={prog} />
          <Section title="Anteriores" lists={groups.past} prog={prog} />
        </div>
      )}

      <NewListModal open={newOpen} onOpenChange={setNewOpen} fixed={fixed.data ?? []} />
      <FixedItemsModal open={fixedOpen} onOpenChange={setFixedOpen} items={fixed.data ?? []} />
    </div>
  );
}

function Section({ title, lists, prog }: { title: string; lists: BagList[]; prog: (id: string) => ReturnType<typeof bagProgress> }) {
  if (!lists.length) return null;
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="space-y-2">
        {lists.map((l) => (
          <ListCard key={l.id} list={l} p={prog(l.id)} />
        ))}
      </div>
    </div>
  );
}

function ListCard({ list, p, highlight }: { list: BagList; p: ReturnType<typeof bagProgress>; highlight?: boolean }) {
  return (
    <Link
      to="/bolsa/$id"
      params={{ id: list.id }}
      className={cn("surface block px-4 py-3.5 transition-colors hover:bg-muted/40", highlight && "border-primary/40 py-5")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-medium", highlight && "text-lg")}>{list.title}</p>
          <p className="text-xs text-muted-foreground">
            {shortDate(list.date)} · {relativeDays(list.date)}
          </p>
        </div>
        {p.ready && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
            <CheckCircle2 className="size-3.5" /> Pronta
          </span>
        )}
      </div>
      <div className="mt-3 space-y-1.5">
        <Bar value={p.pct} />
        <p className="num text-xs text-muted-foreground">
          {p.done} de {p.total} itens na bolsa
        </p>
      </div>
    </Link>
  );
}

function NewListModal({ open, onOpenChange, fixed }: { open: boolean; onOpenChange: (v: boolean) => void; fixed: BagItem[] }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [title, setTitle] = useState("Bolsa de amanhã");
  const [date, setDate] = useState(toISODate(addDays(new Date(), 1)));
  const [note, setNote] = useState("");
  const [useFixed, setUseFixed] = useState(true);
  const [extra, setExtra] = useState("");
  const [extras, setExtras] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const templates = templatesForNewList(fixed);

  function addExtra() {
    const v = extra.trim();
    if (!v) return;
    setExtras((e) => [...e, v]);
    setExtra("");
  }

  async function submit() {
    if (!title.trim() || !date) return toast.error("Preencha o nome e a data.");
    setBusy(true);
    try {
      const list = await createBagList({
        title: title.trim(),
        date,
        note: note.trim() || null,
        items: [...(useFixed ? templates : []), ...extras.map((name) => ({ name }))],
      });
      await qc.invalidateQueries({ queryKey: ["bag_lists"] });
      await qc.invalidateQueries({ queryKey: ["bag_list_items"] });
      onOpenChange(false);
      setExtras([]);
      setNote("");
      navigate({ to: "/bolsa/$id", params: { id: list.id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title="Nova lista">
      <div className="space-y-4">
        <Field label="Nome da lista">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Faculdade, Acampamento…" />
        </Field>
        <Field label="Data">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm">
            Incluir itens fixos <span className="text-muted-foreground">({templates.length})</span>
          </span>
          <Switch checked={useFixed} onCheckedChange={setUseFixed} />
        </label>
        <Field label="Itens só desta lista">
          <div className="flex gap-2">
            <Input
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExtra())}
              placeholder="Ex.: lanterna"
            />
            <Button type="button" variant="outline" size="icon" onClick={addExtra} aria-label="Adicionar item">
              <Plus className="size-4" />
            </Button>
          </div>
        </Field>
        {extras.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extras.map((x, i) => (
              <span key={i} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs">
                {x}
                <button onClick={() => setExtras((e) => e.filter((_, j) => j !== i))} aria-label={`Remover ${x}`}>
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <Field label="Observações (opcional)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        <Button className="w-full" disabled={busy} onClick={() => void submit()}>
          Criar lista
        </Button>
      </div>
    </FormModal>
  );
}

function FixedItemsModal({ open, onOpenChange, items }: { open: boolean; onOpenChange: (v: boolean) => void; items: BagItem[] }) {
  const save = useSave("bag_items");
  const remove = useRemove("bag_items", "Item removido dos fixos");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [category, setCategory] = useState("");

  function add() {
    if (!name.trim()) return;
    save.mutate({
      name: name.trim(),
      icon: icon.trim() || null,
      category: category.trim() || null,
      is_fixed: true,
      active: true,
      order_index: items.length,
    });
    setName("");
    setIcon("");
  }

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title="Meus itens fixos" description="Modelos copiados para cada nova lista. Mudar aqui não altera listas já criadas.">
      <div className="space-y-4">
        <div className="grid grid-cols-[3.5rem_1fr] gap-2">
          <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🔑" maxLength={4} aria-label="Emoji" className="text-center" />
          <Input value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Nome do item" />
          <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Categoria (opcional)" className="col-span-2" />
        </div>
        <Button className="w-full" variant="outline" onClick={add}>
          <Plus className="size-4" /> Adicionar item
        </Button>
        <div className="divide-y divide-border rounded-xl border border-border">
          {items.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Nenhum item cadastrado.</p>}
          {items.map((it) => (
            <div key={it.id} className={cn("flex items-center gap-2 px-3 py-2.5", !it.active && "opacity-50")}>
              <span className="w-6 text-center">{it.icon || "•"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{it.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {[it.category, it.is_fixed ? "Fixo" : "Não fixo", it.active ? null : "Pausado"].filter(Boolean).join(" · ")}
                </p>
              </div>
              <button
                className="rounded-md px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                onClick={() => save.mutate({ id: it.id, is_fixed: !it.is_fixed })}
              >
                {it.is_fixed ? "Fixo" : "Avulso"}
              </button>
              <Switch
                checked={it.active}
                onCheckedChange={(v) => save.mutate({ id: it.id, active: v })}
                aria-label={`Ativar ${it.name}`}
              />
              <Button variant="ghost" size="icon" aria-label={`Excluir ${it.name}`} onClick={() => remove.mutate(it.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>
    </FormModal>
  );
}
