import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AlertTriangle, ArrowLeft, CheckCircle2, Trash2, WifiOff } from "lucide-react";
import { formatBytes, listOffline, onOfflineChange, storageEstimate, type OfflineRecord } from "@/lib/offline-videos";
import { LocalVideo, removeOfflineVideo, useOnline } from "@/components/violao/OfflineVideoPanel";
import { ChordDiagram } from "@/components/violao/ChordDiagram";
import { Button } from "@/components/ui/button";

/** Public on purpose: works with no internet and no sign-in, reading only this device's storage. */
export const Route = createFileRoute("/offline")({
  head: () => ({
    meta: [
      { title: "Vídeos offline — Life Hub" },
      { name: "description", content: "Videoaulas de violão guardadas neste aparelho para assistir sem internet." },
      { property: "og:title", content: "Vídeos offline — Life Hub" },
      { property: "og:description", content: "Assista às suas videoaulas de violão sem internet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfflinePage,
});

function useRecords() {
  const [recs, setRecs] = useState<OfflineRecord[] | null>(null);
  useEffect(() => {
    const load = () => listOffline().then(setRecs).catch(() => setRecs([]));
    load();
    return onOfflineChange(load);
  }, []);
  return recs;
}

function Song({ rec, onBack }: { rec: OfflineRecord; onBack: () => void }) {
  const s = rec.snapshot;
  const refs = s.chord_mode === "parts" ? null : s.chords;
  const Diagrams = ({ list }: { list: string[] }) => (
    <div className="grid grid-cols-2 gap-3 min-[380px]:grid-cols-3 sm:grid-cols-4">
      {list.map((r, i) => {
        const v = s.voicings[r];
        return (
          <div key={i} className="surface px-2 py-3">
            {v ? <ChordDiagram voicing={v} size="fluid" /> : <p className="py-6 text-center font-semibold">{r}</p>}
          </div>
        );
      })}
    </div>
  );
  return (
    <>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft className="size-4" /> Vídeos offline
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{[s.artist, s.song_key && `Tom: ${s.song_key}`].filter(Boolean).join(" · ")}</p>
      {rec.blob ? <div className="mb-8"><LocalVideo blob={rec.blob} /></div> : <p className="mb-8 text-sm text-destructive">Vídeo não disponível.</p>}
      {refs && refs.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-lg font-semibold">Cifra</h2>
          <Diagrams list={refs} />
        </section>
      )}
      {!refs &&
        s.sections.map((sec) => (
          <section key={sec.id} className="mb-6">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">{sec.name}</h3>
            {sec.chords.length > 0 && <Diagrams list={sec.chords} />}
            {sec.text && <pre className="surface mt-2 whitespace-pre-wrap px-4 py-3 font-mono text-xs">{sec.text}</pre>}
          </section>
        ))}
      {s.lyrics && <pre className="surface mb-6 whitespace-pre-wrap px-4 py-3 font-sans text-sm leading-relaxed">{s.lyrics}</pre>}
      {s.notes && <p className="surface whitespace-pre-wrap px-4 py-3 text-sm">{s.notes}</p>}
    </>
  );
}

function OfflinePage() {
  const recs = useRecords();
  const online = useOnline();
  const [open, setOpen] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ usage: number; quota: number } | null>(null);
  useEffect(() => {
    void storageEstimate().then(setUsage);
  }, [recs]);
  const sel = recs?.find((r) => r.songId === open);
  const total = (recs ?? []).reduce((n, r) => n + (r.size ?? 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-4xl px-5 py-6 lg:px-10 lg:py-10">
        {sel ? (
          <Song rec={sel} onBack={() => setOpen(null)} />
        ) : (
          <>
            {online && (
              <Link to="/violao" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground">
                <ArrowLeft className="size-4" /> Repertório
              </Link>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">Vídeos offline</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Guardados neste aparelho · {formatBytes(total)}
              {usage?.quota ? ` · ${formatBytes(Math.max(0, usage.quota - usage.usage))} livres` : ""}
            </p>
            {!online && (
              <p className="surface mt-4 flex items-center gap-2 px-4 py-3 text-sm">
                <WifiOff className="size-4 shrink-0" /> Você está sem internet. Os vídeos abaixo funcionam mesmo assim.
              </p>
            )}
            <ul className="mt-6 space-y-2">
              {recs === null ? null : recs.length === 0 ? (
                <li className="surface px-4 py-10 text-center text-sm text-muted-foreground">
                  Nenhum vídeo salvo neste aparelho. Abra uma música no Violão e toque em “Importar arquivo”.
                </li>
              ) : (
                recs.map((r) => (
                  <li key={r.songId} className="surface flex items-center gap-3 px-4 py-3">
                    <button className="min-w-0 flex-1 text-left" disabled={r.status !== "done"} onClick={() => setOpen(r.songId)}>
                      <p className="truncate text-sm font-semibold">{r.snapshot.title}</p>
                      <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                        {r.status === "done" ? (
                          <><CheckCircle2 className="size-3.5 text-primary" /> {formatBytes(r.size)}</>
                        ) : (
                          <span className="flex items-center gap-1 text-destructive"><AlertTriangle className="size-3.5" /> Falhou: {r.error ?? "incompleto"}</span>
                        )}
                      </p>
                    </button>
                    {r.status !== "done" && online && (
                      <Button asChild variant="outline" size="sm">
                        <Link to="/violao/$id" params={{ id: r.songId }}>Tentar de novo</Link>
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Remover vídeo de ${r.snapshot.title}`} onClick={() => void removeOfflineVideo({ id: r.songId })}>
                      <Trash2 className="size-4" />
                    </Button>
                  </li>
                ))
              )}
            </ul>
            <p className="mt-4 text-[11px] text-muted-foreground">Remover um vídeo não apaga a música nem a cifra. No iPhone, adicione o Life Hub à Tela de Início para o sistema não apagar os vídeos sozinho.</p>
          </>
        )}
      </div>
    </div>
  );
}
