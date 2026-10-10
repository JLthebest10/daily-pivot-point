import { CATEGORIES, canonicalName, customToVoicing, findVoicings, parseChordName, type CategoryKey, type Fret, type Voicing } from "@/lib/chords";

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
  chord_mode: "full" | "parts";
  chords: string[]; // full-song sequence of chord refs
  created_at: string;
};

export type StringState = "open" | "muted" | "pressed";
export type FingerPos = { string: number; fret: number; finger: number }; // string 0 = 6th (low E)

export type CustomChordRow = {
  id: string;
  name: string;
  frets: string;
  fingers: string | null;
  category: string | null;
  note: string | null;
  strings: StringState[] | null;
  positions: FingerPos[] | null;
  base_fret: number | null;
};

/** Chord refs stored in songs: plain names for library chords, "custom:<id>" for user chords. */
export const CUSTOM_PREFIX = "custom:";
export const customRef = (id: string) => CUSTOM_PREFIX + id;
export const customIdOf = (ref: string) => (ref.startsWith(CUSTOM_PREFIX) ? ref.slice(CUSTOM_PREFIX.length) : null);

/** Exact rebuild of a user-drawn chord: fingers are never re-assigned. */
export function voicingFromEditor(
  name: string,
  strings: StringState[],
  positions: FingerPos[],
  baseFret: number | null,
): Voicing {
  const frets: Fret[] = strings.map((st, i) =>
    st === "muted" ? null : st === "open" ? 0 : (positions.find((p) => p.string === i)?.fret ?? 0),
  );
  const fingers = strings.map((st, i) => (st === "pressed" ? (positions.find((p) => p.string === i)?.finger ?? null) : null));
  const pressed = frets.filter((f): f is number => f != null && f > 0);
  const auto = !pressed.length ? 1 : Math.max(...pressed) <= 5 ? 1 : Math.min(...pressed);
  const ones = positions.filter((p) => p.finger === 1 && strings[p.string] === "pressed");
  const barre =
    ones.length >= 2 && ones.every((o) => o.fret === ones[0]!.fret)
      ? { fret: ones[0]!.fret, from: Math.min(...ones.map((o) => o.string)), to: Math.max(...ones.map((o) => o.string)) }
      : null;
  const parsed = parseChordName(name);
  return {
    name,
    root: parsed?.root ?? name,
    suffix: parsed?.suffix ?? "",
    category: "outros",
    frets,
    fingers,
    baseFret: baseFret && baseFret > 0 ? baseFret : auto,
    barre,
    custom: true,
  };
}

export function rowToVoicing(row: CustomChordRow): Voicing | null {
  let v: Voicing | null;
  if (row.strings && row.positions) v = voicingFromEditor(row.name, row.strings, row.positions, row.base_fret);
  else v = customToVoicing(row);
  if (!v) return null;
  const cat = CATEGORIES.find((c) => c.key === row.category)?.key as CategoryKey | undefined;
  return { ...v, id: row.id, note: row.note, category: cat ?? v.category, custom: true };
}

/** Resolve a stored chord ref to a drawable voicing. */
export function resolveChord(ref: string, custom: Voicing[]): Voicing | null {
  const id = customIdOf(ref);
  if (id) return custom.find((v) => v.id === id) ?? null;
  return voicingFor(ref, custom.filter((v) => !v.id));
}

export function chordLabel(ref: string, custom: Voicing[]): string {
  const id = customIdOf(ref);
  if (!id) return ref;
  return custom.find((v) => v.id === id)?.name ?? "Acorde removido";
}

/** Songs that reference a custom chord (used to guard deletion). */
export function songsUsingChord(songs: Song[], id: string): Song[] {
  const ref = customRef(id);
  return songs.filter((s) => (s.chords ?? []).includes(ref) || (s.sections ?? []).some((x) => x.chords.includes(ref)));
}

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
export function songChords(song: Pick<Song, "sections" | "chords" | "chord_mode">): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const all = song.chord_mode === "parts" ? (song.sections ?? []).flatMap((s) => s.chords) : (song.chords ?? []);
  for (const c of all) {
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
