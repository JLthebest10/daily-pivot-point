/**
 * Offline video storage for the Violão module.
 * Video files live in this device's IndexedDB (persistent, survives restarts);
 * the backend only keeps metadata per device. YouTube itself is never downloaded.
 */
import type { Voicing } from "@/lib/chords";
import type { SongSection } from "@/lib/guitar";

const DB_NAME = "lifehub-offline";
const VERSION = 1;

export type OfflineSnapshot = {
  id: string;
  title: string;
  artist: string | null;
  song_key: string | null;
  chord_mode: "full" | "parts";
  chords: string[];
  sections: SongSection[];
  lyrics: string | null;
  notes: string | null;
  video_url: string | null;
  voicings: Record<string, Voicing | null>; // chord ref → resolved diagram
};

export type OfflineRecord = {
  songId: string;
  status: "done" | "failed" | "downloading";
  blob?: Blob;
  type?: string;
  size?: number;
  savedAt?: string;
  source: "import" | "url";
  sourceUrl?: string | null;
  fileName?: string | null;
  error?: string | null;
  snapshot: OfflineSnapshot;
};

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("Este navegador não permite guardar vídeos."));
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("videos")) db.createObjectStore("videos", { keyPath: "songId" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction("videos", mode);
    const r = fn(t.objectStore("videos"));
    t.oncomplete = () => resolve(r.result);
    t.onerror = () => reject(t.error ?? r.error);
    t.onabort = () => reject(t.error ?? new Error("Sem espaço no aparelho para guardar o vídeo."));
  });
}

export const getOffline = (songId: string) =>
  tx<OfflineRecord | undefined>("readonly", (s) => s.get(songId) as IDBRequest<OfflineRecord | undefined>);
export const putOffline = (rec: OfflineRecord) => tx("readwrite", (s) => s.put(rec)).then(() => notify());
export const deleteOffline = (songId: string) => tx("readwrite", (s) => s.delete(songId)).then(() => notify());
export const listOffline = () => tx<OfflineRecord[]>("readonly", (s) => s.getAll() as IDBRequest<OfflineRecord[]>);

/* change notifications so all screens refresh */
const listeners = new Set<() => void>();
export function onOfflineChange(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
function notify() {
  listeners.forEach((l) => l());
}

/** Ask the browser not to evict our data (best effort; iOS honours it for installed apps). */
export async function requestPersistence() {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageEstimate() {
  try {
    const e = await navigator.storage?.estimate?.();
    return e ? { usage: e.usage ?? 0, quota: e.quota ?? 0 } : null;
  } catch {
    return null;
  }
}

export function deviceId() {
  let id = localStorage.getItem("lifehub-device-id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("lifehub-device-id", id);
  }
  return id;
}

export function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  return "Navegador";
}

export function isVideoType(type: string) {
  return type.startsWith("video/");
}

/** Download a direct video file (e.g. .mp4 from a source that allows it) with real progress. */
export async function fetchVideo(url: string, onProgress: (p: number | null) => void, signal?: AbortSignal): Promise<Blob> {
  let res: Response;
  try {
    res = await fetch(url, { signal: signal ?? null, mode: "cors" });
  } catch {
    throw new Error("O site do vídeo não permite baixar por aqui. Baixe o arquivo e use “Importar arquivo”.");
  }
  if (!res.ok) throw new Error(`Não foi possível baixar (erro ${res.status}).`);
  const type = res.headers.get("content-type") ?? "";
  if (!isVideoType(type)) throw new Error("Esse link não é um arquivo de vídeo direto (.mp4, .mov, .webm).");
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body) return res.blob();
  const reader = res.body.getReader();
  const chunks: BlobPart[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value as BlobPart);
    got += value.length;
    onProgress(total ? got / total : null);
  }
  return new Blob(chunks, { type });
}

/** Copy the app pages needed to open the offline library without internet. */
export async function warmOfflineShell() {
  if (!("caches" in window) || !navigator.serviceWorker?.controller) return;
  try {
    const res = await fetch("/offline", { cache: "no-store" });
    const html = await res.text();
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map((m) => m[1]!);
    await Promise.all(assets.map((a) => fetch(a).catch(() => null)));
  } catch {
    /* offline right now; will warm next time */
  }
}

export function formatBytes(n: number | undefined | null) {
  if (!n) return "—";
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}
