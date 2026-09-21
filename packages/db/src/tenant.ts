import type pg from "pg";

/**
 * Runs `fn` inside a transaction with app.user_id bound for RLS. The actor comes
 * from the verified session, never from client input.
 */
export async function withActor<T>(
  pool: pg.Pool,
  userId: string | null,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select set_config('app.user_id', $1, true)", [userId ?? ""]);
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
