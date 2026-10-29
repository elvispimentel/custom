"use client";

/** fetch com JSON, mensagens de erro em português e retorno ao login quando expira. */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json", ...init.headers } : init.headers,
    });
  } catch {
    throw new Error("Sem conexão com a internet. Verifique e tente de novo.");
  }
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Acesso expirado.");
  }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`);
  return body as T;
}
