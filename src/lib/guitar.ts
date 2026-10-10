import { canonicalName, findVoicings, type Voicing } from "@/lib/chords";

export type SongSection = { id: string; name: string; chords: string[]; text?: string };

export type Song = {
  id: string;
  title: string;
  artist: string | null;
  song_key: string | null;
  difficulty: "facil" | "intermediario" | "avancado" | null;
  notes: string | null;
  video_url: string | null;
  lyrics: string | null;
  favorite: boolean;
  sections: SongSection[];
  created_at: string;
};

export type CustomChordRow = { id: string; name: string; frets: string; fingers: string | null };

export const DIFFICULTY_LABEL = { facil: "Fácil", intermediario: "Intermediário", avancado: "Avançado" } as const;

export const SECTION_PRESETS = ["Introdução", "Verso", "Pré-refrão", "Refrão", "Ponte", "Solo", "Final"];

/** Accepts youtube.com/watch, youtu.be, shorts, live, embed and music.youtube links. */
export function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\.|^music\./, "");
    if (host === "youtu.be") return valid(u.pathname.slice(1).split("/")[0]);
    if (host !== "youtube.com" && host !== "youtube-nocookie.com") return null;
    if (u.pathname === "/watch") return valid(u.searchParams.get("v"));
    const m = /^\/(shorts|embed|live|v)\/([^/?]+)/.exec(u.pathname);
    return m ? valid(m[2]) : null;
  } catch {
    return null;
  }
}
const valid = (id: string | null | undefined) => (id && /^[\w-]{11}$/.test(id) ? id : null);

export function isYoutubeUrl(url: string) {
  return youtubeId(url) !== null;
}

/** Unique chords in song order (first appearance), canonicalised. */
export function songChords(sections: SongSection[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of sections)
    for (const c of s.chords) {
      const k = canonicalName(c);
      if (!seen.has(k)) {
        seen.add(k);
        out.push(c);
      }
    }
  return out;
}

export function voicingFor(name: string, custom: Voicing[] = []): Voicing | null {
  return findVoicings(name, custom)[0] ?? null;
}

export function filterSongs(songs: Song[], query: string, onlyFav: boolean) {
  const q = query.trim().toLowerCase();
  return songs.filter(
    (s) =>
      (!onlyFav || s.favorite) &&
      (!q || s.title.toLowerCase().includes(q) || (s.artist ?? "").toLowerCase().includes(q)),
  );
}

export const newSectionId = () => Math.random().toString(36).slice(2, 10);
