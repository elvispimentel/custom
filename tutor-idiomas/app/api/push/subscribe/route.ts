import { db, must } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function validEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const sub = ((await request.json().catch(() => ({}))) as { subscription?: Sub }).subscription ?? {};
    const { endpoint, keys } = sub;
    if (!validEndpoint(endpoint) || typeof keys?.p256dh !== "string" || typeof keys?.auth !== "string") {
      return fail("Inscrição inválida.");
    }
    must(
      await db().from("tutor_push_subscriptions").upsert({
        endpoint,
        p256dh: keys.p256dh.slice(0, 200),
        auth: keys.auth.slice(0, 100),
        user_agent: (request.headers.get("user-agent") ?? "").slice(0, 200),
      }),
    );
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(request: Request) {
  try {
    const { endpoint } = (await request.json().catch(() => ({}))) as { endpoint?: unknown };
    if (!validEndpoint(endpoint)) return fail("Inscrição inválida.");
    must(await db().from("tutor_push_subscriptions").delete().eq("endpoint", endpoint));
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
