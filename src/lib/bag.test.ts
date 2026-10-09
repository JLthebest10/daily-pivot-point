import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db", () => ({ db: {}, currentUserId: async () => "u" }));
import { bagProgress, groupLists, templatesForNewList, type BagItem, type BagList } from "./bag";

const item = (o: Partial<BagItem>): BagItem => ({
  id: "x", name: "x", category: null, icon: null, is_fixed: true, active: true, order_index: 0, ...o,
});

describe("bag", () => {
  it("counts 6 of 9 with 3 left", () => {
    const items = Array.from({ length: 9 }, (_, i) => ({ checked: i < 6 }));
    expect(bagProgress(items)).toMatchObject({ done: 6, total: 9, left: 3, ready: false });
  });
  it("is ready only when every item is checked", () => {
    expect(bagProgress([{ checked: true }]).ready).toBe(true);
    expect(bagProgress([]).ready).toBe(false);
  });
  it("copies only fixed and active items into a new list", () => {
    const out = templatesForNewList([
      item({ id: "a", name: "Carteira" }),
      item({ id: "b", name: "Off", active: false }),
      item({ id: "c", name: "Pontual", is_fixed: false }),
    ]);
    expect(out.map((o) => o.name)).toEqual(["Carteira"]);
  });
  it("keeps several lists on the same date and picks the next unfinished one", () => {
    const l = (id: string, date: string): BagList => ({ id, title: id, date, note: null, created_at: id });
    const g = groupLists([l("a", "2026-10-10"), l("b", "2026-10-10"), l("p", "2026-10-01")], "2026-10-09", "2026-10-16", (id) => id === "a");
    expect(g.upcoming.map((x) => x.id)).toEqual(["a", "b"]);
    expect(g.next?.id).toBe("b");
    expect(g.past.map((x) => x.id)).toEqual(["p"]);
  });
});
