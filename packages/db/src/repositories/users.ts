import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Queryable } from "../pool";

const scrypt = promisify(scryptCb);

export interface UserRow {
  id: string;
  email: string;
  display_name: string;
  password_hash: string;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltB64, keyB64] = stored.split("$");
  if (scheme !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const actual = (await scrypt(password, Buffer.from(saltB64, "base64"), expected.length)) as Buffer;
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export class EmailTakenError extends Error {
  constructor() {
    super("email already registered");
  }
}

export async function createUser(
  db: Queryable,
  input: { email: string; displayName: string; password: string },
): Promise<UserRow> {
  const passwordHash = await hashPassword(input.password);
  try {
    const { rows } = await db.query<UserRow>(
      `insert into users (email, display_name, password_hash) values ($1, $2, $3)
       returning id, email, display_name, password_hash`,
      [input.email, input.displayName, passwordHash],
    );
    return rows[0]!;
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw new EmailTakenError();
    throw error;
  }
}

export async function findUserByEmail(db: Queryable, email: string): Promise<UserRow | null> {
  const { rows } = await db.query<UserRow>(
    "select id, email, display_name, password_hash from users where email = $1",
    [email],
  );
  return rows[0] ?? null;
}
