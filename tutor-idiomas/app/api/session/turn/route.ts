import { db, must } from "@/lib/db";
import { getProfile, getSettings, recentSummaries, sessionMessages } from "@/lib/data";
import { limits } from "@/lib/env";
import { fail, handleError, json } from "@/lib/http";
import { assertWithinLimits, recordUsage } from "@/lib/limits";
import { chatJSON, transcribe, type ChatMessage } from "@/lib/openai";
import { systemPrompt, turnSchema } from "@/lib/tutor";
import type { Country, Language, TutorTurn } from "@/lib/types";

export const maxDuration = 60;

const AUDIO_TYPES: Record<string, string> = {
  "audio/webm": "webm",
  "audio/mp4": "mp4",
  "audio/x-m4a": "m4a",
  "audio/m4a": "m4a",
  "audio/aac": "m4a",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
};

const WRONG_TRANSCRIPT = "(Aviso do Elvis: a transcrição da minha última fala não corresponde ao que eu disse.)";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const sessionId = String(form.get("sessionId") ?? "");
    if (!/^[0-9a-f-]{36}$/.test(sessionId)) return fail("Sessão inválida.");

    const session = must(
      await db().from("tutor_sessions").select("id,language,country,status,active_seconds").eq("id", sessionId).maybeSingle(),
    ) as { id: string; language: Language; country: Country | null; status: string; active_seconds: number } | null;
    if (!session) return fail("Sessão não encontrada.", 404);
    if (session.status !== "open") return fail("Esta sessão já foi encerrada. Comece outra.", 409);

    const previous = await sessionMessages(sessionId, 30);
    let content: string;
    let via: "voz" | "texto";

    const audio = form.get("audio");
    if (form.get("kind") === "wrong_transcript") {
      content = WRONG_TRANSCRIPT;
      via = "texto";
    } else if (audio instanceof Blob && audio.size > 0) {
      if (audio.size > limits.maxAudioBytes) return fail("Áudio grande demais. Fale em trechos de até 2 minutos.", 413);
      const baseType = (audio.type || "").split(";")[0].trim().toLowerCase();
      const ext = AUDIO_TYPES[baseType];
      if (!ext) return fail(`Formato de áudio não suportado (${baseType || "desconhecido"}).`, 415);
      const seconds = Math.min(Math.max(Number(form.get("seconds")) || 1, 1), limits.maxAudioSeconds);
      await assertWithinLimits("stt", seconds);
      const lastTutor = [...previous].reverse().find((m) => m.role === "assistant")?.content ?? "";
      content = await transcribe(audio, `fala.${ext}`, session.language, lastTutor);
      await recordUsage(seconds, 0, 0);
      via = "voz";
      if (!content) return fail("Não consegui captar sua fala. Verifique o microfone e tente de novo.", 422);
    } else {
      content = String(form.get("text") ?? "").trim().slice(0, limits.maxTextChars);
      via = "texto";
      if (!content) return fail("Mensagem vazia.");
    }

    await assertWithinLimits("llm");
    must(await db().from("tutor_messages").insert({ session_id: sessionId, role: "user", content, meta: { via } }));

    const [settings, profile, summaries] = await Promise.all([
      getSettings(),
      getProfile(session.language),
      recentSummaries(session.language),
    ]);
    const history: ChatMessage[] = [...previous, { role: "user" as const, content, meta: { via } }].map((m) => ({
      role: m.role,
      content: m.role === "user" ? `[${m.meta?.via === "voz" ? "voz" : "texto"}] ${m.content}` : m.content,
    }));

    const turn = await chatJSON<TutorTurn>(
      [
        {
          role: "system",
          content: systemPrompt({
            language: session.language,
            country: session.country,
            profile,
            recentSummaries: summaries,
            elapsedMinutes: Math.round(session.active_seconds / 60),
            targetMinutes: settings.session_minutes,
          }),
        },
        ...history,
      ],
      "turno_tutor",
      turnSchema,
    );
    await recordUsage(0, 0, 1);

    must(
      await db().from("tutor_messages").insert({
        session_id: sessionId,
        role: "assistant",
        content: turn.reply,
        meta: { translation_pt: turn.translation_pt, correction: turn.correction, recognition_doubt: turn.recognition_doubt },
      }),
    );
    await db().from("tutor_sessions").update({ last_activity_at: new Date().toISOString() }).eq("id", sessionId);

    return json({ transcript: via === "voz" ? content : null, turn });
  } catch (err) {
    return handleError(err);
  }
}
