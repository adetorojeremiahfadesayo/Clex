import { createHash, randomBytes } from "node:crypto";
import type { Queryable } from "../pool";

export interface SessionUserRow {
  user_id: string;
  email: string;
  display_name: string;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Returns the raw token for the cookie; only its hash is stored. */
export async function createSession(db: Queryable, userId: string, ttlHours: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.query(
    "insert into sessions (user_id, token_hash, expires_at) values ($1, $2, now() + ($3 || ' hours')::interval)",
    [userId, hashToken(token), String(ttlHours)],
  );
  return token;
}

export async function findSessionUser(db: Queryable, token: string): Promise<SessionUserRow | null> {
  const { rows } = await db.query<SessionUserRow>(
    `select u.id as user_id, u.email, u.display_name
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.revoked_at is null and s.expires_at > now()`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function revokeSession(db: Queryable, token: string): Promise<void> {
  await db.query("update sessions set revoked_at = now() where token_hash = $1 and revoked_at is null", [
    hashToken(token),
  ]);
}
