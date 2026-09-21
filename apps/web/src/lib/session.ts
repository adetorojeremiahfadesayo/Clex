import { cookies } from "next/headers";
import { cache } from "react";
import type { SessionUser } from "@lex/domain";
import { createSession, findSessionUser, revokeSession } from "@lex/db";
import { asActor } from "./db";
import { env } from "./env";

export const SESSION_COOKIE = "lex_session";

const cookieOptions = () => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env().APP_URL.startsWith("https://"),
  path: "/",
  maxAge: env().SESSION_TTL_HOURS * 3600,
});

export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = await asActor(null, (db) => findSessionUser(db, token));
  return row ? { id: row.user_id, email: row.email, displayName: row.display_name } : null;
});

export async function startSession(userId: string): Promise<void> {
  const token = await asActor(null, (db) => createSession(db, userId, env().SESSION_TTL_HOURS));
  (await cookies()).set(SESSION_COOKIE, token, cookieOptions());
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await asActor(null, (db) => revokeSession(db, token));
  store.delete(SESSION_COOKIE);
}
