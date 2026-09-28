-- Fix missing payments for previously PAID orders
INSERT INTO payments (order_id, amount, method, status, created_at)
SELECT id, total, 'CASH', 'PAID', created_at
FROM orders
WHERE payment_status = 'PAID'
AND id NOT IN (SELECT order_id FROM payments);
