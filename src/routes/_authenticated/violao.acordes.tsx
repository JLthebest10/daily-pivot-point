import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { CATEGORIES, customToVoicing, findVoicings, parseChordName, parseFrets, type Voicing } from "@/lib/chords";
import { useList, useRemove, useSave } from "@/lib/db";
import type { CustomChordRow } from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FormModal, PageHeader } from "@/components/ui-kit";
import { ChordBrowser, useCustomChords } from "@/components/violao/ChordPicker";
import { ChordDiagram } from "@/components/violao/ChordDiagram";

export const Route = createFileRoute("/_authenticated/violao/acordes")({
  head: () => ({
    meta: [
      { title: "Biblioteca de Acordes — Violão — Life Hub" },
      { name: "description", content: "Diagramas de acordes de violão pesquisáveis por nome e categoria." },
      { property: "og:title", content: "Biblioteca de Acordes — Life Hub" },
      { property: "og:description", content: "Encontre qualquer acorde de violão pelo nome e veja o diagrama." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChordsPage,
});

const FINGER = ["", "indicador", "médio", "anelar", "mínimo"];
const STRING = ["6ª (Mi grave)", "5ª (Lá)", "4ª (Ré)", "3ª (Sol)", "2ª (Si)", "1ª (Mi agudo)"];

function ChordDetail({ chord }: { chord: Voicing }) {
  const custom = useCustomChords();
  const all = findVoicings(chord.name, custom);
  const [idx, setIdx] = useState(Math.max(0, all.findIndex((v) => v.frets.join() === chord.frets.join())));
  const v = all[idx] ?? chord;
  const cat = CATEGORIES.find((c) => c.key === v.category)?.label;
  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <ChordDiagram voicing={v} size="lg" />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        {cat}
        {v.custom && " · posição cadastrada por você"}
        {v.baseFret > 1 && ` · começa na ${v.baseFret}ª casa`}
        {v.barre && ` · pestana na ${v.barre.fret}ª casa`}
      </p>
      {all.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1.5">
          {all.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              className={`rounded-full border px-3 py-1 text-xs ${i === idx ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}
            >
              Posição {i + 1}
            </button>
          ))}
        </div>
      )}
      <ul className="surface divide-y divide-border text-sm">
        {v.frets.map((f, i) => (
          <li key={i} className="flex justify-between px-4 py-2">
            <span className="text-muted-foreground">Corda {STRING[i]}</span>
            <span className="font-medium">
              {f == null ? "não tocar" : f === 0 ? "solta" : `${f}ª casa${v.fingers[i] ? ` · ${FINGER[v.fingers[i]!]}` : ""}`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CustomChordForm({ onDone }: { onDone: () => void }) {
  const save = useSave("guitar_custom_chords", "Posição salva");
  const [name, setName] = useState("");
  const [frets, setFrets] = useState("");
  const [fingers, setFingers] = useState("");
  const preview = name.trim() && parseFrets(frets) ? customToVoicing({ name, frets, fingers: fingers || null }) : null;
  const badFingers = fingers.trim() !== "" && !parseFrets(fingers);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!preview || badFingers) return;
        await save.mutateAsync({ name: name.trim(), frets: frets.trim(), fingers: fingers.trim() || null });
        onDone();
      }}
    >
      <Field label="Nome do acorde">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: C7(9)" maxLength={20} required />
      </Field>
      <Field label="Casas (da 6ª para a 1ª corda; x = não tocar)">
        <Input value={frets} onChange={(e) => setFrets(e.target.value)} placeholder="x32010" autoCapitalize="off" required />
      </Field>
      <Field label="Dedos (opcional, 0 ou x quando solta/abafada)">
        <Input value={fingers} onChange={(e) => setFingers(e.target.value)} placeholder="x32010" autoCapitalize="off" />
      </Field>
      {preview ? (
        <div className="flex flex-col items-center gap-1">
          <ChordDiagram voicing={preview} size="md" />
          {parseChordName(name) == null && (
            <p className="text-xs text-muted-foreground">Nome fora do padrão: aparecerá em “Meus acordes”.</p>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {frets && !parseFrets(frets) ? "Use 6 posições, ex.: x32010 ou 8 10 10 9 8 8." : "Escolha posições que alcancem até 4 casas, ou informe os dedos."}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={!preview || badFingers || save.isPending}>
        Salvar posição
      </Button>
    </form>
  );
}

function ChordsPage() {
  const [sel, setSel] = useState<Voicing | null>(null);
  const [adding, setAdding] = useState(false);
  const rows = useList<CustomChordRow>("guitar_custom_chords", { order: { column: "created_at" } });
  const remove = useRemove("guitar_custom_chords", "Posição removida");

  return (
    <>
      <Link to="/violao" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Repertório
      </Link>
      <PageHeader
        title="Biblioteca de Acordes"
        subtitle="Procure pelo nome e toque no acorde para ver todas as posições."
        action={
          <Button variant="outline" onClick={() => setAdding(true)} className="shrink-0">
            <Plus className="size-4" /> Nova posição
          </Button>
        }
      />
      <ChordBrowser onSelect={setSel} size="md" />

      {(rows.data?.length ?? 0) > 0 && (
        <div className="mt-8">
          <p className="mb-2 text-sm font-medium text-muted-foreground">Posições cadastradas por você</p>
          <ul className="space-y-1">
            {rows.data!.map((r) => (
              <li key={r.id} className="surface flex items-center justify-between px-4 py-2 text-sm">
                <span><b>{r.name}</b> <span className="text-muted-foreground">{r.frets}</span></span>
                <Button variant="ghost" size="icon" aria-label={`Remover ${r.name}`} onClick={() => remove.mutate(r.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <FormModal open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel?.name ?? ""}>
        {sel && <ChordDetail chord={sel} />}
      </FormModal>
      <FormModal open={adding} onOpenChange={setAdding} title="Nova posição de acorde">
        {adding && <CustomChordForm onDone={() => setAdding(false)} />}
      </FormModal>
    </>
  );
}
