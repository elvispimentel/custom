import { cookies } from "next/headers";
import { COOKIE_NAME } from "@/lib/auth";
import { json } from "@/lib/http";

export async function POST() {
  (await cookies()).delete(COOKIE_NAME);
  return json({ ok: true });
}
