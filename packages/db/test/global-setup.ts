/**
 * Creates a fresh isolated test database from migrations for every run.
 * Skipped (with a visible notice) when PG_ADMIN_URL is not set.
 */
import { randomBytes } from "node:crypto";
import path from "node:path";
import pg from "pg";
import { runMigrations } from "../src/migrate";

export default async function setup(): Promise<() => Promise<void>> {
  const admin = process.env.PG_ADMIN_URL;
  if (!admin) {
    console.warn("[test] PG_ADMIN_URL not set; database integration tests will be skipped.");
    return async () => undefined;
  }
  const dbName = `lex_test_${randomBytes(4).toString("hex")}`;
  const client = new pg.Client({ connectionString: admin });
  await client.connect();
  await client.query(`create database "${dbName}"`);
  await client.end();

  const url = new URL(admin);
  url.pathname = `/${dbName}`;
  const pool = new pg.Pool({ connectionString: url.toString() });
  await runMigrations(pool, path.resolve("supabase/migrations"));
  const appPw = randomBytes(12).toString("hex");
  const workerPw = randomBytes(12).toString("hex");
  await pool.query(`alter role lex_app login password '${appPw}'`);
  await pool.query(`alter role lex_worker login password '${workerPw}'`);
  await pool.end();

  const withUser = (u: string, p: string) => {
    const x = new URL(url.toString());
    x.username = u;
    x.password = p;
    return x.toString();
  };
  process.env.TEST_DATABASE_URL = url.toString();
  process.env.TEST_APP_DATABASE_URL = withUser("lex_app", appPw);
  process.env.TEST_WORKER_DATABASE_URL = withUser("lex_worker", workerPw);

  return async () => {
    const c = new pg.Client({ connectionString: admin });
    await c.connect();
    await c.query(`drop database if exists "${dbName}" with (force)`);
    await c.end();
  };
}
