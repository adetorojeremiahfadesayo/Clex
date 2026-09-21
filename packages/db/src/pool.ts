import pg from "pg";

const { Pool } = pg;
export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;
export type Queryable = Pick<pg.PoolClient, "query">;

const pools = new Map<string, pg.Pool>();

export function getPool(connectionString: string): pg.Pool {
  let pool = pools.get(connectionString);
  if (!pool) {
    pool = new Pool({ connectionString, max: 8, idleTimeoutMillis: 30_000 });
    // Idle clients dropped by the server must not crash the process.
    pool.on("error", (error) => console.error("[db] idle client error", error.message));
    pools.set(connectionString, pool);
  }
  return pool;
}

export async function closeAllPools(): Promise<void> {
  await Promise.all([...pools.values()].map((p) => p.end()));
  pools.clear();
}
