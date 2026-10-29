// Sessão de acesso: cookie assinado com HMAC. Funciona no proxy e nas rotas.

export const COOKIE_NAME = "tutor_sessao";
export const SESSION_DAYS = 60;

const encoder = new TextEncoder();

async function hmacKey(): Promise<CryptoKey> {
  const password = process.env.APP_PASSWORD;
  const extra = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!password) throw new Error("APP_PASSWORD ausente");
  // Trocar a senha invalida todas as sessões abertas.
  const material = await crypto.subtle.digest("SHA-256", encoder.encode(`tutor|${password}|${extra}`));
  return crypto.subtle.importKey("raw", material, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]+$/.test(hex) || hex.length % 2) return null;
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function createSessionToken(now = Date.now()): Promise<string> {
  const expires = now + SESSION_DAYS * 24 * 3600 * 1000;
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(), encoder.encode(String(expires)));
  return `${expires}.${toHex(sig)}`;
}

export async function verifySessionToken(token: string | undefined, now = Date.now()): Promise<boolean> {
  if (!token) return false;
  const [expires, sigHex] = token.split(".");
  if (!expires || !sigHex || !/^\d+$/.test(expires) || Number(expires) < now) return false;
  const sig = fromHex(sigHex);
  if (!sig) return false;
  try {
    return await crypto.subtle.verify("HMAC", await hmacKey(), sig, encoder.encode(expires));
  } catch {
    return false;
  }
}

export async function passwordMatches(candidate: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected || !candidate) return false;
  // Compara os resumos para não vazar o tamanho nem o conteúdo pelo tempo de resposta.
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(candidate)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
