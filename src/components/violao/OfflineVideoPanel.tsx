import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, FileVideo, Link2, Play, RotateCcw, Trash2, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { db, currentUserId } from "@/lib/db";
import { resolveChord, songChords, youtubeId, type Song } from "@/lib/guitar";
import type { Voicing } from "@/lib/chords";
import {
  deleteOffline,
  deviceId,
  deviceLabel,
  fetchVideo,
  formatBytes,
  getOffline,
  isVideoType,
  onOfflineChange,
  putOffline,
  requestPersistence,
  warmOfflineShell,
  type OfflineRecord,
  type OfflineSnapshot,
} from "@/lib/offline-videos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bar } from "@/components/ui-kit";
import { useCustomChords } from "./ChordPicker";

export function useOnline() {
  const [on, setOn] = useState(true);
  useEffect(() => {
    setOn(navigator.onLine);
    const a = () => setOn(true), b = () => setOn(false);
    window.addEventListener("online", a);
    window.addEventListener("offline", b);
    return () => {
      window.removeEventListener("online", a);
      window.removeEventListener("offline", b);
    };
  }, []);
  return on;
}

export function useOfflineRecord(songId: string) {
  const [rec, setRec] = useState<OfflineRecord | null | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    const load = () => getOffline(songId).then((r) => alive && setRec(r ?? null)).catch(() => alive && setRec(null));
    load();
    const off = onOfflineChange(load);
    return () => {
      alive = false;
      off();
    };
  }, [songId]);
  return rec;
}

/** Plays a stored Blob; revokes the object URL on unmount. */
export function LocalVideo({ blob }: { blob: Blob }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  if (failed)
    return <p className="surface px-4 py-6 text-center text-sm text-destructive">Este aparelho não conseguiu reproduzir o arquivo salvo. Tente importar em MP4.</p>;
  return url ? (
    <video src={url} controls playsInline preload="metadata" onError={() => setFailed(true)} className="aspect-video w-full rounded-xl bg-foreground/90" />
  ) : null;
}

function buildSnapshot(song: Song, custom: Voicing[]): OfflineSnapshot {
  const refs = song.chord_mode === "parts" ? (song.sections ?? []).flatMap((s) => s.chords) : (song.chords ?? []);
  const voicings: Record<string, Voicing | null> = {};
  for (const r of [...new Set([...refs, ...songChords(song)])]) voicings[r] = resolveChord(r, custom);
  return {
    id: song.id,
    title: song.title,
    artist: song.artist,
    song_key: song.song_key,
    chord_mode: song.chord_mode,
    chords: song.chords ?? [],
    sections: song.sections ?? [],
    lyrics: song.lyrics,
    notes: song.notes,
    video_url: song.video_url,
    voicings,
  };
}

async function syncMeta(song: Song, values: Record<string, unknown>) {
  try {
    const user_id = await currentUserId();
    await db.from("guitar_offline_videos").upsert(
      {
        user_id,
        song_id: song.id,
        device_id: deviceId(),
        device_label: deviceLabel(),
        original_url: song.video_url,
        local_key: song.id,
        ...values,
      },
      { onConflict: "user_id,song_id,device_id" },
    );
  } catch {
    /* metadata is best effort; the local file is what matters */
  }
}

export async function removeOfflineVideo(song: Pick<Song, "id">) {
  await deleteOffline(song.id);
  try {
    await db.from("guitar_offline_videos").delete().eq("song_id", song.id).eq("device_id", deviceId());
  } catch {
    /* ignore */
  }
}

export function OfflineVideoPanel({ song }: { song: Song }) {
  const rec = useOfflineRecord(song.id);
  const online = useOnline();
  const custom = useCustomChords();
  const [progress, setProgress] = useState<number | null | undefined>(undefined); // undefined = idle
  const [showUrl, setShowUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [showYt, setShowYt] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const yt = youtubeId(song.video_url);
  const busy = progress !== undefined;

  async function store(blob: Blob, source: "import" | "url", meta: { sourceUrl?: string; fileName?: string }) {
    const snapshot = buildSnapshot(song, custom);
    await putOffline({
      songId: song.id,
      status: "done",
      blob,
      type: blob.type,
      size: blob.size,
      savedAt: new Date().toISOString(),
      source,
      sourceUrl: meta.sourceUrl ?? null,
      fileName: meta.fileName ?? null,
      snapshot,
    });
    // read back to be sure the file really persisted
    const check = await getOffline(song.id);
    if (!check?.blob || check.blob.size !== blob.size) throw new Error("O aparelho não conseguiu guardar o vídeo inteiro.");
    await syncMeta(song, { status: "done", source, size_bytes: blob.size, completed_at: new Date().toISOString(), error: null });
    void requestPersistence();
    void warmOfflineShell();
    toast.success("Vídeo disponível offline neste aparelho");
  }

  async function fail(e: unknown, source: "import" | "url", sourceUrl?: string) {
    const msg = e instanceof Error ? e.message : "Não foi possível salvar o vídeo.";
    await putOffline({ songId: song.id, status: "failed", source, sourceUrl: sourceUrl ?? null, error: msg, snapshot: buildSnapshot(song, custom) }).catch(() => {});
    await syncMeta(song, { status: "failed", source, error: msg });
    toast.error(msg);
  }

  async function importFile(file: File) {
    if (!isVideoType(file.type) && !/\.(mp4|mov|m4v|webm)$/i.test(file.name)) {
      toast.error("Escolha um arquivo de vídeo (MP4, MOV ou WEBM).");
      return;
    }
    setProgress(null);
    await syncMeta(song, { status: "downloading", source: "import", error: null });
    try {
      // Read in chunks so the progress bar reflects real work on large files
      const parts: BlobPart[] = [];
      const step = 8 * 1024 * 1024;
      for (let i = 0; i < file.size; i += step) {
        parts.push(await file.slice(i, i + step).arrayBuffer());
        setProgress(Math.min(1, (i + step) / file.size) * 0.9);
      }
      const blob = new Blob(parts, { type: file.type || "video/mp4" });
      await store(blob, "import", { fileName: file.name });
      setProgress(1);
    } catch (e) {
      await fail(e, "import");
    } finally {
      setProgress(undefined);
    }
  }

  async function downloadUrl(u: string) {
    if (youtubeId(u)) {
      toast.error("O YouTube não permite baixar vídeos por outros apps. Use “Importar arquivo”.");
      return;
    }
    setProgress(null);
    await syncMeta(song, { status: "downloading", source: "url", error: null });
    try {
      const blob = await fetchVideo(u, (p) => setProgress(p));
      await store(blob, "url", { sourceUrl: u });
      setShowUrl(false);
      setUrl("");
    } catch (e) {
      await fail(e, "url", u);
    } finally {
      setProgress(undefined);
    }
  }

  const hasLocal = rec?.status === "done" && rec.blob;

  return (
    <section className="mb-8 space-y-3">
      {/* Player */}
      {hasLocal ? (
        <LocalVideo blob={rec.blob!} />
      ) : yt && online ? (
        showYt ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&playsinline=1`}
            title={`Videoaula de ${song.title}`}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            className="aspect-video w-full rounded-xl border-0"
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowYt(true)}
            className="relative block aspect-video w-full overflow-hidden rounded-xl"
            aria-label="Assistir videoaula online"
          >
            <img src={`https://i.ytimg.com/vi/${yt}/hqdefault.jpg`} alt="" className="size-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/30">
              <span className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Play className="size-6 fill-current" />
              </span>
            </span>
          </button>
        )
      ) : song.video_url && !online ? (
        <p className="surface flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
          <WifiOff className="size-4 shrink-0" /> Sem internet e este vídeo não está salvo offline neste aparelho.
        </p>
      ) : null}

      {/* Status + actions */}
      <div className="surface space-y-3 px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 text-sm">
            {hasLocal ? (
              <>
                <CheckCircle2 className="size-4 shrink-0 text-primary" />
                <span className="truncate">Offline neste aparelho · {formatBytes(rec.size)}</span>
              </>
            ) : rec?.status === "failed" ? (
              <span className="truncate text-destructive">Falhou: {rec.error}</span>
            ) : (
              <>
                <Download className="size-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-muted-foreground">Vídeo offline não salvo</span>
              </>
            )}
          </p>
          {hasLocal && (
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive"
              onClick={async () => {
                await removeOfflineVideo(song);
                toast.success("Vídeo removido do aparelho. A música e a cifra continuam.");
              }}
            >
              <Trash2 className="size-4" /> Remover
            </Button>
          )}
        </div>

        {busy && (
          <div className="space-y-1">
            <Bar value={(progress ?? 0) * 100} />
            <p className="text-xs text-muted-foreground">
              {progress == null ? "Salvando…" : `Salvando… ${Math.round(progress * 100)}%`}
            </p>
          </div>
        )}

        {!busy && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <FileVideo className="size-4" /> {hasLocal ? "Substituir arquivo" : "Importar arquivo"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowUrl((v) => !v)}>
              <Link2 className="size-4" /> Baixar de link direto
            </Button>
            {rec?.status === "failed" && rec.source === "url" && rec.sourceUrl && (
              <Button variant="outline" size="sm" onClick={() => downloadUrl(rec.sourceUrl!)}>
                <RotateCcw className="size-4" /> Tentar de novo
              </Button>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*,.mp4,.mov,.m4v,.webm"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void importFile(f);
          }}
        />
        {showUrl && !busy && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (url.trim()) void downloadUrl(url.trim());
            }}
          >
            <Input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/aula.mp4" className="h-9" />
            <Button type="submit" size="sm">Baixar</Button>
          </form>
        )}
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          O YouTube não permite baixar vídeos por outros apps. Para assistir sem internet, importe um arquivo seu (da galeria ou de Arquivos) ou use um link direto de vídeo que permita download. O arquivo fica só neste aparelho.
        </p>
      </div>
    </section>
  );
}
