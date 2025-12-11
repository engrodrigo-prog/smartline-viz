import { config } from "dotenv";
import { Pool, PoolClient } from "pg";

config();

export type DbPool = Pool;
export type DbClient = PoolClient;

let sharedPool: Pool | null = null;

interface PoolOverrides {
  connectionString?: string;
}

export function getDbPool(overrides?: PoolOverrides): Pool {
  if (overrides?.connectionString) {
    return new Pool({ connectionString: overrides.connectionString });
  }

  if (!sharedPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set. Configure it in apps/api/.env");
    }
    sharedPool = new Pool({ connectionString });
  }

  return sharedPool;
}

export async function withDbClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

export async function runInTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  return withDbClient(async (client) => {
    await client.query("BEGIN");
    try {
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    }
  });
}

export async function query<T = unknown>(text: string, params?: unknown[]) {
  const pool = getDbPool();
  return pool.query<T>(text, params);
}
