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
  // Roles are cluster-wide, so tests log in as throwaway members of lex_app/lex_worker
  // instead of rotating the shared roles' passwords (which would lock out a running dev server).
  const appPw = randomBytes(12).toString("hex");
  const workerPw = randomBytes(12).toString("hex");
  const appRole = `${dbName}_app`;
  const workerRole = `${dbName}_worker`;
  await pool.query(`create role "${appRole}" login password '${appPw}' in role lex_app inherit`);
  await pool.query(`create role "${workerRole}" login password '${workerPw}' in role lex_worker inherit bypassrls`);
  await pool.end();

  const withUser = (u: string, p: string) => {
    const x = new URL(url.toString());
    x.username = u;
    x.password = p;
    return x.toString();
  };
  process.env.TEST_DATABASE_URL = url.toString();
  process.env.TEST_APP_DATABASE_URL = withUser(appRole, appPw);
  process.env.TEST_WORKER_DATABASE_URL = withUser(workerRole, workerPw);

  return async () => {
    const c = new pg.Client({ connectionString: admin });
    await c.connect();
    await c.query(`drop database if exists "${dbName}" with (force)`);
    await c.query(`drop role if exists "${appRole}"`);
    await c.query(`drop role if exists "${workerRole}"`);
    await c.end();
  };
}
