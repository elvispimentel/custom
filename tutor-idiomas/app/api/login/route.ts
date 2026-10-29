import { cookies } from "next/headers";
import { COOKIE_NAME, SESSION_DAYS, createSessionToken, passwordMatches } from "@/lib/auth";
import { db, must } from "@/lib/db";
import { fail, handleError, json } from "@/lib/http";

type Attempts = { count: number; since: number };
const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILS = 8;

export async function POST(request: Request) {
  try {
    if (!process.env.APP_PASSWORD) return fail("APP_PASSWORD ainda não foi configurada na Vercel.", 503);
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    const password = typeof body.password === "string" ? body.password.slice(0, 200) : "";

    const row = must(await db().from("tutor_kv").select("value").eq("key", "login_fails").maybeSingle()) as { value: Attempts } | null;
    const now = Date.now();
    const attempts = row && now - row.value.since < WINDOW_MS ? row.value : { count: 0, since: now };
    if (attempts.count >= MAX_FAILS) return fail("Muitas tentativas. Aguarde 15 minutos.", 429);

    if (!(await passwordMatches(password))) {
      await db().from("tutor_kv").upsert({ key: "login_fails", value: { count: attempts.count + 1, since: attempts.since } });
      await new Promise((r) => setTimeout(r, 800));
      return fail("Senha incorreta.", 401);
    }
    await db().from("tutor_kv").delete().eq("key", "login_fails");

    (await cookies()).set(COOKIE_NAME, await createSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DAYS * 24 * 3600,
    });
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
