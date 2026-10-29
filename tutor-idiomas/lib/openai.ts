// Chamadas diretas à API da OpenAI (sem SDK) — somente no servidor.
import { models, requireEnv } from "./env";

const BASE = "https://api.openai.com/v1";

export class OpenAIError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function call(path: string, init: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${requireEnv("OPENAI_API_KEY")}`, ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {}
    throw new OpenAIError(res.status, detail);
  }
  return res;
}

export async function transcribe(audio: Blob, filename: string, language: string, hint: string): Promise<string> {
  const form = new FormData();
  form.append("file", audio, filename);
  form.append("model", models.stt());
  form.append("language", language);
  form.append("response_format", "json");
  // O contexto melhora o reconhecimento de nomes e termos da conversa.
  if (hint) form.append("prompt", hint.slice(0, 600));
  const res = await call("/audio/transcriptions", { method: "POST", body: form });
  const body = (await res.json()) as { text?: string };
  return (body.text ?? "").trim();
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function chatJSON<T>(messages: ChatMessage[], schemaName: string, schema: object, maxTokens = 600): Promise<T> {
  const res = await call("/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: models.chat(),
      messages,
      temperature: 0.6,
      max_tokens: maxTokens,
      response_format: { type: "json_schema", json_schema: { name: schemaName, strict: true, schema } },
    }),
  });
  const body = (await res.json()) as { choices?: { message?: { content?: string; refusal?: string } }[] };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new OpenAIError(502, body.choices?.[0]?.message?.refusal ?? "Resposta vazia");
  return JSON.parse(content) as T;
}

export async function speak(text: string, instructions: string): Promise<ArrayBuffer> {
  const res = await call("/audio/speech", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: models.tts(),
      voice: process.env.OPENAI_TTS_VOICE || "coral",
      input: text,
      instructions,
      response_format: "mp3",
    }),
  });
  return res.arrayBuffer();
}
