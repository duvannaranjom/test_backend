CREATE DATABASE IF NOT EXISTS appdb
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
 
USE appdb;

-- customers
CREATE TABLE customers (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(120) NOT NULL, email VARCHAR(160) UNIQUE, phone VARCHAR(40), created_at TIMESTAMP DEFAULT NOW());

-- products
CREATE TABLE products (id BIGINT PRIMARY KEY AUTO_INCREMENT, name VARCHAR(140) NOT NULL, price_cents INT NOT NULL, stock INT NOT NULL, created_at TIMESTAMP DEFAULT NOW());

-- orders
CREATE TABLE orders (id BIGINT PRIMARY KEY AUTO_INCREMENT, customer_id BIGINT NOT NULL, status ENUM('CREATED','CONFIRMED','CANCELED') NOT NULL DEFAULT 'CREATED', total_cents INT NOT NULL DEFAULT 0, created_at TIMESTAMP DEFAULT NOW());

-- order_items
CREATE TABLE order_items (id BIGINT PRIMARY KEY AUTO_INCREMENT, order_id BIGINT NOT NULL, product_id BIGINT NOT NULL, qty INT NOT NULL, price_cents INT NOT NULL);

-- idempotency (para confirmación)
CREATE TABLE idempotency_keys (
  `key` VARCHAR(80) PRIMARY KEY,
  target_type VARCHAR(40) NOT NULL,     -- e.g. 'order_confirm'
  target_id BIGINT NOT NULL,            -- order_id
  status ENUM('SUCCEEDED','FAILED') NOT NULL,
  response_body JSON NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

