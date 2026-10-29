import { db, must } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";

// Soma o tempo efetivamente praticado (aba visível e sessão não pausada).
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown; seconds?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    const seconds = Math.round(Number(body.seconds));
    if (!/^[0-9a-f-]{36}$/.test(sessionId) || !Number.isFinite(seconds) || seconds <= 0) return fail("Dados inválidos.");
    must(await db().rpc("tutor_add_active_seconds", { p_session: sessionId, p_seconds: seconds }));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
