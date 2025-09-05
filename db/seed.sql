-- CUSTOMERS (10)
INSERT INTO customers (name, email, phone) VALUES
('Ada Lovelace','ada@example.com','3001111111'),
('Alan Turing','alan@example.com','3002222222'),
('Grace Hopper','grace@example.com','3003333333'),
('Linus Torvalds','linus@example.com','3004444444'),
('Margaret Hamilton','margaret@example.com','3005555555'),
('Guido van Rossum','guido@example.com','3006666666'),
('James Gosling','gosling@example.com','3007777777'),
('Barbara Liskov','liskov@example.com','3008888888'),
('Donald Knuth','knuth@example.com','3009999999'),
('Ken Thompson','ken@example.com','3010000000');

-- PRODUCTS (10)
INSERT INTO products (name, price_cents, stock) VALUES
('USB-C Cable',            5000, 100),
('Wireless Mouse',        15000, 100),
('32GB MicroSD',          25000, 100),
('Mechanical Keyboard',   35000, 100),
('1TB HDD',               45000, 100),
('500GB SSD',             55000, 100),
('24\" Monitor',          65000, 100),
('Bluetooth Speaker',     75000, 100),
('NC Headphones',         85000, 100),
('WiFi 6 Router',         95000, 100);

-- ORDERS (10)
INSERT INTO orders (customer_id, status, total_cents) VALUES
(1,  'CONFIRMED',  35000),
(2,  'CREATED',    50000),
(3,  'CONFIRMED',  45000),
(4,  'CANCELED',   85000),
(5,  'CREATED',    80000),
(6,  'CONFIRMED',  95000),
(7,  'CREATED',    95000),
(8,  'CONFIRMED', 135000),
(9,  'CREATED',    70000),
(10, 'CONFIRMED', 115000);

-- ORDER_ITEMS (coherentes con los totales anteriores)
INSERT INTO order_items (order_id, product_id, qty, price_cents) VALUES
(1, 1, 2, 5000),
(1, 3, 1, 25000),
(2, 2, 1, 15000),
(2, 4, 1, 35000),
(3, 5, 1, 45000),
(4, 2, 2, 15000),
(4, 6, 1, 55000),
(5, 7, 1, 65000),
(5, 1, 3, 5000),
(6, 8, 1, 75000),
(6, 2, 1, 15000),
(6, 1, 1, 5000),
(7,10, 1, 95000),
(8, 9, 1, 85000),
(8, 3, 2, 25000),
(9, 4, 2, 35000),
(10,5, 1, 45000),
(10,6, 1, 55000),
(10,2, 1, 15000);

-- IDEMPOTENCY KEYS (para órdenes confirmadas)
INSERT INTO idempotency_keys (`key`, target_type, target_id, status, response_body, expires_at) VALUES
('confirm-1',  'order_confirm', 1,  'SUCCEEDED', JSON_OBJECT('order_id',1,'status','CONFIRMED'),  DATE_ADD(NOW(), INTERVAL 7 DAY)),
('confirm-3',  'order_confirm', 3,  'SUCCEEDED', JSON_OBJECT('order_id',3,'status','CONFIRMED'),  DATE_ADD(NOW(), INTERVAL 7 DAY)),
('confirm-6',  'order_confirm', 6,  'SUCCEEDED', JSON_OBJECT('order_id',6,'status','CONFIRMED'),  DATE_ADD(NOW(), INTERVAL 7 DAY)),
('confirm-8',  'order_confirm', 8,  'SUCCEEDED', JSON_OBJECT('order_id',8,'status','CONFIRMED'),  DATE_ADD(NOW(), INTERVAL 7 DAY)),
('confirm-10', 'order_confirm',10, 'SUCCEEDED', JSON_OBJECT('order_id',10,'status','CONFIRMED'), DATE_ADD(NOW(), INTERVAL 7 DAY));
