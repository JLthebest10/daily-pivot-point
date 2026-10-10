import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Plus, Trash2 } from "lucide-react";
import { CATEGORIES, findVoicings, type Voicing } from "@/lib/chords";
import { useList, useRemove } from "@/lib/db";
import { songsUsingChord, type CustomChordRow, type Song } from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { FormModal, PageHeader, SectionTitle } from "@/components/ui-kit";
import { ChordBrowser, useCustomChords } from "@/components/violao/ChordPicker";
import { ChordDiagram } from "@/components/violao/ChordDiagram";
import { ChordEditor } from "@/components/violao/ChordEditor";

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

function ChordDetail({
  chord,
  onEdit,
  onDelete,
}: {
  chord: Voicing;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const custom = useCustomChords();
  const all = chord.id ? [chord] : findVoicings(chord.name, custom.filter((v) => !v.id));
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
        {v.custom && " · criado por você"}
        {v.baseFret > 1 && ` · começa na ${v.baseFret}ª casa`}
        {v.barre && ` · pestana na ${v.barre.fret}ª casa`}
      </p>
      {v.note && <p className="surface px-4 py-2 text-sm">{v.note}</p>}
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
      {chord.id && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button variant="outline" className="text-destructive" onClick={onDelete}>
            <Trash2 className="size-4" /> Excluir
          </Button>
        </div>
      )}
    </div>
  );
}

function ChordsPage() {
  const [sel, setSel] = useState<Voicing | null>(null);
  const [editing, setEditing] = useState<CustomChordRow | "new" | null>(null);
  const [del, setDel] = useState<Voicing | null>(null);
  const rows = useList<CustomChordRow>("guitar_custom_chords", { order: { column: "created_at" } });
  const songs = useList<Song>("guitar_songs");
  const custom = useCustomChords();
  const remove = useRemove("guitar_custom_chords", "Acorde excluído");
  const usedBy = del?.id ? songsUsingChord(songs.data ?? [], del.id) : [];

  return (
    <>
      <Link to="/violao" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Repertório
      </Link>
      <PageHeader
        title="Biblioteca de Acordes"
        subtitle="Procure pelo nome e toque no acorde para ver todas as posições."
        action={
          <Button onClick={() => setEditing("new")} className="shrink-0">
            <Plus className="size-4" /> Criar acorde
          </Button>
        }
      />

      {custom.length > 0 && (
        <section className="mb-8">
          <SectionTitle>Meus acordes</SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {custom.map((v) => (
              <button key={v.id ?? v.name} onClick={() => setSel(v)} className="surface flex justify-center px-1 py-2 hover:bg-muted/50">
                <ChordDiagram voicing={v} size="md" />
              </button>
            ))}
          </div>
        </section>
      )}

      <ChordBrowser onSelect={setSel} size="md" />

      <FormModal open={!!sel} onOpenChange={(v) => !v && setSel(null)} title={sel?.name ?? ""}>
        {sel && (
          <ChordDetail
            chord={sel}
            onEdit={() => {
              const row = rows.data?.find((r) => r.id === sel.id);
              setSel(null);
              if (row) setEditing(row);
            }}
            onDelete={() => {
              setDel(sel);
              setSel(null);
            }}
          />
        )}
      </FormModal>

      <FormModal open={editing !== null} onOpenChange={(v) => !v && setEditing(null)} title={editing === "new" ? "Criar acorde" : "Editar acorde"}>
        {editing && <ChordEditor initial={editing === "new" ? undefined : editing} onDone={() => setEditing(null)} />}
      </FormModal>

      <FormModal open={!!del} onOpenChange={(v) => !v && setDel(null)} title={`Excluir “${del?.name ?? ""}”?`}>
        {del && (usedBy.length > 0 ? (
          <div className="space-y-3 text-sm">
            <p>Esse acorde está na cifra de {usedBy.length === 1 ? "uma música" : `${usedBy.length} músicas`}. Retire-o delas antes de excluir, para a cifra não ficar quebrada:</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              {usedBy.map((s) => <li key={s.id}>{s.title}</li>)}
            </ul>
            <Button className="w-full" variant="outline" onClick={() => setDel(null)}>Entendi</Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">O acorde sai da sua biblioteca. Não dá para desfazer.</p>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => setDel(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  remove.mutate(del.id!);
                  setDel(null);
                }}
              >
                Excluir
              </Button>
            </div>
          </div>
        ))}
      </FormModal>
    </>
  );
}
