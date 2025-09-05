import { pool } from "./db/mysql.pool.js";

const ORDER_SELECT = "id, customer_id, status, total_cents, created_at";

const mapOrder = (r) =>
  r
    ? {
        id: Number(r.id),
        customer_id: Number(r.customer_id),
        status: r.status,
        total_cents: Number(r.total_cents),
        created_at: r.created_at,
      }
    : null;

const mapItem = (r) => ({
  id: Number(r.id),
  order_id: Number(r.order_id),
  product_id: Number(r.product_id),
  qty: Number(r.qty),
  price_cents: Number(r.price_cents),
});

export async function findById(id) {
  const [oRows] = await pool.execute(
    `SELECT ${ORDER_SELECT} FROM orders WHERE id=? LIMIT 1`,
    [id]
  );
  const order = mapOrder(oRows[0]);
  if (!order) return null;

  const [iRows] = await pool.execute(
    `SELECT id, order_id, product_id, qty, price_cents FROM order_items WHERE order_id=? ORDER BY id ASC`,
    [id]
  );
  return { ...order, items: iRows.map(mapItem) };
}

/**
 * Crea una orden: valida stock, descuenta, inserta order + items (TX)
 * @param {{customer_id:number, items:{product_id:number, qty:number}[]}} input
 */
export async function create({ customer_id, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw Object.assign(new Error("Items required"), { httpStatus: 400 });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ids = items.map((i) => i.product_id);
    const placeholders = ids.map(() => "?").join(",");
    const [pRows] = await conn.execute(
      `SELECT id, price_cents, stock FROM products WHERE id IN (${placeholders}) FOR UPDATE`,
      ids
    );
    const products = new Map(
      pRows.map((p) => [
        Number(p.id),
        { price_cents: Number(p.price_cents), stock: Number(p.stock) },
      ])
    );

    for (const it of items) {
      const p = products.get(Number(it.product_id));
      if (!p)
        throw Object.assign(new Error(`Product ${it.product_id} not found`), {
          httpStatus: 400,
        });
      if (it.qty <= 0)
        throw Object.assign(new Error("qty must be > 0"), { httpStatus: 400 });
      if (p.stock < it.qty)
        throw Object.assign(
          new Error(`Insufficient stock for product ${it.product_id}`),
          { httpStatus: 409 }
        );
    }

    let total = 0;
    for (const it of items) {
      const p = products.get(Number(it.product_id));
      total += p.price_cents * it.qty;
      await conn.execute(`UPDATE products SET stock = stock - ? WHERE id = ?`, [
        it.qty,
        it.product_id,
      ]);
    }

    const [resOrder] = await conn.execute(
      `INSERT INTO orders (customer_id, status, total_cents) VALUES (?, 'CREATED', ?)`,
      [customer_id, total]
    );
    const orderId = Number(resOrder.insertId);

    const values = [];
    const params = [];
    for (const it of items) {
      const p = products.get(Number(it.product_id));
      values.push("(?, ?, ?, ?)");
      params.push(orderId, it.product_id, it.qty, p.price_cents);
    }
    await conn.execute(
      `INSERT INTO order_items (order_id, product_id, qty, price_cents) VALUES ${values.join(
        ","
      )}`,
      params
    );

    await conn.commit();
    return await findById(orderId);
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

export async function confirm(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [upd] = await conn.execute(
      `UPDATE orders SET status='CONFIRMED' WHERE id=? AND status='CREATED'`,
      [id]
    );
    if (upd.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return null;
    }
    await conn.commit();
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
  return await findById(id);
}

export async function cancel(id) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [oRows] = await conn.execute(
      `SELECT status FROM orders WHERE id=? FOR UPDATE`,
      [id]
    );
    if (!oRows[0] || oRows[0].status !== "CREATED") {
      await conn.rollback();
      conn.release();
      return false;
    }

    const [items] = await conn.execute(
      `SELECT product_id, qty FROM order_items WHERE order_id=?`,
      [id]
    );
    for (const it of items) {
      await conn.execute(`UPDATE products SET stock = stock + ? WHERE id=?`, [
        it.qty,
        it.product_id,
      ]);
    }

    const [upd] = await conn.execute(
      `UPDATE orders SET status='CANCELED' WHERE id=?`,
      [id]
    );
    if (upd.affectedRows === 0) {
      await conn.rollback();
      conn.release();
      return false;
    }

    await conn.commit();
    return true;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * Búsqueda simple por status/fecha + paginación por cursor (id asc)
 * @param {{status?: 'CREATED'|'CONFIRMED'|'CANCELED', from?: string, to?: string, cursor?: number, limit?: number}}
 */
export async function search({ status, from, to, cursor, limit = 20 }) {
  const where = [];
  const params = [];

  if (status) {
    where.push("status = ?");
    params.push(status);
  }
  if (from) {
    where.push("created_at >= ?");
    params.push(from);
  }
  if (to) {
    where.push("created_at <= ?");
    params.push(to);
  }
  if (
    cursor !== undefined &&
    cursor !== null &&
    Number.isFinite(Number(cursor))
  ) {
    where.push("id > ?");
    params.push(Number(cursor));
  }

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));

  const sql = `
      SELECT ${ORDER_SELECT}
      FROM orders
      ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY id ASC
      LIMIT ${safeLimit}`;

  const [rows] = await pool.execute(sql, params);
  return rows.map(mapOrder);
}
