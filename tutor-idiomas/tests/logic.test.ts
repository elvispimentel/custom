import { beforeAll, describe, expect, it } from "vitest";
import { createSessionToken, passwordMatches, verifySessionToken } from "@/lib/auth";
import { dueReminders, sanitizeReminders } from "@/lib/reminders";
import { localParts, startOfLocalDay } from "@/lib/time";
import { mergeProfile, type SummaryResult } from "@/lib/tutor";
import type { Profile, Reminder } from "@/lib/types";

beforeAll(() => {
  process.env.APP_PASSWORD = "senha-de-teste";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "x";
});

describe("auth", () => {
  it("aceita token válido e recusa adulterado ou expirado", async () => {
    const token = await createSessionToken();
    expect(await verifySessionToken(token)).toBe(true);
    expect(await verifySessionToken(token.replace(/.$/, (c) => (c === "0" ? "1" : "0")))).toBe(false);
    expect(await verifySessionToken(`${Date.now() + 1e9}.abcd`)).toBe(false);
    const old = await createSessionToken(Date.now() - 1000 * 24 * 3600 * 1000);
    expect(await verifySessionToken(old)).toBe(false);
    expect(await verifySessionToken(undefined)).toBe(false);
  });

  it("trocar a senha invalida tokens antigos", async () => {
    const token = await createSessionToken();
    process.env.APP_PASSWORD = "outra";
    expect(await verifySessionToken(token)).toBe(false);
    process.env.APP_PASSWORD = "senha-de-teste";
  });

  it("compara senha", async () => {
    expect(await passwordMatches("senha-de-teste")).toBe(true);
    expect(await passwordMatches("senha-de-test")).toBe(false);
    expect(await passwordMatches("")).toBe(false);
  });
});

describe("fuso e lembretes", () => {
  const reminders: Reminder[] = [
    { slot: "manha", hour: 8, language: "es", enabled: true },
    { slot: "tarde", hour: 14, language: "en", enabled: false },
    { slot: "noite", hour: 20, language: "es", enabled: true },
  ];

  it("converte UTC para a hora local de São Paulo e Buenos Aires", () => {
    const d = new Date("2026-10-29T11:20:00Z");
    expect(localParts(d, "America/Sao_Paulo")).toEqual({ date: "2026-10-29", hour: 8 });
    expect(localParts(d, "America/Argentina/Buenos_Aires")).toEqual({ date: "2026-10-29", hour: 8 });
    expect(localParts(d, "Europe/Madrid")).toEqual({ date: "2026-10-29", hour: 12 });
  });

  it("vira o dia corretamente", () => {
    expect(localParts(new Date("2026-10-30T02:30:00Z"), "America/Sao_Paulo")).toEqual({ date: "2026-10-29", hour: 23 });
  });

  it("início do dia local", () => {
    expect(startOfLocalDay(new Date("2026-10-29T15:00:00Z"), "America/Sao_Paulo").toISOString()).toBe("2026-10-29T03:00:00.000Z");
    // Madri em horário de verão (UTC+2) até 25/10/2026, depois UTC+1.
    expect(startOfLocalDay(new Date("2026-07-01T12:00:00Z"), "Europe/Madrid").toISOString()).toBe("2026-06-30T22:00:00.000Z");
  });

  it("lembrete devido na hora certa e com até 1h de atraso, nunca antes", () => {
    expect(dueReminders(reminders, 7).map((r) => r.slot)).toEqual([]);
    expect(dueReminders(reminders, 8).map((r) => r.slot)).toEqual(["manha"]);
    expect(dueReminders(reminders, 9).map((r) => r.slot)).toEqual(["manha"]);
    expect(dueReminders(reminders, 10).map((r) => r.slot)).toEqual([]);
    expect(dueReminders(reminders, 14).map((r) => r.slot)).toEqual([]); // desativado
    expect(dueReminders(reminders, 20).map((r) => r.slot)).toEqual(["noite"]);
  });

  it("valida lembretes recebidos", () => {
    expect(sanitizeReminders(reminders)).toHaveLength(3);
    expect(sanitizeReminders([{ slot: "a", hour: 25, language: "es" }])).toBeNull();
    expect(sanitizeReminders([{ slot: "a", hour: 8, language: "fr" }])).toBeNull();
    expect(sanitizeReminders([{ slot: "a", hour: 8, language: "es" }, { slot: "a", hour: 9, language: "en" }])).toBeNull();
    expect(sanitizeReminders("x")).toBeNull();
  });
});

describe("memória do idioma", () => {
  const profile: Profile = {
    language: "es",
    level_estimate: "A2 (estimativa)",
    notes: "",
    difficulties: [
      { item: "ser vs. estar", count: 2, last: "2026-10-01" },
      { item: "artigos", count: 1, last: "2026-10-01" },
    ],
    vocabulary: [{ term: "alquiler", meaning_pt: "aluguel", last: "2026-10-01" }],
  };
  const summary: SummaryResult = {
    resumo: "r",
    praticado: [],
    melhorar: [],
    retomar: [],
    nivel_estimado: "A2–B1 (estimativa)",
    dificuldades: ["Ser vs. estar", "pretérito indefinido"],
    superadas: ["artigos"],
    vocabulario: [{ term: "inmobiliaria", meaning_pt: "imobiliária" }],
    notas: "Prefere exemplos de engenharia.",
  };

  it("soma dificuldades recorrentes, remove superadas e guarda vocabulário", () => {
    const merged = mergeProfile(profile, summary, "2026-10-29");
    expect(merged.difficulties).toEqual([
      { item: "ser vs. estar", count: 3, last: "2026-10-29" },
      { item: "pretérito indefinido", count: 1, last: "2026-10-29" },
    ]);
    expect(merged.vocabulary?.map((v) => v.term)).toEqual(["inmobiliaria", "alquiler"]);
    expect(merged.level_estimate).toBe("A2–B1 (estimativa)");
    expect(merged.notes).toBe("Prefere exemplos de engenharia.");
  });
});
