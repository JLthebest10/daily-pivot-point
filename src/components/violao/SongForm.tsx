import { useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useSave } from "@/lib/db";
import {
  DIFFICULTY_LABEL,
  SECTION_PRESETS,
  isYoutubeUrl,
  chordLabel,
  newSectionId,
  resolveChord,
  youtubeId,
  type Song,
  type SongSection,
} from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { selectCls } from "@/components/flashcards/TopicForm";
import { ChordPickerDialog, useCustomChords } from "./ChordPicker";
import { ChordDiagram } from "./ChordDiagram";
import { cn } from "@/lib/utils";

type PickTarget = { kind: "full"; index: number } | { kind: "section"; id: string };

/** Ordered chord sequence with move / remove / insert-between controls. */
function FullSequence({
  chords,
  onChange,
  onInsert,
}: {
  chords: string[];
  onChange: (c: string[]) => void;
  onInsert: (index: number) => void;
}) {
  const custom = useCustomChords();
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= chords.length) return;
    const c = [...chords];
    [c[i], c[j]] = [c[j]!, c[i]!];
    onChange(c);
  };
  if (!chords.length)
    return (
      <button
        type="button"
        onClick={() => onInsert(0)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border py-6 text-sm text-muted-foreground"
      >
        <Plus className="size-4" /> Adicionar primeiro acorde
      </button>
    );
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {chords.map((ref, i) => {
        const v = resolveChord(ref, custom);
        return (
          <div key={i} className="surface flex flex-col items-center gap-1 p-1.5">
            <span className="self-start text-[10px] text-muted-foreground">{i + 1}</span>
            {v ? <ChordDiagram voicing={v} size="sm" /> : <p className="py-6 text-sm font-semibold">{chordLabel(ref, custom)}</p>}
            <div className="flex w-full justify-between">
              <button type="button" aria-label="Mover para antes" disabled={i === 0} onClick={() => move(i, -1)} className="rounded-md p-1.5 disabled:opacity-30">
                <ArrowLeft className="size-4" />
              </button>
              <button type="button" aria-label="Remover acorde" onClick={() => onChange(chords.filter((_, k) => k !== i))} className="rounded-md p-1.5 text-destructive">
                <X className="size-4" />
              </button>
              <button type="button" aria-label="Mover para depois" disabled={i === chords.length - 1} onClick={() => move(i, 1)} className="rounded-md p-1.5 disabled:opacity-30">
                <ArrowRight className="size-4" />
              </button>
            </div>
            <button type="button" onClick={() => onInsert(i + 1)} className="w-full rounded-md border border-dashed border-border py-1 text-[11px] text-muted-foreground">
              + inserir depois
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={() => onInsert(chords.length)}
        className="flex min-h-32 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-xs text-muted-foreground"
      >
        <Plus className="size-5" /> Acorde
      </button>
    </div>
  );
}

export function SongForm({ initial, onDone }: { initial?: Song; onDone: (id?: string) => void }) {
  const save = useSave("guitar_songs", initial ? "Música atualizada" : "Música adicionada");
  const [f, setF] = useState({
    title: initial?.title ?? "",
    artist: initial?.artist ?? "",
    song_key: initial?.song_key ?? "",
    difficulty: initial?.difficulty ?? "",
    notes: initial?.notes ?? "",
    video_url: initial?.video_url ?? "",
    lyrics: initial?.lyrics ?? "",
  });
  const [sections, setSections] = useState<SongSection[]>(initial?.sections ?? []);
  const [mode, setMode] = useState<"full" | "parts">(initial?.chord_mode ?? "full");
  const [chords, setChords] = useState<string[]>(initial?.chords ?? []);
  const [pick, setPick] = useState<PickTarget | null>(null);
  const custom = useCustomChords();
  const videoBad = f.video_url.trim() !== "" && !isYoutubeUrl(f.video_url);
  const vid = youtubeId(f.video_url);

  const upd = (id: string, patch: Partial<SongSection>) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) =>
    setSections((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j]!, c[i]!];
      return c;
    });

  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.title.trim() || videoBad) return;
        const row = await save.mutateAsync({
          ...(initial ? { id: initial.id } : {}),
          title: f.title.trim(),
          artist: f.artist.trim() || null,
          song_key: f.song_key.trim() || null,
          difficulty: f.difficulty || null,
          notes: f.notes.trim() || null,
          video_url: f.video_url.trim() || null,
          lyrics: f.lyrics.replace(/\s+$/, "") || null,
          chord_mode: mode,
          chords,
          sections: sections.map((s) => ({ ...s, name: s.name.trim() || "Parte", text: s.text?.trim() || undefined })),
        });
        onDone((row as { id?: string } | undefined)?.id);
      }}
    >
      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Informações básicas</h3>
        <Field label="Nome da música">
          <Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} maxLength={200} required />
        </Field>
        <Field label="Artista ou banda">
          <Input value={f.artist} onChange={(e) => setF({ ...f, artist: e.target.value })} maxLength={200} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tom original">
            <Input value={f.song_key} onChange={(e) => setF({ ...f, song_key: e.target.value })} placeholder="Ex.: G" maxLength={12} />
          </Field>
          <Field label="Dificuldade">
            <select className={selectCls} value={f.difficulty} onChange={(e) => setF({ ...f, difficulty: e.target.value as typeof f.difficulty })}>
              <option value="">—</option>
              {Object.entries(DIFFICULTY_LABEL).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Videoaula</h3>
        <Field label="Link do YouTube">
          <Input
            type="url"
            inputMode="url"
            value={f.video_url}
            onChange={(e) => setF({ ...f, video_url: e.target.value })}
            placeholder="https://youtu.be/..."
            aria-invalid={videoBad}
          />
        </Field>
        {videoBad && <p className="text-xs text-destructive">Esse endereço não é um link válido do YouTube.</p>}
        {vid && (
          <div className="flex items-center gap-3">
            <img src={`https://i.ytimg.com/vi/${vid}/mqdefault.jpg`} alt="Prévia do vídeo" className="h-14 w-24 rounded-md object-cover" />
            <Button type="button" variant="ghost" size="sm" onClick={() => setF({ ...f, video_url: "" })}>
              <X className="size-4" /> Remover link
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cifras da música</h3>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label="Forma de organizar a cifra">
          {([["full", "Cifra completa"], ["parts", "Cifra por partes"]] as const).map(([k, l]) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={mode === k}
              onClick={() => setMode(k)}
              className={cn("rounded-md py-2 text-sm transition-colors", mode === k ? "bg-background font-medium shadow-sm" : "text-muted-foreground")}
            >
              {l}
            </button>
          ))}
        </div>
        {mode === "full" && (
          <>
            <p className="text-xs text-muted-foreground">Adicione os acordes na ordem em que aparecem. Pode repetir o mesmo acorde.</p>
            <FullSequence chords={chords} onChange={setChords} onInsert={(index) => setPick({ kind: "full", index })} />
          </>
        )}
        {mode === "parts" && sections.length === 0 && (
          <p className="text-xs text-muted-foreground">Opcional. Adicione partes e escolha os acordes de cada uma.</p>
        )}
        {mode === "parts" && sections.map((s, i) => (
          <div key={s.id} className="surface space-y-2 p-3">
            <div className="flex items-center gap-1">
              <Input
                value={s.name}
                onChange={(e) => upd(s.id, { name: e.target.value })}
                list="section-presets"
                className="h-9 flex-1"
                aria-label="Nome da parte"
              />
              <Button type="button" variant="ghost" size="icon" aria-label="Subir parte" onClick={() => move(i, -1)} disabled={i === 0}>
                <ArrowUp className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Descer parte" onClick={() => move(i, 1)} disabled={i === sections.length - 1}>
                <ArrowDown className="size-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" aria-label="Remover parte" onClick={() => setSections((x) => x.filter((y) => y.id !== s.id))}>
                <Trash2 className="size-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {s.chords.map((c, ci) => (
                <span key={ci} className="flex items-center gap-1 rounded-full bg-primary/15 py-1 pl-2.5 pr-1 text-xs font-semibold text-primary">
                  {chordLabel(c, custom)}
                  <button
                    type="button"
                    aria-label={`Remover ${chordLabel(c, custom)}`}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    onClick={() => upd(s.id, { chords: s.chords.filter((_, k) => k !== ci) })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setPick({ kind: "section", id: s.id })}
                className="flex items-center gap-1 rounded-full border border-dashed border-border px-3 py-1 text-xs text-muted-foreground"
              >
                <Plus className="size-3" /> Acorde
              </button>
            </div>
            <Textarea
              rows={2}
              value={s.text ?? ""}
              onChange={(e) => upd(s.id, { text: e.target.value })}
              placeholder="Cifra/letra desta parte (opcional)"
              className="font-mono text-xs"
            />
          </div>
        ))}
        <datalist id="section-presets">
          {SECTION_PRESETS.map((p) => <option key={p} value={p} />)}
        </datalist>
        {mode === "parts" && <div className="flex flex-wrap gap-1.5">
          {SECTION_PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setSections((x) => [...x, { id: newSectionId(), name: p, chords: [] }])}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
            >
              + {p}
            </button>
          ))}
        </div>}
      </section>

      <section className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Letra e observações</h3>
        <Field label="Letra (opcional)">
          <Textarea rows={8} value={f.lyrics} onChange={(e) => setF({ ...f, lyrics: e.target.value })} placeholder="Cole aqui a letra" />
        </Field>
        <Field label="Observações pessoais">
          <Textarea rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Capotraste na 2ª casa, batida..." />
        </Field>
      </section>

      <Button type="submit" className="w-full" disabled={save.isPending || videoBad}>
        {initial ? "Salvar alterações" : "Salvar música"}
      </Button>

      <ChordPickerDialog
        open={pick !== null}
        onOpenChange={(v) => !v && setPick(null)}
        onPick={(ref) => {
          if (!pick) return;
          if (pick.kind === "full") setChords((c) => [...c.slice(0, pick.index), ref, ...c.slice(pick.index)]);
          else setSections((x) => x.map((s) => (s.id === pick.id ? { ...s, chords: [...s.chords, ref] } : s)));
        }}
      />
    </form>
  );
}
