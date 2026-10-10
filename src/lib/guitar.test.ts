import { describe, expect, it } from "vitest";
import { customRef, resolveChord, songChords, songsUsingChord, voicingFromEditor, type Song } from "./guitar";

const song = (p: Partial<Song>): Song => ({
  id: "s", title: "t", artist: null, song_key: null, difficulty: null, notes: null, video_url: null,
  lyrics: null, favorite: false, sections: [], chord_mode: "full", chords: [], created_at: "", ...p,
});

describe("guitar", () => {
  it("keeps the exact fingers the user drew", () => {
    const v = voicingFromEditor("F fácil", ["muted", "muted", "pressed", "pressed", "pressed", "pressed"], [
      { string: 2, fret: 3, finger: 3 }, { string: 3, fret: 2, finger: 2 }, { string: 4, fret: 1, finger: 1 }, { string: 5, fret: 1, finger: 1 },
    ], 1);
    expect(v.frets).toEqual([null, null, 3, 2, 1, 1]);
    expect(v.fingers).toEqual([null, null, 3, 2, 1, 1]);
    expect(v.barre).toEqual({ fret: 1, from: 4, to: 5 });
  });
  it("full mode keeps duplicates in the sequence but tags list unique", () => {
    const s = song({ chords: ["G", "D", "G", "C"] });
    expect(songChords(s)).toEqual(["G", "D", "C"]);
  });
  it("resolves custom chord refs by id", () => {
    const v = { ...voicingFromEditor("Meu", ["open", "open", "open", "open", "open", "open"], [], 1), id: "abc" };
    expect(resolveChord(customRef("abc"), [v])?.name).toBe("Meu");
    expect(resolveChord("Am", [])?.name).toBe("Am");
  });
  it("finds songs that use a custom chord in either mode", () => {
    const a = song({ id: "a", chords: [customRef("x")] });
    const b = song({ id: "b", chord_mode: "parts", sections: [{ id: "1", name: "V", chords: [customRef("x")] }] });
    const c = song({ id: "c", chords: ["G"] });
    expect(songsUsingChord([a, b, c], "x").map((s) => s.id)).toEqual(["a", "b"]);
  });
});
