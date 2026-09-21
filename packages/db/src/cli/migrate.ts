import path from "node:path";
import { fileURLToPath } from "node:url";
import { getPool, closeAllPools } from "../pool";
import { runMigrations } from "../migrate";

// Requires an explicit target; refuses to guess a database.
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (privileged connection).");
  process.exit(2);
}
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../supabase/migrations");
const pool = getPool(url);
try {
  const applied = await runMigrations(pool, dir);
  console.log(applied.length ? `Applied: ${applied.join(", ")}` : "No pending migrations.");
} finally {
  await closeAllPools();
}
