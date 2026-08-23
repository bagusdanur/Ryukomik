import "server-only";

import pg, { type PoolClient, type QueryResultRow } from "pg";

const { Pool } = pg;
const connectionString = process.env.SOCIAL_DATABASE_URL;

declare global {
  var __ryukomikSocialPool: pg.Pool | undefined;
}

function createPool() {
  if (!connectionString) throw new Error("SOCIAL_DATABASE_UNAVAILABLE");
  return new Pool({
    connectionString,
    max: Number(process.env.SOCIAL_DATABASE_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: "ryukomik-social",
  });
}

export function socialPool() {
  if (!globalThis.__ryukomikSocialPool) globalThis.__ryukomikSocialPool = createPool();
  return globalThis.__ryukomikSocialPool;
}

export async function socialQuery<T extends QueryResultRow = QueryResultRow>(text: string, values: unknown[] = []) {
  return socialPool().query<T>(text, values);
}

export async function socialTransaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await socialPool().connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function socialDatabaseHealth() {
  const startedAt = Date.now();
  const result = await socialQuery<{ now: string }>("select now()::text as now");
  return { ok: true, databaseTime: result.rows[0]?.now, latencyMs: Date.now() - startedAt };
}
