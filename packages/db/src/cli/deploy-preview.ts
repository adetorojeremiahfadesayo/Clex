/** Provision the isolated web role and migrate a Render preview database. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { runMigrations } from "../migrate";

if (process.env.APP_ENV !== "preview") {
  throw new Error("db:deploy:preview requires APP_ENV=preview");
}

const adminConnection = process.env.DATABASE_URL;
const appConnection = process.env.APP_DATABASE_URL;
if (!adminConnection || !appConnection) {
  throw new Error("DATABASE_URL and APP_DATABASE_URL are required");
}

const adminUrl = new URL(adminConnection);
const appUrl = new URL(appConnection);
if (
  !["postgres:", "postgresql:"].includes(adminUrl.protocol) ||
  !["postgres:", "postgresql:"].includes(appUrl.protocol) ||
  appUrl.username !== "lex_app" ||
  !appUrl.password ||
  adminUrl.hostname !== appUrl.hostname ||
  (adminUrl.port || "5432") !== (appUrl.port || "5432") ||
  adminUrl.pathname !== appUrl.pathname
) {
  throw new Error("APP_DATABASE_URL must use lex_app on the same database as DATABASE_URL");
}

const sqlLiteral = (value: string) => `'${value.replace(/'/g, "''")}'`;
const pool = new pg.Pool({ connectionString: adminConnection, max: 2 });
try {
  // Render's database owner can create ordinary roles but cannot grant BYPASSRLS.
  // Creating these first lets the immutable foundation migration keep its local
  // worker behaviour while the preview runs only the RLS-bound web service.
  await pool.query(`do $$ begin
    if not exists (select 1 from pg_roles where rolname = 'lex_app') then
      create role lex_app nologin;
    end if;
    if not exists (select 1 from pg_roles where rolname = 'lex_worker') then
      create role lex_worker nologin;
    end if;
  end $$`);
  const directory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../supabase/migrations");
  const applied = await runMigrations(pool, directory);
  await pool.query(`alter role lex_app login password ${sqlLiteral(decodeURIComponent(appUrl.password))}`);
  console.log(`Preview database ready; ${applied.length} migration(s) applied.`);
} finally {
  await pool.end();
}
