import * as orderRepo from "../repositories/mysql.order.repo.js";
import { pool } from "../repositories/db/mysql.pool.js";
import { AppError } from "../../errors/app-error.js";

async function ensureCustomerExists(customer_id) {
  const base = (
    process.env.CUSTOMERS_API_BASE || "http://localhost:3001/V1"
  ).replace(/\/$/, "");
  const url = `${base}/internal/customers/${customer_id}`;
  const token = process.env.SERVICE_TOKEN;

  try {
    console.log("URL", url);
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (r.status === 404) throw AppError.notFound("Customer not found");
    if (!r.ok) throw new AppError(`Customers API error (${r.status})`, 502);
    return r.json();
  } catch (e) {
    console.error("Customers fetch failed:", { url, base, msg: e.message });
    throw new AppError(
      "Customers API unavailable",
      502,
      "CUSTOMERS_UNAVAILABLE",
      { url }
    );
  }
}

export async function create({ customer_id, items }) {
  await ensureCustomerExists(customer_id);
  return await orderRepo.create({ customer_id, items });
}

export async function getById(id) {
  return await orderRepo.findById(id);
}

export async function search(q) {
  return await orderRepo.search(q);
}

/**
 * Confirmación idempotente.
 * Si existe el key, retorna la respuesta cacheada.
 * Si no, confirma y guarda la respuesta en idempotency_keys.
 */
export async function confirm({ order_id, idempotencyKey, ttlSeconds = 600 }) {
  if (!idempotencyKey) throw AppError.badRequest("Missing X-Idempotency-Key");

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT IGNORE INTO idempotency_keys (\`key\`, target_type, target_id, status, response_body, expires_at)
       VALUES (?, 'order_confirm', ?, 'PENDING', JSON_OBJECT(), DATE_ADD(NOW(), INTERVAL ? SECOND))`,
      [idempotencyKey, order_id, ttlSeconds]
    );

    const [rows] = await conn.execute(
      `SELECT \`key\`, status, response_body, expires_at
       FROM idempotency_keys WHERE \`key\`=? FOR UPDATE`,
      [idempotencyKey]
    );
    const row = rows[0];

    if (
      row &&
      row.status === "SUCCEEDED" &&
      new Date(row.expires_at) > new Date()
    ) {
      await conn.commit();
      return typeof row.response_body === "string"
        ? JSON.parse(row.response_body)
        : row.response_body;
    }

    const confirmed = await orderRepo.confirm(order_id);
    const response = confirmed ?? (await orderRepo.findById(order_id)); // devuelve estado actual si no aplicó

    await conn.execute(
      `UPDATE idempotency_keys
       SET status='SUCCEEDED', response_body=?, expires_at=DATE_ADD(NOW(), INTERVAL ? SECOND)
       WHERE \`key\`=?`,
      [JSON.stringify(response ?? {}), ttlSeconds, idempotencyKey]
    );

    await conn.commit();
    return response;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

export async function cancel(order_id) {
  return await orderRepo.cancel(order_id); // true/false
}
