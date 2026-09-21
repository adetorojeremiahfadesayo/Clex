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
const appPassword = process.env.LEX_APP_PASSWORD ?? randomBytes(18).toString("base64url");
const workerPassword = process.env.LEX_WORKER_PASSWORD ?? randomBytes(18).toString("base64url");

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
await pool.query(`alter role lex_app login password ${literal(appPassword)}`);
await pool.query(`alter role lex_worker login password ${literal(workerPassword)}`);
await pool.end();

const mk = (user: string, pw: string) => {
  const u = new URL(adminUrl.toString());
  u.username = user;
  u.password = pw;
  return u.toString();
};
console.log(`# database ${dbName} ready; migrations applied: ${applied.length}`);
console.log(`export DATABASE_URL=${adminUrl.toString()}`);
console.log(`export APP_DATABASE_URL=${mk("lex_app", appPassword)}`);
console.log(`export WORKER_DATABASE_URL=${mk("lex_worker", workerPassword)}`);
