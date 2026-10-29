import type { Reminder } from "./types";
import { isLanguage } from "./types";

/**
 * Lembretes devidos na hora local atual. Aceita até 1 hora de atraso,
 * porque no plano Hobby o cron pode rodar em qualquer minuto da hora agendada.
 */
export function dueReminders(reminders: Reminder[], localHour: number): Reminder[] {
  return reminders.filter((r) => r.enabled && r.hour <= localHour && localHour - r.hour <= 1);
}

export function sanitizeReminders(input: unknown): Reminder[] | null {
  if (!Array.isArray(input) || input.length > 6) return null;
  const out: Reminder[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object") return null;
    const r = raw as Record<string, unknown>;
    const slot = typeof r.slot === "string" ? r.slot.trim().slice(0, 20) : "";
    const hour = Number(r.hour);
    if (!slot || seen.has(slot) || !Number.isInteger(hour) || hour < 0 || hour > 23 || !isLanguage(r.language)) {
      return null;
    }
    seen.add(slot);
    out.push({ slot, hour, language: r.language, enabled: r.enabled !== false });
  }
  return out;
}
