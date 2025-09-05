# Prueba Técnica – Node.js + MySQL + Orquestador (Lambda) — **Rutas con `/V1`**

Guía rápida para levantar **Customers API**, **Orders API** y **Lambda Orchestrator**, **usando rutas versionadas `/V1`**.

## Requisitos
- Node.js **22.x**
- MySQL **8.x**
- npm
- (Orquestador) Serverless Framework v3 + serverless-offline
  ```bash
  npm i -D serverless@3 serverless-offline@^13
  ```

---


## 0) Base de datos

1) Crear BD (si no existe)
```sql
CREATE DATABASE IF NOT EXISTS appdb
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2) Cargar **schema** y **seed**
```bash
mysql -u root -p appdb < db/schema.sql
mysql -u root -p appdb < db/seed.sql
```

---

## 1) Customers API

### 1.1 .env
`customers-api/.env`
```
PORT=3001
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
SERVICE_TOKEN=8f2d1a7e9b0a4c1d9f3e6b2c5a7d8e9f
```
> El **SERVICE_TOKEN** debe coincidir con el del orquestador.

### 1.2 Ejecutar
```bash
cd customers-api
npm i
npm run dev
# Probar:
curl -sS http://localhost:3001/V1/health
```

---

## 2) Orders API

### 2.1 .env
`orders-api/.env`
```
PORT=3002
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=appdb
```

### 2.2 Ejecutar
```bash
cd orders-api
npm i
npm run dev
# Probar:
curl -sS http://localhost:3002/V1/health
```

---

## 3) Lambda Orchestrator (serverless-offline)

### 3.1 .env
`lambda-orchestrator/.env`
```

CUSTOMERS_API_BASE=http://localhost:3001/V1
ORDERS_API_BASE=http://localhost:3002/V1

# Token interno (debe ser el mismo que customers-api)
SERVICE_TOKEN=8f2d1a7e9b0a4c1d9f3e6b2c5a7d8e9f

# Opcional
REQUEST_TIMEOUT_MS=2000
RETRY_MAX_ATTEMPTS=2
RETRY_BASE_MS=200
LOG_LEVEL=info
```

### 3.2 Ejecutar offline
```bash
cd lambda-orchestrator
npm i
npx serverless@3 offline
```
Deberías ver: `POST http://localhost:3003/orchestrator/create-and-confirm-order`

---

