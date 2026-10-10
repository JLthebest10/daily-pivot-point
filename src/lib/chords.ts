/**
 * Guitar chord library. Voicings come from two sources:
 *  1. Hand-written open-position shapes (with conventional fingering).
 *  2. Standard movable shapes (E-, A- and D-root forms) transposed to all 12 roots.
 * Every voicing is checked against the chord's real notes (`verifyVoicing`) and
 * dropped if any sounded note is outside the chord, the bass is wrong, or a
 * defining interval is missing — so nothing invented is ever shown.
 */

export const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
const FLATS: Record<string, string> = { "C#": "Db", "D#": "Eb", "F#": "Gb", "G#": "Ab", "A#": "Bb" };
const ALIASES: Record<string, string> = {
  DB: "C#", EB: "D#", GB: "F#", AB: "G#", BB: "A#", CB: "B", FB: "E", "E#": "F", "B#": "C",
};
/** Open-string pitch classes, string 6 (low E) → string 1 (high E). */
export const TUNING = [4, 9, 2, 7, 11, 4];

export type Fret = number | null; // null = muted string

export type Voicing = {
  name: string;
  root: string;
  suffix: string;
  category: CategoryKey;
  frets: Fret[]; // 6 entries, string 6 → string 1
  fingers: (number | null)[]; // 1 index … 4 pinky, null for open/muted
  baseFret: number; // first fret shown in the diagram
  barre: { fret: number; from: number; to: number } | null; // string indices 0..5
  custom?: boolean;
};

export type CategoryKey =
  | "maior" | "menor" | "7" | "maj7" | "m7" | "mmaj7" | "sus" | "dim" | "m7b5"
  | "aug" | "6" | "9" | "11_13" | "slash" | "outros";

export const CATEGORIES: { key: CategoryKey; label: string }[] = [
  { key: "maior", label: "Maiores" },
  { key: "menor", label: "Menores" },
  { key: "7", label: "Sétima dominante" },
  { key: "maj7", label: "Sétima maior" },
  { key: "m7", label: "Sétima menor" },
  { key: "mmaj7", label: "Menor c/ 7ª maior" },
  { key: "sus", label: "Suspensos" },
  { key: "dim", label: "Diminutos" },
  { key: "m7b5", label: "Meio-diminutos" },
  { key: "aug", label: "Aumentados" },
  { key: "6", label: "Com sexta" },
  { key: "9", label: "Com nona" },
  { key: "11_13", label: "11ª e 13ª" },
  { key: "slash", label: "Baixo alternativo" },
  { key: "outros", label: "Outros" },
];

type Quality = {
  suffix: string;
  category: CategoryKey;
  tones: number[]; // allowed intervals (mod 12)
  required: number[]; // intervals that must sound
};

export const QUALITIES: Quality[] = [
  { suffix: "", category: "maior", tones: [0, 4, 7], required: [0, 4] },
  { suffix: "m", category: "menor", tones: [0, 3, 7], required: [0, 3] },
  { suffix: "7", category: "7", tones: [0, 4, 7, 10], required: [0, 4, 10] },
  { suffix: "maj7", category: "maj7", tones: [0, 4, 7, 11], required: [0, 4, 11] },
  { suffix: "m7", category: "m7", tones: [0, 3, 7, 10], required: [0, 3, 10] },
  { suffix: "m(maj7)", category: "mmaj7", tones: [0, 3, 7, 11], required: [0, 3, 11] },
  { suffix: "sus2", category: "sus", tones: [0, 2, 7], required: [0, 2, 7] },
  { suffix: "sus4", category: "sus", tones: [0, 5, 7], required: [0, 5, 7] },
  { suffix: "7sus4", category: "sus", tones: [0, 5, 7, 10], required: [0, 5, 10] },
  { suffix: "dim", category: "dim", tones: [0, 3, 6], required: [0, 3, 6] },
  { suffix: "dim7", category: "dim", tones: [0, 3, 6, 9], required: [0, 3, 6, 9] },
  { suffix: "m7b5", category: "m7b5", tones: [0, 3, 6, 10], required: [0, 3, 6, 10] },
  { suffix: "aug", category: "aug", tones: [0, 4, 8], required: [0, 4, 8] },
  { suffix: "6", category: "6", tones: [0, 4, 7, 9], required: [0, 4, 9] },
  { suffix: "m6", category: "6", tones: [0, 3, 7, 9], required: [0, 3, 9] },
  { suffix: "9", category: "9", tones: [0, 4, 7, 10, 2], required: [0, 4, 10, 2] },
  { suffix: "maj9", category: "9", tones: [0, 4, 7, 11, 2], required: [0, 4, 11, 2] },
  { suffix: "m9", category: "9", tones: [0, 3, 7, 10, 2], required: [0, 3, 10, 2] },
  { suffix: "add9", category: "9", tones: [0, 4, 7, 2], required: [0, 4, 2] },
  { suffix: "m11", category: "11_13", tones: [0, 3, 7, 10, 2, 5], required: [0, 3, 10, 5] },
  { suffix: "11", category: "11_13", tones: [0, 4, 7, 10, 2, 5], required: [0, 10, 5] },
  { suffix: "13", category: "11_13", tones: [0, 4, 7, 10, 2, 9], required: [0, 4, 10, 9] },
  { suffix: "5", category: "outros", tones: [0, 7], required: [0, 7] },
];
const QMAP = new Map(QUALITIES.map((q) => [q.suffix, q]));

/* ------------------------------------------------------------------ */
/* Name parsing                                                        */
/* ------------------------------------------------------------------ */

const SUFFIX_ALIASES: Record<string, string> = {
  M: "", maj: "", min: "m", "-": "m", "7M": "maj7", M7: "maj7", "Δ": "maj7", "maj7": "maj7",
  "m7M": "m(maj7)", mM7: "m(maj7)", mmaj7: "m(maj7)", "m(7M)": "m(maj7)",
  "°": "dim", o: "dim", "º": "dim", "°7": "dim7", o7: "dim7", "º7": "dim7",
  "ø": "m7b5", "m7(b5)": "m7b5", "+": "aug", "5+": "aug", sus: "sus4", "4": "sus4",
  "7(4)": "7sus4", "74": "7sus4", "2": "sus2", "7M(9)": "maj9", "7(9)": "9", "m7(9)": "m9",
  "(9)": "add9", "9add": "add9", add2: "add9", "m7(11)": "m11", "7(13)": "13",
};

export function normalizeNote(n: string): string | null {
  if (!n) return null;
  const up = n[0]!.toUpperCase() + n.slice(1).replace("♯", "#").replace("♭", "b");
  if ((NOTES as readonly string[]).includes(up)) return up;
  return ALIASES[up.toUpperCase()] ?? null;
}

export function parseChordName(raw: string): { root: string; suffix: string; bass: string | null } | null {
  const s = raw.trim().replace(/\s+/g, "");
  const m = /^([A-Ga-g][#b♯♭]?)([^/]*)(?:\/([A-Ga-g][#b♯♭]?))?$/.exec(s);
  if (!m) return null;
  const root = normalizeNote(m[1]!);
  if (!root) return null;
  let suffix = m[2] ?? "";
  if (!QMAP.has(suffix)) suffix = SUFFIX_ALIASES[suffix] ?? suffix;
  if (!QMAP.has(suffix)) return null;
  const bass = m[3] ? normalizeNote(m[3]) : null;
  if (m[3] && !bass) return null;
  return { root, suffix, bass };
}

export function noteLabel(n: string) {
  return FLATS[n] ? `${n}/${FLATS[n]}` : n;
}

/* ------------------------------------------------------------------ */
/* Verification + fingering                                            */
/* ------------------------------------------------------------------ */

const pc = (n: string) => NOTES.indexOf(n as (typeof NOTES)[number]);

export function voicingNotes(frets: Fret[]): number[] {
  return frets.flatMap((f, i) => (f == null ? [] : [(TUNING[i]! + f) % 12]));
}

export function verifyVoicing(frets: Fret[], root: string, suffix: string, bass: string | null = null) {
  const q = QMAP.get(suffix);
  if (!q || frets.length !== 6) return false;
  const notes = voicingNotes(frets);
  if (notes.length < 3 && suffix !== "5") return false;
  const r = pc(root);
  const intervals = notes.map((n) => (n - r + 12) % 12);
  const bassPc = bass ? pc(bass) : r;
  if (notes[0] !== bassPc) return false;
  const bassInterval = (bassPc - r + 12) % 12;
  if (intervals.some((iv) => !q.tones.includes(iv) && !(bass && iv === bassInterval))) return false;
  return q.required.every((iv) => intervals.includes(iv));
}

/** Conventional finger assignment; returns null when the shape needs more than 4 fingers. */
export function assignFingers(frets: Fret[]) {
  const pressed = frets.map((f, i) => ({ f, i })).filter((x): x is { f: number; i: number } => x.f != null && x.f > 0);
  const fingers: (number | null)[] = frets.map(() => null);
  if (!pressed.length) return { fingers, barre: null };
  const min = Math.min(...pressed.map((p) => p.f));
  const max = Math.max(...pressed.map((p) => p.f));
  if (max - min > 3) return null;
  const atMin = pressed.filter((p) => p.f === min);
  let barre: Voicing["barre"] = null;
  let rest = pressed;
  let next = 1;
  if (atMin.length >= 2) {
    const from = atMin[0]!.i;
    const to = atMin[atMin.length - 1]!.i;
    const blocked = frets.slice(from, to + 1).some((f) => f === 0 || (f != null && f < min));
    if (!blocked && pressed.length > 4) {
      barre = { fret: min, from, to };
      for (const p of atMin) fingers[p.i] = 1;
      rest = pressed.filter((p) => p.f !== min);
      next = 2;
    }
  }
  const sorted = [...rest].sort((a, b) => a.f - b.f || a.i - b.i);
  if (sorted.length + next - 1 > 4) return null;
  for (const p of sorted) fingers[p.i] = next++;
  return { fingers, barre };
}

function baseFretFor(frets: Fret[]) {
  const pressed = frets.filter((f): f is number => f != null && f > 0);
  if (!pressed.length) return 1;
  return Math.max(...pressed) <= 4 ? 1 : Math.min(...pressed);
}

export function parseFrets(s: string): Fret[] | null {
  const t = s.trim().toLowerCase();
  const parts = t.includes(" ") || t.includes("-") || t.includes(",") ? t.split(/[\s,-]+/) : t.split("");
  if (parts.length !== 6) return null;
  const out: Fret[] = [];
  for (const p of parts) {
    if (p === "x") out.push(null);
    else if (/^\d+$/.test(p) && Number(p) <= 24) out.push(Number(p));
    else return null;
  }
  return out;
}

export function buildVoicing(
  name: string,
  frets: Fret[],
  explicitFingers?: (number | null)[] | null,
  opts: { category?: CategoryKey; custom?: boolean } = {},
): Voicing | null {
  const parsed = parseChordName(name);
  const auto = assignFingers(frets);
  if (!explicitFingers && !auto) return null;
  const fingers = explicitFingers ?? auto!.fingers;
  let barre = auto?.barre ?? null;
  if (explicitFingers) {
    // barre = finger 1 on 2+ strings at the same fret
    const ones = frets.map((f, i) => ({ f, i })).filter((x) => explicitFingers[x.i] === 1 && x.f);
    barre = ones.length >= 2 && ones.every((o) => o.f === ones[0]!.f)
      ? { fret: ones[0]!.f as number, from: ones[0]!.i, to: ones[ones.length - 1]!.i }
      : null;
  }
  return {
    name,
    root: parsed?.root ?? name,
    suffix: parsed?.suffix ?? "",
    category: opts.category ?? (parsed?.bass ? "slash" : (QMAP.get(parsed?.suffix ?? "")?.category ?? "outros")),
    frets,
    fingers,
    baseFret: baseFretFor(frets),
    barre,
    ...(opts.custom ? { custom: true } : {}),
  };
}

/* ------------------------------------------------------------------ */
/* Source data                                                         */
/* ------------------------------------------------------------------ */

const X = null;
/** Open shapes: [name, frets, fingers]. */
const OPEN: [string, Fret[], (number | null)[]][] = [
  ["C", [X, 3, 2, 0, 1, 0], [X, 3, 2, X, 1, X]],
  ["D", [X, X, 0, 2, 3, 2], [X, X, X, 1, 3, 2]],
  ["E", [0, 2, 2, 1, 0, 0], [X, 2, 3, 1, X, X]],
  ["G", [3, 2, 0, 0, 0, 3], [2, 1, X, X, X, 3]],
  ["G", [3, 2, 0, 0, 3, 3], [2, 1, X, X, 3, 4]],
  ["A", [X, 0, 2, 2, 2, 0], [X, X, 1, 2, 3, X]],
  ["Am", [X, 0, 2, 2, 1, 0], [X, X, 2, 3, 1, X]],
  ["Dm", [X, X, 0, 2, 3, 1], [X, X, X, 2, 3, 1]],
  ["Em", [0, 2, 2, 0, 0, 0], [X, 2, 3, X, X, X]],
  ["C7", [X, 3, 2, 3, 1, 0], [X, 3, 2, 4, 1, X]],
  ["D7", [X, X, 0, 2, 1, 2], [X, X, X, 2, 1, 3]],
  ["E7", [0, 2, 0, 1, 0, 0], [X, 2, X, 1, X, X]],
  ["G7", [3, 2, 0, 0, 0, 1], [3, 2, X, X, X, 1]],
  ["A7", [X, 0, 2, 0, 2, 0], [X, X, 2, X, 3, X]],
  ["B7", [X, 2, 1, 2, 0, 2], [X, 2, 1, 3, X, 4]],
  ["Cmaj7", [X, 3, 2, 0, 0, 0], [X, 3, 2, X, X, X]],
  ["Dmaj7", [X, X, 0, 2, 2, 2], [X, X, X, 1, 2, 3]],
  ["Emaj7", [0, 2, 1, 1, 0, 0], [X, 3, 1, 2, X, X]],
  ["Fmaj7", [X, X, 3, 2, 1, 0], [X, X, 3, 2, 1, X]],
  ["Gmaj7", [3, 2, 0, 0, 0, 2], [3, 2, X, X, X, 1]],
  ["Amaj7", [X, 0, 2, 1, 2, 0], [X, X, 2, 1, 3, X]],
  ["Am7", [X, 0, 2, 0, 1, 0], [X, X, 2, X, 1, X]],
  ["Dm7", [X, X, 0, 2, 1, 1], [X, X, X, 2, 1, 1]],
  ["Em7", [0, 2, 2, 0, 3, 0], [X, 1, 2, X, 3, X]],
  ["Em7", [0, 2, 0, 0, 0, 0], [X, 2, X, X, X, X]],
  ["Dsus2", [X, X, 0, 2, 3, 0], [X, X, X, 1, 3, X]],
  ["Asus2", [X, 0, 2, 2, 0, 0], [X, X, 1, 2, X, X]],
  ["Dsus4", [X, X, 0, 2, 3, 3], [X, X, X, 1, 2, 3]],
  ["Asus4", [X, 0, 2, 2, 3, 0], [X, X, 1, 2, 3, X]],
  ["Esus4", [0, 2, 2, 2, 0, 0], [X, 2, 3, 4, X, X]],
  ["Cadd9", [X, 3, 2, 0, 3, 0], [X, 2, 1, X, 3, X]],
  ["A6", [X, 0, 2, 2, 2, 2], [X, X, 1, 1, 1, 1]],
  ["Am6", [X, 0, 2, 2, 1, 2], [X, X, 2, 3, 1, 4]],
  ["E5", [0, 2, 2, X, X, X], [X, 1, 2, X, X, X]],
  ["A5", [X, 0, 2, 2, X, X], [X, X, 1, 2, X, X]],
  ["C/E", [0, 3, 2, 0, 1, 0], [X, 3, 2, X, 1, X]],
  ["C/G", [3, 3, 2, 0, 1, 0], [3, 4, 2, X, 1, X]],
  ["G/B", [X, 2, 0, 0, 0, 3], [X, 1, X, X, X, 3]],
  ["D/F#", [2, X, 0, 2, 3, 2], [1, X, X, 2, 4, 3]],
  ["Am/G", [3, 0, 2, 2, 1, 0], [4, X, 2, 3, 1, X]],
  ["F/C", [X, 3, 3, 2, 1, 1], [X, 3, 4, 2, 1, 1]],
  ["D/A", [X, 0, 0, 2, 3, 2], [X, X, X, 1, 3, 2]],
  ["Em/D", [X, X, 0, 0, 0, 0], [X, X, X, X, X, X]],
  ["A/C#", [X, 4, 2, 2, 2, X], [X, 4, 1, 1, 1, X]],
  ["E/G#", [4, 2, 2, 1, 0, 0], [4, 2, 3, 1, X, X]],
];

/** Movable shapes: offsets relative to the root fret on `rootString` (0 = 6th string). */
const MOVABLE: { suffix: string; rootString: number; shape: (number | null)[] }[] = [
  // E-root
  { suffix: "", rootString: 0, shape: [0, 2, 2, 1, 0, 0] },
  { suffix: "m", rootString: 0, shape: [0, 2, 2, 0, 0, 0] },
  { suffix: "7", rootString: 0, shape: [0, 2, 0, 1, 0, 0] },
  { suffix: "maj7", rootString: 0, shape: [0, X, 1, 1, 0, X] },
  { suffix: "m7", rootString: 0, shape: [0, 2, 0, 0, 0, 0] },
  { suffix: "m(maj7)", rootString: 0, shape: [0, 2, 1, 0, 0, 0] },
  { suffix: "sus4", rootString: 0, shape: [0, 2, 2, 2, 0, 0] },
  { suffix: "7sus4", rootString: 0, shape: [0, 2, 0, 2, 0, 0] },
  { suffix: "dim", rootString: 0, shape: [0, 1, 2, 0, X, X] },
  { suffix: "dim7", rootString: 0, shape: [0, X, -1, 0, -1, X] },
  { suffix: "m7b5", rootString: 0, shape: [0, X, 0, 0, -1, X] },
  { suffix: "aug", rootString: 0, shape: [0, X, 2, 1, 1, 0] },
  { suffix: "6", rootString: 0, shape: [0, X, -1, 1, 0, X] },
  { suffix: "m6", rootString: 0, shape: [0, X, -1, 0, 0, X] },
  { suffix: "9", rootString: 0, shape: [0, X, 0, 1, 0, 2] },
  { suffix: "m11", rootString: 0, shape: [0, 0, 0, 0, 0, 0] },
  { suffix: "11", rootString: 0, shape: [0, 0, 0, 1, 0, 0] },
  { suffix: "13", rootString: 0, shape: [0, X, 0, 1, 2, X] },
  { suffix: "5", rootString: 0, shape: [0, 2, 2, X, X, X] },
  // A-root
  { suffix: "", rootString: 1, shape: [X, 0, 2, 2, 2, 0] },
  { suffix: "m", rootString: 1, shape: [X, 0, 2, 2, 1, 0] },
  { suffix: "7", rootString: 1, shape: [X, 0, 2, 0, 2, 0] },
  { suffix: "maj7", rootString: 1, shape: [X, 0, 2, 1, 2, 0] },
  { suffix: "m7", rootString: 1, shape: [X, 0, 2, 0, 1, 0] },
  { suffix: "m(maj7)", rootString: 1, shape: [X, 0, 2, 1, 1, 0] },
  { suffix: "sus2", rootString: 1, shape: [X, 0, 2, 2, 0, 0] },
  { suffix: "sus4", rootString: 1, shape: [X, 0, 2, 2, 3, 0] },
  { suffix: "7sus4", rootString: 1, shape: [X, 0, 2, 0, 3, 0] },
  { suffix: "dim", rootString: 1, shape: [X, 0, 1, 2, 1, X] },
  { suffix: "dim7", rootString: 1, shape: [X, 0, 1, 2, 1, 2] },
  { suffix: "m7b5", rootString: 1, shape: [X, 0, 1, 0, 1, X] },
  { suffix: "aug", rootString: 1, shape: [X, 0, 3, 2, 2, 1] },
  { suffix: "6", rootString: 1, shape: [X, 0, 2, 2, 2, 2] },
  { suffix: "m6", rootString: 1, shape: [X, 0, X, -1, 1, 0] },
  { suffix: "9", rootString: 1, shape: [X, 0, -1, 0, 0, 0] },
  { suffix: "maj9", rootString: 1, shape: [X, 0, -1, 1, 0, X] },
  { suffix: "m9", rootString: 1, shape: [X, 0, -2, 0, 0, X] },
  { suffix: "13", rootString: 1, shape: [X, 0, -1, 0, 2, 2] },
  { suffix: "5", rootString: 1, shape: [X, 0, 2, 2, X, X] },
  // D-root
  { suffix: "", rootString: 2, shape: [X, X, 0, 2, 3, 2] },
  { suffix: "m", rootString: 2, shape: [X, X, 0, 2, 3, 1] },
  { suffix: "7", rootString: 2, shape: [X, X, 0, 2, 1, 2] },
  { suffix: "maj7", rootString: 2, shape: [X, X, 0, 2, 2, 2] },
  { suffix: "m7", rootString: 2, shape: [X, X, 0, 2, 1, 1] },
  { suffix: "sus2", rootString: 2, shape: [X, X, 0, 2, 3, 0] },
  { suffix: "sus4", rootString: 2, shape: [X, X, 0, 2, 3, 3] },
  { suffix: "dim7", rootString: 2, shape: [X, X, 0, 1, 0, 1] },
  { suffix: "aug", rootString: 2, shape: [X, X, 0, 3, 3, 2] },
  { suffix: "6", rootString: 2, shape: [X, X, 0, 2, 0, 2] },
  // C-shape (root on 5th string, ring finger)
  { suffix: "add9", rootString: 1, shape: [X, 0, -1, -3, 0, -3] },
];

function transpose(m: (typeof MOVABLE)[number], root: string): Fret[] | null {
  const base = (pc(root) - TUNING[m.rootString]! + 12) % 12;
  for (const r of [base, base + 12]) {
    const frets = m.shape.map((o) => (o == null ? null : o + r));
    const used = frets.filter((f): f is number => f != null);
    if (used.every((f) => f >= 0) && Math.max(...used) <= 15) return frets;
  }
  return null;
}

const key = (f: Fret[]) => f.map((x) => (x == null ? "x" : x)).join(",");

function buildLibrary(): Voicing[] {
  const out: Voicing[] = [];
  const seen = new Set<string>();
  const push = (v: Voicing | null) => {
    if (!v) return;
    const k = v.name + "|" + key(v.frets);
    if (seen.has(k)) return;
    seen.add(k);
    out.push(v);
  };
  for (const [name, frets, fingers] of OPEN) {
    const p = parseChordName(name)!;
    if (verifyVoicing(frets, p.root, p.suffix, p.bass)) push(buildVoicing(name, frets, fingers));
  }
  for (const root of NOTES) {
    for (const m of MOVABLE) {
      const frets = transpose(m, root);
      if (!frets || !verifyVoicing(frets, root, m.suffix)) continue;
      push(buildVoicing(root + m.suffix, frets));
    }
  }
  const rank = (v: Voicing) => Math.min(...v.frets.filter((f): f is number => f != null));
  return out.sort(
    (a, b) =>
      pc(a.root) - pc(b.root) ||
      QUALITIES.findIndex((q) => q.suffix === a.suffix) - QUALITIES.findIndex((q) => q.suffix === b.suffix) ||
      a.name.localeCompare(b.name) ||
      rank(a) - rank(b),
  );
}

export const CHORD_LIBRARY: Voicing[] = buildLibrary();

/** Canonical lookup key: "Bb7" and "A#7" match, "C7M" matches "Cmaj7". */
export function canonicalName(name: string) {
  const p = parseChordName(name);
  if (!p) return name.trim();
  return p.root + p.suffix + (p.bass ? "/" + p.bass : "");
}

export function findVoicings(name: string, extra: Voicing[] = []): Voicing[] {
  const c = canonicalName(name);
  return [...extra, ...CHORD_LIBRARY].filter((v) => canonicalName(v.name) === c);
}

export function searchChords(query: string, list: Voicing[]): Voicing[] {
  const q = query.trim();
  if (!q) return list;
  const c = canonicalName(q);
  const exact = list.filter((v) => canonicalName(v.name) === c);
  if (exact.length) return exact;
  const p = parseChordName(q.replace(/\/$/, ""));
  const lower = q.toLowerCase();
  return list.filter((v) =>
    p ? canonicalName(v.name).startsWith(c) : v.name.toLowerCase().startsWith(lower),
  );
}

export function customToVoicing(row: { name: string; frets: string; fingers: string | null }): Voicing | null {
  const frets = parseFrets(row.frets);
  if (!frets) return null;
  const fingers = row.fingers ? parseFrets(row.fingers) : null;
  return buildVoicing(row.name.trim(), frets, fingers ? fingers.map((f) => (f ? f : null)) : null, {
    custom: true,
  });
}
