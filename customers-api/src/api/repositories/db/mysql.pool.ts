import mysql from 'mysql2/promise';
import type { Pool, PoolOptions, PoolConnection } from 'mysql2/promise';

const options: PoolOptions = {
  host: process.env.DB_HOST!,
  port: Number(process.env.DB_PORT ?? 3306),
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  database: process.env.DB_NAME!,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_POOL_SIZE ?? 10),
};

export const pool: Pool = mysql.createPool(options);

export async function withTransaction<T>(fn: (conn: PoolConnection) => Promise<T>): Promise<T> {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) { try { await conn.rollback(); } catch {} throw e; }
  finally { conn.release(); }
}
