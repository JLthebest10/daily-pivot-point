import { describe, expect, it } from "vitest";
import { CHORD_LIBRARY, NOTES, findVoicings, parseChordName, searchChords, verifyVoicing } from "./chords";

describe("chord library", () => {
  it("every voicing sounds only real chord tones", () => {
    for (const v of CHORD_LIBRARY) {
      const p = parseChordName(v.name)!;
      expect(verifyVoicing(v.frets, p.root, p.suffix, p.bass), v.name + " " + v.frets.join()).toBe(true);
      expect(v.fingers.filter((f) => f != null).every((f) => f! >= 1 && f! <= 4)).toBe(true);
    }
  });
  it("covers majors, minors and 7ths for all 12 roots", () => {
    for (const n of NOTES) for (const s of ["", "m", "7", "maj7", "m7"]) {
      expect(findVoicings(n + s).length, n + s).toBeGreaterThan(0);
    }
  });
  it("standard open shapes are correct", () => {
    expect(findVoicings("C")[0].frets).toEqual([null, 3, 2, 0, 1, 0]);
    expect(findVoicings("F")[0].frets).toEqual([1, 3, 3, 2, 1, 1]);
    expect(findVoicings("F")[0].barre).toEqual({ fret: 1, from: 0, to: 5 });
    expect(findVoicings("Bm")[0].frets).toEqual([null, 2, 4, 4, 3, 2]);
  });
  it("rejects wrong notes", () => {
    expect(verifyVoicing([null, 3, 2, 0, 1, 0], "A", "m")).toBe(false);
  });
  it("search understands flats and aliases", () => {
    expect(searchChords("Bb", CHORD_LIBRARY).every((v) => v.root === "A#" && v.suffix === "")).toBe(true);
    expect(searchChords("C7M", CHORD_LIBRARY)[0].name).toBe("Cmaj7");
    expect(searchChords("C/E", CHORD_LIBRARY)[0].frets).toEqual([0, 3, 2, 0, 1, 0]);
  });
});
