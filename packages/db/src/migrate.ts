import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type pg from "pg";

async function ensureTable(client: pg.PoolClient): Promise<void> {
  await client.query(`create table if not exists schema_migrations (
    name text primary key,
    checksum text not null,
    applied_at timestamptz not null default now()
  )`);
}

export async function listMigrationFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir);
  return entries.filter((f) => f.endsWith(".sql")).sort();
}

/** Applies pending migrations in order, each in its own transaction. Refuses checksum drift. */
export async function runMigrations(pool: pg.Pool, dir: string): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("select pg_advisory_lock(727001)");
    await ensureTable(client);
    const existing = await client.query<{ name: string; checksum: string }>(
      "select name, checksum from schema_migrations",
    );
    const byName = new Map(existing.rows.map((r) => [r.name, r.checksum]));
    for (const file of await listMigrationFiles(dir)) {
      const sql = await readFile(path.join(dir, file), "utf8");
      const checksum = createHash("sha256").update(sql).digest("hex");
      const previous = byName.get(file);
      if (previous) {
        if (previous !== checksum) throw new Error(`Migration ${file} was modified after being applied`);
        continue;
      }
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name, checksum) values ($1, $2)", [file, checksum]);
        await client.query("commit");
        applied.push(file);
      } catch (error) {
        await client.query("rollback");
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
    return applied;
  } finally {
    await client.query("select pg_advisory_unlock(727001)").catch(() => undefined);
    client.release();
  }
}
