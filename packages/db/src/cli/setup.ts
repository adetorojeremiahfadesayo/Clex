/**
 * Local/preview database bootstrap. Creates the database, login roles for lex_app
 * and lex_worker, runs migrations and prints the connection strings to export.
 * Refuses to run when APP_ENV=production.
 */
import { randomBytes } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { runMigrations } from "../migrate";

if (process.env.APP_ENV === "production") {
  console.error("db:setup is for local/preview databases only.");
  process.exit(2);
}

const admin = process.env.PG_ADMIN_URL ?? "postgres://postgres@localhost:5432/postgres";
const dbName = process.env.PG_DB_NAME ?? "lex_dev";
// Explicit passwords win; otherwise a fresh database gets random ones and an existing
// database keeps whatever it has, so a stray re-run cannot lock out a running server.
const explicitApp = process.env.LEX_APP_PASSWORD;
const explicitWorker = process.env.LEX_WORKER_PASSWORD;

const ident = (s: string) => `"${s.replace(/"/g, '""')}"`;
const literal = (s: string) => `'${s.replace(/'/g, "''")}'`;

const adminClient = new pg.Client({ connectionString: admin });
await adminClient.connect();
const exists = await adminClient.query("select 1 from pg_database where datname = $1", [dbName]);
if (exists.rowCount === 0) await adminClient.query(`create database ${ident(dbName)}`);
const adminUrl = new URL(admin);
adminUrl.pathname = `/${dbName}`;
await adminClient.end();

const pool = new pg.Pool({ connectionString: adminUrl.toString() });
const applied = await runMigrations(pool, path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../supabase/migrations"));
const fresh = exists.rowCount === 0;
const appPassword = explicitApp ?? (fresh ? randomBytes(18).toString("base64url") : null);
const workerPassword = explicitWorker ?? (fresh ? randomBytes(18).toString("base64url") : null);
if (appPassword) await pool.query(`alter role lex_app login password ${literal(appPassword)}`);
else await pool.query("alter role lex_app login");
if (workerPassword) await pool.query(`alter role lex_worker login password ${literal(workerPassword)}`);
else await pool.query("alter role lex_worker login");
await pool.end();

const mk = (user: string, pw: string) => {
  const u = new URL(adminUrl.toString());
  u.username = user;
  u.password = pw;
  return u.toString();
};
console.log(`# database ${dbName} ready; migrations applied: ${applied.length}`);
console.log(`export DATABASE_URL=${adminUrl.toString()}`);
if (appPassword) console.log(`export APP_DATABASE_URL=${mk("lex_app", appPassword)}`);
else console.log("# APP_DATABASE_URL unchanged: existing lex_app password kept (set LEX_APP_PASSWORD to rotate)");
if (workerPassword) console.log(`export WORKER_DATABASE_URL=${mk("lex_worker", workerPassword)}`);
else console.log("# WORKER_DATABASE_URL unchanged: existing lex_worker password kept (set LEX_WORKER_PASSWORD to rotate)");
