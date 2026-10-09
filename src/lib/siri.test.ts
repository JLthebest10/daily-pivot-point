import { describe, expect, it } from "vitest";
import { buildEvent, generateToken, hashToken } from "./siri";

describe("evento enviado pelo Atalho", () => {
  it("cria com nome, data e hora", () => {
    const r = buildEvent({ title: "Dentista", date: "2026-10-12", time: "14:30" });
    expect(r).toMatchObject({ ok: true, event: { title: "Dentista", date: "2026-10-12", start_time: "14:30" } });
  });

  it("ignora user_id enviado pelo Atalho", () => {
    const r = buildEvent({ title: "X", date: "2026-10-12", user_id: "outra-conta" });
    expect(r.ok && "user_id" in r.event).toBe(false);
  });

  it("aceita data brasileira e data/hora ISO do iPhone", () => {
    expect(buildEvent({ title: "A", date: "12/10/2026" })).toMatchObject({ event: { date: "2026-10-12" } });
    expect(buildEvent({ title: "A", date: "2026-10-12T09:05:00-03:00" })).toMatchObject({
      event: { date: "2026-10-12", start_time: "09:05" },
    });
  });

  it("recusa data inválida", () => {
    expect(buildEvent({ title: "A", date: "31/02/2026" }).ok).toBe(false);
  });

  it("recusa sem nome", () => {
    expect(buildEvent({ title: " ", date: "2026-10-12" }).ok).toBe(false);
  });
});

describe("chave", () => {
  it("hash é estável e diferente da chave", async () => {
    const t = generateToken();
    expect(t.startsWith("lh_")).toBe(true);
    expect(await hashToken(t)).toBe(await hashToken(t));
    expect(await hashToken(t)).not.toContain(t);
  });
});
