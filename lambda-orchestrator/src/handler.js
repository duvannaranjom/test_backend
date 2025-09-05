import { z } from 'zod';
import pino from 'pino';
import crypto from 'node:crypto';

/* ---------- Config ---------- */
const log = pino({ level: process.env.LOG_LEVEL ?? 'info' });

const CFG = {
  CUSTOMERS_API_BASE: process.env.CUSTOMERS_API_BASE ?? 'http://localhost:3001',
  ORDERS_API_BASE: process.env.ORDERS_API_BASE ?? 'http://localhost:3002',
  SERVICE_TOKEN: process.env.SERVICE_TOKEN ?? '',
  REQUEST_TIMEOUT_MS: Number(process.env.REQUEST_TIMEOUT_MS ?? 2000),
  RETRY_MAX_ATTEMPTS: Number(process.env.RETRY_MAX_ATTEMPTS ?? 2),
  RETRY_BASE_MS: Number(process.env.RETRY_BASE_MS ?? 200),
};

/* ---------- Validación ---------- */
const Item = z.object({
  product_id: z.coerce.number().int().positive(),
  qty: z.coerce.number().int().min(1),
});

const InputSchema = z.object({
  customer_id: z.coerce.number().int().positive(),
  items: z.array(Item).min(1),
  idempotency_key: z.string().min(8).optional(),
  correlation_id: z.string().optional(),
});

/* ---------- Helpers HTTP (timeout + retries 5xx) ---------- */
async function httpFetch(url, opts = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CFG.REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function isTransient(res) { return res?.status >= 500; }

async function fetchWithRetry(url, opts, maxAttempts, baseMs, label, corrId) {
  let attempt = 0;
  let lastErr;
  while (attempt < maxAttempts) {
    attempt++;
    try {
      const res = await httpFetch(url, opts);
      if (!isTransient(res)) return res;
      lastErr = new Error(`HTTP ${res.status}`);
      log.warn({ corrId, label, attempt, status: res.status }, 'Transient HTTP error, retrying');
    } catch (e) {
      lastErr = e;
      log.warn({ corrId, label, attempt, err: e?.message }, 'Network/timeout, retrying');
    }
    const backoff = baseMs * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 50);
    await sleep(backoff);
  }
  throw lastErr ?? new Error('Request failed');
}

/* ---------- Clientes internos ---------- */
async function getCustomerInternal(id, corrId) {
  const url = `${CFG.CUSTOMERS_API_BASE}/internal/customers/${id}`;
  const res = await fetchWithRetry(
    url,
    { headers: { Authorization: `Bearer ${CFG.SERVICE_TOKEN}` } },
    CFG.RETRY_MAX_ATTEMPTS,
    CFG.RETRY_BASE_MS,
    'customers.getInternal',
    corrId
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Customers API error: ${res.status}`);
  return res.json();
}

async function createOrder(body, corrId) {
  const url = `${CFG.ORDERS_API_BASE}/orders`;
  console.log("createOrder URL:::",url);
  const res = await fetchWithRetry(
    url,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    CFG.RETRY_MAX_ATTEMPTS,
    CFG.RETRY_BASE_MS,
    'orders.create',
    corrId
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Orders create error: ${res.status} ${errText}`);
  }
  return res.json();
}

async function confirmOrder(orderId, idempotencyKey, corrId) {
  const url = `${CFG.ORDERS_API_BASE}/orders/${orderId}/confirm`;
  console.log("url::: ",url)
  const res = await fetchWithRetry(
    url,
    { method: 'POST', headers: { 'X-Idempotency-Key': idempotencyKey } },
    CFG.RETRY_MAX_ATTEMPTS,
    CFG.RETRY_BASE_MS,
    'orders.confirm',
    corrId
  );
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Orders confirm error: ${res.status} ${errText}`);
  }
  return res.json();
}

/* ---------- Handler (APIGW HTTP API v2) ---------- */
export const handler = async (event) => {
  const start = Date.now();
  try {
    if (event.requestContext?.http?.method !== 'POST') {
      return json(405, { message: 'Method Not Allowed' });
    }

    const raw = safeJson(event.body);
    const input = InputSchema.parse(raw);

    const correlation_id = input.correlation_id || crypto.randomUUID();
    const idemKey = input.idempotency_key || crypto.randomBytes(32).toString('hex');

    log.info({ correlation_id, path: event.rawPath }, 'Orchestrator start');

    //validar cliente
    const customer = await getCustomerInternal(input.customer_id, correlation_id);
    if (!customer) return json(404, { message: 'Customer not found' }, correlation_id);

    //crear orden
    const orderCreated = await createOrder(
      { customer_id: input.customer_id, items: input.items },
      correlation_id
    );

    //confirmar (idempotency)
    const orderConfirmed = await confirmOrder(orderCreated.id, idemKey, correlation_id);

    const body = {
      correlation_id,
      idempotency_key: idemKey,
      customer,
      order: orderConfirmed,
      duration_ms: Date.now() - start,
    };
    return json(201, body, correlation_id);
  } catch (err) {
    log.error({ err: err?.message, stack: err?.stack }, 'Orchestrator error');
    const msg = String(err?.message ?? 'Internal Error');
    if (msg.includes('Validation') || msg.includes('Invalid') || msg.includes('ZodError')) {
      return json(422, { message: 'Validation error' });
    }
    if (msg.includes('Customer not found')) {
      return json(404, { message: 'Customer not found' });
    }
    if (msg.includes('create error: 409')) {
      return json(409, { message: 'Conflict creating order' });
    }
    return json(502, { message: 'Upstream error', detail: msg });
  }
};

function safeJson(body) {
  if (!body) return {};
  try { return typeof body === 'string' ? JSON.parse(body) : body; }
  catch { throw new Error('Validation: invalid JSON body'); }
}

function json(statusCode, body, correlation_id) {
  const headers = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
  };
  if (correlation_id) headers['x-correlation-id'] = correlation_id;
  return { statusCode, headers, body: JSON.stringify(body ?? {}) };
}
