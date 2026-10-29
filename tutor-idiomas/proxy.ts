import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "./lib/auth";

// Tudo é privado, exceto login, arquivos do PWA e o cron (que tem segredo próprio).
const PUBLIC = [/^\/login$/, /^\/api\/login$/, /^\/api\/cron\//, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icons\//];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();

  let ok = false;
  try {
    ok = await verifySessionToken(request.cookies.get(COOKIE_NAME)?.value);
  } catch {
    ok = false;
  }
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Acesso expirado. Entre novamente." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
