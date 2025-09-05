import { pool } from "./db/mysql.pool.ts";

const SELECT_FIELDS = "id, name, email, phone, created_at";

const mapRow = (r) =>
  r
    ? {
        id: Number(r.id),
        name: r.name,
        email: r.email,
        phone: r.phone,
        created_at: r.created_at,
      }
    : null;

export async function create({ name, email, phone }) {
  const [res] = await pool.execute(
    "INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)",
    [name, email, phone ?? null]
  );
  return Number(res.insertId);
}

export async function findById(id) {
  const [rows] = await pool.execute(
    `SELECT ${SELECT_FIELDS} FROM customers WHERE id = ? LIMIT 1`,
    [id]
  );
  return mapRow(rows[0] ?? null);
}

export async function search({ search = "", cursor, limit = 20 }) {
  const where = [];
  const params = [];

  if (search) {
    const like = `%${search}%`;
    where.push("(name LIKE ? OR email LIKE ? OR phone LIKE ?)");
    params.push(like, like, like);
  }
  if (cursor != null) {
    where.push("id > ?");
    params.push(Number(cursor));
  }

  const limitInt = Math.min(100, Math.max(1, Number(limit) || 20));

  const sql = `
    SELECT ${SELECT_FIELDS}
    FROM customers
    ${where.length ? "WHERE " + where.join(" AND ") : ""}
    ORDER BY id ASC
    LIMIT ${limitInt}`;

  const [rows] = await pool.execute(sql, params);
  return rows.map(mapRow);
}

export async function update(id, { name, email, phone }) {
  const sets = [];
  const params = [];
  if (name !== undefined) {
    sets.push("name = ?");
    params.push(name);
  }
  if (email !== undefined) {
    sets.push("email = ?");
    params.push(email);
  }
  if (phone !== undefined) {
    sets.push("phone = ?");
    params.push(phone);
  }

  if (!sets.length) return await findById(id);

  const [res] = await pool.execute(
    `UPDATE customers SET ${sets.join(", ")} WHERE id = ? LIMIT 1`,
    [...params, id]
  );
  if (res.affectedRows === 0) return null;
  return await findById(id);
}

export async function remove(id) {
  const [res] = await pool.execute(
    "DELETE FROM customers WHERE id = ? LIMIT 1",
    [id]
  );
  return res.affectedRows === 1;
}
