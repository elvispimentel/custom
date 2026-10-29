import { db, must } from "./db";
import { assertWithinLimits, recordUsage } from "./limits";
import { chatJSON } from "./openai";
import { localParts } from "./time";
import { mergeProfile, summaryPrompt, summarySchema, type SummaryResult } from "./tutor";
import type { Language, Profile, SessionSummary, Settings } from "./types";

export async function getSettings(): Promise<Settings> {
  return must(await db().from("tutor_settings").select("timezone,paused,session_minutes,reminders,country").eq("id", 1).single()) as Settings;
}

export async function getProfile(language: Language): Promise<Profile> {
  return must(await db().from("tutor_profiles").select("*").eq("language", language).single()) as Profile;
}

export async function recentSummaries(language: Language, limit = 3): Promise<SessionSummary[]> {
  const rows = must(
    await db()
      .from("tutor_sessions")
      .select("summary")
      .eq("language", language)
      .eq("status", "closed")
      .not("summary", "is", null)
      .order("started_at", { ascending: false })
      .limit(limit),
  ) as { summary: SessionSummary }[];
  return rows.map((r) => r.summary);
}

export type Message = { role: "user" | "assistant"; content: string; meta: Record<string, unknown> | null };

export async function sessionMessages(sessionId: string, limit = 40): Promise<Message[]> {
  const rows = must(
    await db()
      .from("tutor_messages")
      .select("role,content,meta")
      .eq("session_id", sessionId)
      .order("id", { ascending: false })
      .limit(limit),
  ) as Message[];
  return rows.reverse();
}

/**
 * Encerra a sessão: gera o resumo (se houve conversa de fato) e atualiza a memória do idioma.
 * Idempotente: uma sessão já fechada devolve o resumo salvo.
 */
export async function closeSession(sessionId: string): Promise<SessionSummary | null> {
  const session = must(
    await db().from("tutor_sessions").select("id,language,status,summary").eq("id", sessionId).maybeSingle(),
  ) as { id: string; language: Language; status: string; summary: SessionSummary | null } | null;
  if (!session) return null;
  if (session.status === "closed") return session.summary;

  // Marca como fechada antes de resumir, para evitar resumo duplicado em chamadas simultâneas.
  const claimed = must(
    await db()
      .from("tutor_sessions")
      .update({ status: "closed", ended_at: new Date().toISOString() })
      .eq("id", sessionId)
      .eq("status", "open")
      .select("id"),
  ) as { id: string }[];
  if (!claimed.length) return null;

  try {
    return await summarize(sessionId, session.language);
  } catch (err) {
    // Reabre para permitir nova tentativa (pelo botão ou pela limpeza automática).
    await db().from("tutor_sessions").update({ status: "open", ended_at: null }).eq("id", sessionId);
    throw err;
  }
}

async function summarize(sessionId: string, language: Language): Promise<SessionSummary | null> {
  const session = { language };
  const messages = await sessionMessages(sessionId, 80);
  if (!messages.some((m) => m.role === "user")) return null;

  const profile = await getProfile(session.language);
  const settings = await getSettings();
  const transcript = messages
    .map((m) => `${m.role === "user" ? `Elvis [${m.meta?.via === "voz" ? "voz" : "texto"}]` : "Tutor"}: ${m.content}`)
    .join("\n");

  await assertWithinLimits("llm");
  const result = await chatJSON<SummaryResult>(
    [
      { role: "system", content: summaryPrompt(session.language, profile) },
      { role: "user", content: transcript.slice(-20000) },
    ],
    "resumo_sessao",
    summarySchema,
    900,
  );
  await recordUsage(0, 0, 1);

  const summary: SessionSummary = {
    resumo: result.resumo,
    praticado: result.praticado.slice(0, 4),
    melhorar: result.melhorar.slice(0, 3),
    retomar: result.retomar.slice(0, 3),
    nivel_estimado: result.nivel_estimado,
  };
  const today = localParts(new Date(), settings.timezone).date;
  must(await db().from("tutor_sessions").update({ summary }).eq("id", sessionId));
  must(
    await db()
      .from("tutor_profiles")
      .update({ ...mergeProfile(profile, result, today), updated_at: new Date().toISOString() })
      .eq("language", session.language),
  );
  return summary;
}

/** Fecha sessões abandonadas (app fechado sem "Encerrar"), preservando o aprendizado. */
export async function closeStaleSessions(): Promise<void> {
  const cutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const stale = must(
    await db().from("tutor_sessions").select("id").eq("status", "open").lt("last_activity_at", cutoff).limit(3),
  ) as { id: string }[];
  for (const s of stale) {
    try {
      await closeSession(s.id);
    } catch (err) {
      console.error("Falha ao fechar sessão antiga", s.id, err instanceof Error ? err.message : err);
    }
  }
}
