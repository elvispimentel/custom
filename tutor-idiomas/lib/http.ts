import { NextResponse } from "next/server";
import { ConfigError } from "./env";
import { LimitError } from "./limits";
import { OpenAIError } from "./openai";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Converte erros conhecidos em mensagens úteis, sem vazar detalhes internos. */
export function handleError(err: unknown) {
  if (err instanceof ConfigError) {
    return fail(`O servidor ainda não está configurado: falta ${err.variable}.`, 503);
  }
  if (err instanceof LimitError) return fail(err.message, 429);
  if (err instanceof OpenAIError) {
    console.error("OpenAI", err.status, err.message);
    if (err.status === 401) return fail("A chave da OpenAI foi recusada. Confira OPENAI_API_KEY.", 502);
    if (err.status === 429) return fail("A OpenAI recusou por limite ou falta de crédito. Tente em instantes.", 502);
    return fail("O serviço de voz/IA falhou. Tente novamente.", 502);
  }
  console.error(err instanceof Error ? err.message : err);
  return fail("Algo deu errado no servidor. Tente novamente.", 500);
}
