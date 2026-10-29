import { db, must } from "./db";
import { limits } from "./env";
import { localParts, DEFAULT_TZ } from "./time";

export class LimitError extends Error {}

function today(): string {
  return localParts(new Date(), DEFAULT_TZ).date;
}

type Usage = { stt_seconds: number; tts_chars: number; llm_calls: number };

async function current(): Promise<Usage> {
  const row = must(await db().from("tutor_usage").select("*").eq("day", today()).maybeSingle()) as Usage | null;
  return row ?? { stt_seconds: 0, tts_chars: 0, llm_calls: 0 };
}

/** Bloqueia antes de gastar, para que um acesso indevido não gere conta alta. */
export async function assertWithinLimits(kind: "stt" | "tts" | "llm", amount = 0): Promise<void> {
  const u = await current();
  if (kind === "stt" && Number(u.stt_seconds) + amount > limits.audioSecondsPerDay()) {
    throw new LimitError("Limite diário de áudio atingido. Ele volta amanhã ou pode ser ajustado nas variáveis da Vercel.");
  }
  if (kind === "tts" && u.tts_chars + amount > limits.ttsCharsPerDay()) {
    throw new LimitError("Limite diário de voz do tutor atingido. Use o texto ou tente amanhã.");
  }
  if (kind === "llm" && u.llm_calls + 1 > limits.llmCallsPerDay()) {
    throw new LimitError("Limite diário de mensagens atingido. Ele volta amanhã.");
  }
}

export async function recordUsage(stt: number, tts: number, llm: number): Promise<void> {
  must(await db().rpc("tutor_bump_usage", { p_day: today(), p_stt: stt, p_tts: tts, p_llm: llm }));
}

export async function usageToday(): Promise<Usage> {
  return current();
}
