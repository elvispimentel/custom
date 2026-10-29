import { db, must } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";
import { sanitizeReminders } from "@/lib/reminders";
import { isValidTimeZone } from "@/lib/time";
import { isCountry } from "@/lib/types";

export async function PUT(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if ("timezone" in body) {
      if (typeof body.timezone !== "string" || !isValidTimeZone(body.timezone)) return fail("Fuso horário inválido.");
      patch.timezone = body.timezone;
    }
    if ("paused" in body) patch.paused = body.paused === true;
    if ("session_minutes" in body) {
      const m = Number(body.session_minutes);
      if (!Number.isInteger(m) || m < 5 || m > 60) return fail("Duração deve ficar entre 5 e 60 minutos.");
      patch.session_minutes = m;
    }
    if ("reminders" in body) {
      const reminders = sanitizeReminders(body.reminders);
      if (!reminders) return fail("Lembretes inválidos.");
      patch.reminders = reminders;
    }
    if ("country" in body) {
      if (!isCountry(body.country)) return fail("País inválido.");
      patch.country = body.country;
    }

    const settings = must(
      await db().from("tutor_settings").update(patch).eq("id", 1).select("timezone,paused,session_minutes,reminders,country").single(),
    );
    return json({ settings });
  } catch (err) {
    return handleError(err);
  }
}
