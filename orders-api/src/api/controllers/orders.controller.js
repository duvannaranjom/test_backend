import * as orderService from "../services/order.service.js";

export async function create(req, res, next) {
  try {
    const { customer_id, items } = req.body;
    const out = await orderService.create({
      customer_id: Number(customer_id),
      items,
    });
    res.status(201).json(out);
  } catch (e) {
    next(e);
  }
}

export async function getById(req, res, next) {
  try {
    const out = await orderService.getById(Number(req.params.id));
    if (!out) return res.sendStatus(404);
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function list(req, res, next) {
  try {
    const { status, from, to, cursor, limit } = req.query;
    const out = await orderService.search({
      status,
      from,
      to,
      cursor: cursor ? Number(cursor) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function confirm(req, res, next) {
  try {
    const order_id = Number(req.params.id);
    const idempotencyKey = req.get("X-Idempotency-Key");
    const out = await orderService.confirm({ order_id, idempotencyKey });
    res.json(out);
  } catch (e) {
    next(e);
  }
}

export async function cancel(req, res, next) {
  try {
    const ok = await orderService.cancel(Number(req.params.id));
    if (!ok) return res.status(409).json({ message: "Cannot cancel" });
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
}
