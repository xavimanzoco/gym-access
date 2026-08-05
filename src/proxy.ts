import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "gym_session";

/**
 * Protege las rutas /admin. Si no hay sesión válida, redirige a /login.
 * (El valor de sesión se compara contra ADMIN_SESSION_SECRET.)
 */
export function proxy(request: NextRequest) {
  const esperado = process.env.ADMIN_SESSION_SECRET ?? "dev-session-secret";
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (cookie !== esperado) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
