import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Pencil, Play, Star, Trash2 } from "lucide-react";
import { useList, useRemove, useSave } from "@/lib/db";
import { DIFFICULTY_LABEL, chordLabel, resolveChord, type Song } from "@/lib/guitar";
import { Button } from "@/components/ui/button";
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
import { ErrorNote, FormModal, LoadingList, SectionTitle } from "@/components/ui-kit";
import { SongForm } from "@/components/violao/SongForm";
import { ChordDiagram } from "@/components/violao/ChordDiagram";
import { useCustomChords } from "@/components/violao/ChordPicker";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/violao/$id")({
  head: () => ({
    meta: [
      { title: "Música — Violão — Life Hub" },
      { name: "description", content: "Ficha da música: acordes, cifra, letra e videoaula." },
      { property: "og:title", content: "Música — Violão — Life Hub" },
      { property: "og:description", content: "Acordes, cifra, letra e videoaula da música." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SongPage,
});

function Chords({ names }: { names: string[] }) {
  const custom = useCustomChords();
  return (
    <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4">
      {names.map((n, i) => {
        const v = resolveChord(n, custom);
        return v ? (
          <div key={n + i} className="surface px-2 py-3">
            <ChordDiagram voicing={v} size="fluid" />
          </div>
        ) : (
          <div key={n + i} className="surface flex flex-col items-center justify-center px-2 py-6 text-center">
            <p className="text-base font-semibold">{chordLabel(n, custom)}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">Sem diagrama na biblioteca</p>
          </div>
        );
      })}
    </div>
  );
}

function SongPage() {
  const { id } = Route.useParams();
  const q = useList<Song>("guitar_songs", { eq: { id } });
  const save = useSave("guitar_songs");
  const remove = useRemove("guitar_songs", "Música excluída");
  const navigate = useNavigate();
  const [edit, setEdit] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const song = q.data?.[0];

  if (q.isLoading) return <LoadingList />;
  if (!song)
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        <ErrorNote error={q.error} />
        Música não encontrada. <Link to="/violao" className="text-primary">Voltar ao repertório</Link>
      </div>
    );

  const sections = song.sections ?? [];
  const isParts = song.chord_mode === "parts";
  const hasCifra = isParts ? sections.length > 0 : (song.chords ?? []).length > 0;

  return (
    <>
      <Link to="/violao" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Repertório
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight">{song.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {[song.artist, song.song_key && `Tom: ${song.song_key}`, song.difficulty && DIFFICULTY_LABEL[song.difficulty]]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={song.favorite ? "Remover dos favoritos" : "Favoritar"}
          onClick={() => save.mutate({ id: song.id, favorite: !song.favorite })}
        >
          <Star className={cn("size-5", song.favorite && "fill-primary text-primary")} />
        </Button>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {song.video_url ? (
          <Button asChild>
            <a href={song.video_url} target="_blank" rel="noopener noreferrer">
              <Play className="size-4 fill-current" /> Abrir videoaula
            </a>
          </Button>
        ) : (
          <p className="self-center text-xs text-muted-foreground">Ainda não há videoaula vinculada.</p>
        )}
        <Button variant="outline" onClick={() => setEdit(true)}>
          <Pencil className="size-4" /> Editar
        </Button>
        <Button variant="outline" className="text-destructive" onClick={() => setConfirm(true)}>
          <Trash2 className="size-4" /> Excluir
        </Button>
      </div>

      {hasCifra && (
        <section className="mb-10">
          <h2 className="mb-3 text-lg font-semibold tracking-tight">Cifra</h2>
          {!isParts ? (
            <Chords names={song.chords} />
          ) : (
            <div className="space-y-6">
              {sections.map((s) => (
                <div key={s.id}>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{s.name}</h3>
                  {s.chords.length > 0 && <Chords names={s.chords} />}
                  {s.text && <pre className="surface mt-2 whitespace-pre-wrap px-4 py-3 font-mono text-xs leading-relaxed">{s.text}</pre>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {song.lyrics && (
        <section className="mb-8">
          <SectionTitle>Letra</SectionTitle>
          <pre className="surface whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed">{song.lyrics}</pre>
        </section>
      )}

      {song.notes && (
        <section className="mb-8">
          <SectionTitle>Observações</SectionTitle>
          <p className="surface whitespace-pre-wrap px-4 py-3 text-sm">{song.notes}</p>
        </section>
      )}

      {!hasCifra && !song.lyrics && !song.notes && (
        <p className="text-sm text-muted-foreground">Cifra e letra ainda não cadastradas. Toque em Editar para adicionar.</p>
      )}

      <FormModal open={edit} onOpenChange={setEdit} title="Editar música">
        {edit && <SongForm initial={song} onDone={() => setEdit(false)} />}
      </FormModal>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir “{song.title}”?</AlertDialogTitle>
            <AlertDialogDescription>A cifra, a letra e as observações serão apagadas. Não dá para desfazer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                remove.mutate(song.id);
                navigate({ to: "/violao" });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
