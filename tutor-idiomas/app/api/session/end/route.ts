import { db, must } from "@/lib/db";
import { closeSession } from "@/lib/data";
import { fail, handleError, json } from "@/lib/http";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { sessionId?: unknown; seconds?: unknown };
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!/^[0-9a-f-]{36}$/.test(sessionId)) return fail("Sessão inválida.");
    const seconds = Math.round(Number(body.seconds));
    if (Number.isFinite(seconds) && seconds > 0) {
      must(await db().rpc("tutor_add_active_seconds", { p_session: sessionId, p_seconds: seconds }));
    }
    const summary = await closeSession(sessionId);
    const row = must(await db().from("tutor_sessions").select("active_seconds").eq("id", sessionId).maybeSingle()) as {
      active_seconds: number;
    } | null;
    return json({ summary, minutes: Math.round((row?.active_seconds ?? 0) / 60) });
  } catch (err) {
    return handleError(err);
  }
}
