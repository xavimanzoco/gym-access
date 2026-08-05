import { cookies } from "next/headers";

export const SESSION_COOKIE = "gym_session";

/** Valor que se guarda en la cookie de sesión. */
export function sessionValue(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "dev-session-secret";
}

/** Contraseña del panel (default solo para desarrollo). */
export function adminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin1234";
}

/** ¿La request actual tiene una sesión válida? (server-side) */
export async function isAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return store.get(SESSION_COOKIE)?.value === sessionValue();
}
