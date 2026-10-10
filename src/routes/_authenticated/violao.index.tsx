import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { BookOpen, LayoutGrid, List, Play, Plus, Search, Star } from "lucide-react";
import { useList } from "@/lib/db";
import { shortDate, toISODate } from "@/lib/format";
import { DIFFICULTY_LABEL, filterSongs, songChords, type Song } from "@/lib/guitar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorNote, FormModal, LoadingList, PageHeader } from "@/components/ui-kit";
import { SongForm } from "@/components/violao/SongForm";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/violao/")({
  head: () => ({
    meta: [
      { title: "Violão — Meu Repertório — Life Hub" },
      { name: "description", content: "Todas as músicas que você já aprendeu no violão, com cifras, letras e videoaulas." },
      { property: "og:title", content: "Violão — Meu Repertório — Life Hub" },
      { property: "og:description", content: "Seu repertório de violão com acordes, letras e videoaulas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RepertoirePage,
});

function RepertoirePage() {
  const q = useList<Song>("guitar_songs", { order: { column: "created_at", ascending: false } });
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fav, setFav] = useState(false);
  const [grid, setGrid] = useState(false);
  const navigate = useNavigate();
  const songs = q.data ?? [];
  const list = filterSongs(songs, query, fav);

  return (
    <>
      <PageHeader
        title="Meu Repertório"
        subtitle="Todas as músicas que você já aprendeu."
        action={
          <Button onClick={() => setOpen(true)} className="shrink-0">
            <Plus className="size-4" /> Adicionar música
          </Button>
        }
      />
      <ErrorNote error={q.error} />

      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="num font-semibold text-foreground">{songs.length}</span> {songs.length === 1 ? "música" : "músicas"}
        </p>
        <Button asChild variant="outline" size="sm">
          <Link to="/violao/acordes">
            <BookOpen className="size-4" /> Biblioteca de Acordes
          </Link>
        </Button>
      </div>

      {q.isLoading ? (
        <LoadingList />
      ) : songs.length === 0 ? (
        <EmptyState
          title="Seu repertório começa aqui."
          description="Adicione sua primeira música e nunca mais esqueça os acordes que aprendeu."
          actionLabel="Adicionar primeira música"
          onAction={() => setOpen(true)}
        />
      ) : (
        <>
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar música ou artista" className="pl-8" />
            </div>
            <Button variant={fav ? "default" : "outline"} size="icon" aria-label="Só favoritas" aria-pressed={fav} onClick={() => setFav(!fav)}>
              <Star className={cn("size-4", fav && "fill-current")} />
            </Button>
            <Button variant="outline" size="icon" aria-label={grid ? "Ver em lista" : "Ver em grade"} onClick={() => setGrid(!grid)}>
              {grid ? <List className="size-4" /> : <LayoutGrid className="size-4" />}
            </Button>
          </div>

          {list.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma música encontrada.</p>
          ) : (
            <ul className={cn(grid ? "grid grid-cols-2 gap-2 sm:grid-cols-3" : "space-y-2")}>
              {list.map((s) => {
                const chords = songChords(s.sections ?? []);
                return (
                  <li key={s.id} className="surface relative flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/40">
                    <Link to="/violao/$id" params={{ id: s.id }} className="min-w-0 flex-1 after:absolute after:inset-0">
                      <div className="flex items-center gap-1.5">
                        {s.favorite && <Star className="size-3.5 shrink-0 fill-primary text-primary" />}
                        <p className="truncate text-sm font-semibold">{s.title}</p>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {[s.artist, s.difficulty && DIFFICULTY_LABEL[s.difficulty], `adicionada ${shortDate(toISODate(new Date(s.created_at)))}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                      {chords.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {chords.slice(0, grid ? 4 : 8).map((c) => (
                            <span key={c} className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-semibold">{c}</span>
                          ))}
                          {chords.length > (grid ? 4 : 8) && <span className="text-[11px] text-muted-foreground">+{chords.length - (grid ? 4 : 8)}</span>}
                        </div>
                      )}
                    </Link>
                    {s.video_url && (
                      <a
                        href={s.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Abrir videoaula de ${s.title}`}
                        className="relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"
                      >
                        <Play className="size-5 fill-current" />
                      </a>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}

      <FormModal open={open} onOpenChange={setOpen} title="Adicionar música">
        {open && (
          <SongForm
            onDone={(id) => {
              setOpen(false);
              if (id) navigate({ to: "/violao/$id", params: { id } });
            }}
          />
        )}
      </FormModal>
    </>
  );
}
