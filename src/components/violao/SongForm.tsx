import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useSave } from "@/lib/db";
import {
  DIFFICULTY_LABEL,
  SECTION_PRESETS,
  isYoutubeUrl,
  newSectionId,
  youtubeId,
  type Song,
  type SongSection,
} from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui-kit";
import { selectCls } from "@/components/flashcards/TopicForm";
import { ChordPickerDialog } from "./ChordPicker";

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
  const [pickFor, setPickFor] = useState<string | null>(null);
  const videoBad = f.video_url.trim() !== "" && !isYoutubeUrl(f.video_url);
  const vid = youtubeId(f.video_url);

  const upd = (id: string, patch: Partial<SongSection>) =>
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const move = (i: number, d: number) =>
    setSections((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const c = [...s];
      [c[i], c[j]] = [c[j], c[i]];
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
        {sections.length === 0 && (
          <p className="text-xs text-muted-foreground">Opcional. Adicione partes e escolha os acordes de cada uma.</p>
        )}
        {sections.map((s, i) => (
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
                  {c}
                  <button
                    type="button"
                    aria-label={`Remover ${c}`}
                    className="rounded-full p-0.5 hover:bg-primary/20"
                    onClick={() => upd(s.id, { chords: s.chords.filter((_, k) => k !== ci) })}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={() => setPickFor(s.id)}
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
        <div className="flex flex-wrap gap-1.5">
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
        </div>
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
        open={pickFor !== null}
        onOpenChange={(v) => !v && setPickFor(null)}
        onPick={(name) => {
          if (pickFor) setSections((x) => x.map((s) => (s.id === pickFor ? { ...s, chords: [...s.chords, name] } : s)));
        }}
      />
    </form>
  );
}
