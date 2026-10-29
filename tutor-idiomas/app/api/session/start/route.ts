import { db, must } from "@/lib/db";
import { closeStaleSessions, getProfile, getSettings, recentSummaries } from "@/lib/data";
import { fail, handleError, json } from "@/lib/http";
import { assertWithinLimits, recordUsage } from "@/lib/limits";
import { chatJSON } from "@/lib/openai";
import { openingInstruction, systemPrompt, turnSchema } from "@/lib/tutor";
import { isCountry, isLanguage, type TutorTurn } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { language?: unknown; country?: unknown };
    if (!isLanguage(body.language)) return fail("Idioma inválido.");
    const language = body.language;
    const country = language === "es" ? (isCountry(body.country) ? body.country : "AR") : null;

    await closeStaleSessions();
    await assertWithinLimits("llm");

    const [settings, profile, summaries] = await Promise.all([getSettings(), getProfile(language), recentSummaries(language)]);
    if (country && settings.country !== country) {
      await db().from("tutor_settings").update({ country, updated_at: new Date().toISOString() }).eq("id", 1);
    }

    const session = must(await db().from("tutor_sessions").insert({ language, country }).select("id").single()) as { id: string };

    const turn = await chatJSON<TutorTurn>(
      [
        {
          role: "system",
          content: systemPrompt({ language, country, profile, recentSummaries: summaries, elapsedMinutes: 0, targetMinutes: settings.session_minutes }),
        },
        { role: "user", content: openingInstruction(!profile.level_estimate) },
      ],
      "turno_tutor",
      turnSchema,
    );
    await recordUsage(0, 0, 1);

    must(
      await db().from("tutor_messages").insert({
        session_id: session.id,
        role: "assistant",
        content: turn.reply,
        meta: { translation_pt: turn.translation_pt },
      }),
    );

    return json({
      sessionId: session.id,
      language,
      country,
      targetMinutes: settings.session_minutes,
      placement: !profile.level_estimate,
      turn,
    });
  } catch (err) {
    return handleError(err);
  }
}
