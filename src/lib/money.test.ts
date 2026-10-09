import { describe, expect, it } from "vitest";
import { daysUntil, goalProgress, parseMoney } from "./money";

describe("parseMoney", () => {
  it("parses typed values without leading zeros", () => {
    expect(parseMoney("5000")).toBe(5000);
    expect(parseMoney("0")).toBe(0);
    expect(parseMoney("0,50")).toBe(0.5);
    expect(parseMoney("5.000")).toBe(5000);
    expect(parseMoney("R$ 1.234,56")).toBe(1234.56);
  });
  it("returns null for empty or invalid input", () => {
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});

describe("goalProgress", () => {
  it("Tênis novo: 200 de 800 = 25%, falta 600", () => {
    expect(goalProgress(200, 800)).toMatchObject({ pct: 25, remaining: 600 });
  });
  it("caps at 100% and reports excess", () => {
    expect(goalProgress(900, 800)).toMatchObject({ pct: 100, remaining: 0, excess: 100 });
  });
  it("no division by zero", () => {
    expect(goalProgress(0, 0).pct).toBe(0);
  });
});

describe("daysUntil", () => {
  it("counts days to the planned date", () => {
    expect(daysUntil("2026-12-18", new Date(2026, 11, 8))).toBe(10);
    expect(daysUntil("2026-12-01", new Date(2026, 11, 8))).toBe(-7);
  });
});
