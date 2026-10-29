import { db, must } from "@/lib/db";
import { getSettings } from "@/lib/data";
import { handleError, json } from "@/lib/http";
import { sendToAll } from "@/lib/push";
import { dueReminders } from "@/lib/reminders";
import { localParts } from "@/lib/time";

export const dynamic = "force-dynamic";

const COPY = {
  es: { title: "Hora do espanhol", body: "15 minutos de conversa. Toque para começar." },
  en: { title: "Hora do inglês", body: "15 minutos de conversa. Toque para começar." },
};

/**
 * Chamado pela Vercel 24 vezes por dia (uma por hora UTC). Envia os lembretes cuja hora local chegou.
 * A tabela tutor_reminder_log garante no máximo um envio por lembrete por dia.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return json({ error: "Não autorizado" }, 401);
  }
  try {
    const settings = await getSettings();
    if (settings.paused) return json({ skipped: "pausado" });

    const now = new Date();
    const { date, hour } = localParts(now, settings.timezone);
    const due = dueReminders(settings.reminders, hour);
    const results: Record<string, unknown> = {};

    for (const r of due) {
      // Já praticou esse idioma nos últimos 90 minutos? Não precisa lembrar.
      const recent = must(
        await db()
          .from("tutor_sessions")
          .select("id")
          .eq("language", r.language)
          .gte("last_activity_at", new Date(now.getTime() - 90 * 60000).toISOString())
          .gte("active_seconds", 120)
          .limit(1),
      ) as unknown[];

      const claim = await db()
        .from("tutor_reminder_log")
        .upsert({ slot: r.slot, local_date: date }, { onConflict: "slot,local_date", ignoreDuplicates: true })
        .select("slot");
      if (claim.error) throw new Error(claim.error.message);
      if (!claim.data?.length) {
        results[r.slot] = "já enviado hoje";
        continue;
      }
      if (recent.length) {
        results[r.slot] = "já praticou agora há pouco";
        continue;
      }
      const copy = COPY[r.language];
      results[r.slot] = await sendToAll({
        title: copy.title,
        body: copy.body,
        url: `/?idioma=${r.language}`,
        tag: `lembrete-${r.slot}`,
      });
    }
    return json({ localDate: date, localHour: hour, timezone: settings.timezone, results });
  } catch (err) {
    return handleError(err);
  }
}
