import { getPool, withActor, type PoolClient } from "@lex/db";
import { env } from "./env";

export function appPool() {
  return getPool(env().APP_DATABASE_URL);
}

/** Tenant-scoped transaction bound to the verified actor. */
export function asActor<T>(userId: string | null, fn: (db: PoolClient) => Promise<T>): Promise<T> {
  return withActor(appPool(), userId, fn);
}
