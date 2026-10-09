import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ImagePlus, Pencil, PiggyBank, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { currentUserId } from "@/lib/db";
import { daysUntil, formatMoneyInput, goalProgress, parseMoney } from "@/lib/money";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormModal } from "@/components/ui-kit";
import { MoneyInput } from "./MoneyInput";

/* ---------------- storage ---------------- */

const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadFinancePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_BYTES) throw new Error("A imagem precisa ter até 10 MB.");
  const uid = await currentUserId();
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const path = `${uid}/finance/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
  if (error) throw new Error("Não foi possível enviar a foto. Tente novamente.");
  return path;
}

export async function removeFinancePhoto(path: string | null | undefined) {
  if (path) await supabase.storage.from("media").remove([path]);
}

export function useSignedUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["signed-url", path],
    enabled: !!path,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("media").createSignedUrl(path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  }).data;
}

/* ---------------- cover ---------------- */

function Cover({ path, className }: { path: string | null | undefined; className?: string }) {
  const url = useSignedUrl(path);
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted", className)}>
      {url ? (
        <img src={url} alt="" className="size-full object-cover" loading="lazy" />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary/15 to-primary/5">
          <PiggyBank className="size-6 text-primary/70" />
        </div>
      )}
    </div>
  );
}

/* ---------------- card ---------------- */

export type GoalItem = {
  id: string;
  name: string;
  target: number;
  saved: number;
  photo_path: string | null;
  date?: string | null;
  note?: string | null;
  done?: boolean;
};

export function GoalCard({
  item,
  onEdit,
  onDelete,
  onAddMoney,
  onToggleDone,
}: {
  item: GoalItem;
  onEdit: () => void;
  onDelete: () => void;
  onAddMoney: () => void;
  onToggleDone?: () => void;
}) {
  const p = goalProgress(item.saved, item.target);
  const days = item.date ? daysUntil(item.date) : null;
  return (
    <li className={cn("surface animate-in fade-in-0 slide-in-from-bottom-1 p-3 duration-300", item.done && "opacity-60")}>
      <div className="flex gap-3">
        <Cover path={item.photo_path} className="size-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1">
            <p className={cn("min-w-0 flex-1 truncate text-sm font-medium", item.done && "line-through")}>
              {item.name}
            </p>
            <Button variant="ghost" size="icon" className="-mt-1.5 size-8" aria-label="Editar" onClick={onEdit}>
              <Pencil className="size-3.5 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="icon" className="-mr-1.5 -mt-1.5 size-8" aria-label="Excluir" onClick={onDelete}>
              <Trash2 className="size-3.5 text-muted-foreground" />
            </Button>
          </div>
          <p className="num mt-0.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{money(item.saved)}</span> de {money(item.target)}
          </p>
          {item.date && (
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarDays className="size-3" />
              {new Date(`${item.date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })}
              {!item.done && days !== null && (
                <span className={cn(days < 0 && "text-destructive")}>
                  {" · "}
                  {days === 0 ? "hoje" : days > 0 ? `faltam ${days} dia(s)` : `passou há ${-days} dia(s)`}
                </span>
              )}
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${p.pct}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="num font-medium">{p.pct.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</span>
        <span className="num text-muted-foreground">
          {p.excess > 0 ? `+${money(p.excess)} acima da meta` : p.done ? "Meta atingida" : `falta ${money(p.remaining)}`}
        </span>
        <div className="ml-auto flex gap-1.5">
          {onToggleDone && (
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onToggleDone}>
              {item.done ? "Reabrir" : "Comprado"}
            </Button>
          )}
          <Button size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={onAddMoney}>
            <Plus className="size-3" /> Guardar
          </Button>
        </div>
      </div>
    </li>
  );
}

/* ---------------- form ---------------- */

export type GoalFormValues = {
  name: string;
  target: number;
  saved: number;
  photo_path: string | null;
  date?: string;
  note?: string | null;
};

export function GoalFormModal({
  open,
  onOpenChange,
  title,
  initial,
  withDate,
  targetLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  initial: GoalItem | null;
  withDate?: boolean;
  targetLabel: string;
  onSubmit: (v: GoalFormValues) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const existingUrl = useSignedUrl(photo);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setTarget(initial ? formatMoneyInput(initial.target) : "");
    setSaved(initial ? formatMoneyInput(initial.saved) : "");
    setDate(initial?.date ?? "");
    setNote(initial?.note ?? "");
    setPhoto(initial?.photo_path ?? null);
    setFile(null);
    setPreview(null);
  }, [open, initial]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return toast.error("Escolha um arquivo de imagem.");
    if (f.size > MAX_BYTES) return toast.error("A imagem precisa ter até 10 MB.");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = parseMoney(target);
    const s = saved.trim() === "" ? 0 : parseMoney(saved);
    if (!name.trim()) return toast.error("Informe o nome.");
    if (t === null || t <= 0) return toast.error("Informe um valor de meta maior que zero.");
    if (s === null || s < 0) return toast.error("O valor guardado não pode ser negativo.");
    if (withDate && !date) return toast.error("Informe a data prevista.");
    setBusy(true);
    try {
      let path = photo;
      if (file) path = await uploadFinancePhoto(file);
      await onSubmit({ name: name.trim(), target: t, saved: s, photo_path: path, date, note: note.trim() || null });
      if (initial?.photo_path && initial.photo_path !== path) await removeFinancePhoto(initial.photo_path);
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || "Não foi possível salvar.");
    } finally {
      setBusy(false);
    }
  }

  const shown = preview ?? (photo ? existingUrl : null);

  return (
    <FormModal open={open} onOpenChange={onOpenChange} title={title}>
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/50 transition-colors hover:bg-muted"
            aria-label="Escolher foto"
          >
            {shown ? (
              <img src={shown} alt="Prévia" className="size-full object-cover" />
            ) : (
              <ImagePlus className="size-6 text-muted-foreground" />
            )}
          </button>
          <div className="space-y-1.5">
            <p className="text-sm font-medium">Foto de capa</p>
            <div className="flex gap-1.5">
              <Button type="button" size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
                {shown ? "Trocar" : "Escolher"}
              </Button>
              {shown && (
                <Button type="button" size="sm" variant="ghost" onClick={() => { setFile(null); setPreview(null); setPhoto(null); }}>
                  <X className="size-3.5" /> Remover
                </Button>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">Opcional · até 10 MB</p>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        <Field label="Nome">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={withDate ? "Ex.: Bolsa" : "Ex.: Tênis novo"} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={targetLabel}>
            <MoneyInput value={target} onChange={setTarget} required />
          </Field>
          <Field label="Já guardado">
            <MoneyInput value={saved} onChange={setSaved} />
          </Field>
        </div>
        {withDate && (
          <>
            <Field label="Data prevista">
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </Field>
            <Field label="Observações">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
            </Field>
          </>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Salvando…" : "Salvar"}
        </Button>
      </form>
    </FormModal>
  );
}

/* ---------------- add money ---------------- */

export function AddMoneyModal({
  item,
  onOpenChange,
  onSubmit,
}: {
  item: GoalItem | null;
  onOpenChange: (v: boolean) => void;
  onSubmit: (newSaved: number) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(""), [item]);
  return (
    <FormModal open={!!item} onOpenChange={onOpenChange} title={`Guardar em ${item?.name ?? ""}`}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const n = parseMoney(value);
          if (n === null || n === 0) return toast.error("Informe um valor.");
          const next = Math.max(0, Math.round(((item?.saved ?? 0) + n) * 100) / 100);
          await onSubmit(next);
          onOpenChange(false);
        }}
      >
        <Field label="Valor a adicionar">
          <MoneyInput value={value} onChange={setValue} autoFocus required />
        </Field>
        <p className="num text-xs text-muted-foreground">
          Guardado agora: {money(item?.saved ?? 0)}
          {parseMoney(value) ? ` → ${money((item?.saved ?? 0) + (parseMoney(value) ?? 0))}` : ""}
        </p>
        <Button type="submit" className="w-full">Adicionar</Button>
      </form>
    </FormModal>
  );
}
