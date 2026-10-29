// Leitura centralizada das variáveis de ambiente. Nada aqui chega ao navegador.

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(name);
  return value;
}

export class ConfigError extends Error {
  constructor(public variable: string) {
    super(`Configuração ausente: ${variable}`);
  }
}

function numberEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const models = {
  chat: () => process.env.OPENAI_CHAT_MODEL || "gpt-4.1-mini",
  stt: () => process.env.OPENAI_STT_MODEL || "gpt-4o-mini-transcribe",
  tts: () => process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
};

export const limits = {
  audioSecondsPerDay: () => numberEnv("LIMITE_AUDIO_MIN_DIA", 60) * 60,
  ttsCharsPerDay: () => numberEnv("LIMITE_TTS_CARACTERES_DIA", 60000),
  llmCallsPerDay: () => numberEnv("LIMITE_CHAMADAS_IA_DIA", 400),
  maxAudioBytes: 4 * 1024 * 1024,
  maxAudioSeconds: 120,
  maxTextChars: 1500,
  maxTtsChars: 700,
};
