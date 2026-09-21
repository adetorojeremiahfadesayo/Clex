import { randomBytes } from "node:crypto";
import path from "node:path";
import pg from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { runMigrations } from "../src/migrate";

const admin = process.env.PG_ADMIN_URL;

describe.skipIf(!admin)("migrations", () => {
  const dbName = `lex_mig_${randomBytes(4).toString("hex")}`;
  let pool: pg.Pool;

  beforeAll(async () => {
    const c = new pg.Client({ connectionString: admin });
    await c.connect();
    await c.query(`create database "${dbName}"`);
    await c.end();
    const url = new URL(admin!);
    url.pathname = `/${dbName}`;
    pool = new pg.Pool({ connectionString: url.toString(), max: 2 });
  });
  afterAll(async () => {
    await pool.end();
    const c = new pg.Client({ connectionString: admin });
    await c.connect();
    await c.query(`drop database if exists "${dbName}" with (force)`);
    await c.end();
  });

  it("applies cleanly to an empty database and is idempotent", async () => {
    const dir = path.resolve("supabase/migrations");
    const first = await runMigrations(pool, dir);
    expect(first.length).toBeGreaterThan(0);
    const second = await runMigrations(pool, dir);
    expect(second).toEqual([]);
    const { rows } = await pool.query<{ relname: string; relrowsecurity: boolean }>(
      "select relname, relrowsecurity from pg_class where relkind = 'r' and relnamespace = 'public'::regnamespace and relname <> 'schema_migrations'",
    );
    for (const row of rows) expect(row.relrowsecurity, `${row.relname} must have RLS`).toBe(true);
  });
});
