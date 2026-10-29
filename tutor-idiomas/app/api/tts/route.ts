import { limits } from "@/lib/env";
import { fail, handleError } from "@/lib/http";
import { assertWithinLimits, recordUsage } from "@/lib/limits";
import { speak } from "@/lib/openai";
import { ttsInstructions } from "@/lib/tutor";
import { isCountry, isLanguage } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { text?: unknown; language?: unknown; country?: unknown; slow?: unknown };
    const text = typeof body.text === "string" ? body.text.trim().slice(0, limits.maxTtsChars) : "";
    if (!text || !isLanguage(body.language)) return fail("Texto ou idioma inválido.");
    const country = isCountry(body.country) ? body.country : null;

    await assertWithinLimits("tts", text.length);
    const audio = await speak(text, ttsInstructions(body.language, country, body.slow === true));
    await recordUsage(0, text.length, 0);
    return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
  } catch (err) {
    return handleError(err);
  }
}
