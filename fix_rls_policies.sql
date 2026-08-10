-- Comprehensive RLS Policies for Brownee Business App
-- Run this in your Supabase SQL Editor to fix all "Row-Level Security" errors

-- 1. Profiles
CREATE POLICY "Allow authenticated insert" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON profiles FOR UPDATE TO authenticated USING (true);

-- 2. Products
CREATE POLICY "Allow authenticated insert" ON products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON products FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON products FOR DELETE TO authenticated USING (true);

-- 3. Product Variants
CREATE POLICY "Allow authenticated insert" ON product_variants FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON product_variants FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON product_variants FOR DELETE TO authenticated USING (true);

-- 4. Categories
CREATE POLICY "Allow authenticated insert" ON categories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON categories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON categories FOR DELETE TO authenticated USING (true);

-- 5. Orders (Ensuring coverage)
-- CREATE POLICY "Allow authenticated insert" ON orders FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Allow authenticated update" ON orders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON orders FOR DELETE TO authenticated USING (true);

-- 6. Order Items
-- CREATE POLICY "Allow authenticated insert" ON order_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON order_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON order_items FOR DELETE TO authenticated USING (true);

-- 7. Customers (Ensuring coverage)
-- CREATE POLICY "Allow authenticated insert" ON customers FOR INSERT TO authenticated WITH CHECK (true);
-- CREATE POLICY "Allow authenticated update" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON customers FOR DELETE TO authenticated USING (true);

-- 8. Customer Addresses
CREATE POLICY "Allow authenticated insert" ON customer_addresses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON customer_addresses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON customer_addresses FOR DELETE TO authenticated USING (true);

-- 9. Payments
-- CREATE POLICY "Allow authenticated insert" ON payments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON payments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON payments FOR DELETE TO authenticated USING (true);

-- 10. Inventory Items
CREATE POLICY "Allow authenticated insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON inventory_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON inventory_items FOR DELETE TO authenticated USING (true);

-- 11. Inventory Transactions
CREATE POLICY "Allow authenticated insert" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON inventory_transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON inventory_transactions FOR DELETE TO authenticated USING (true);

-- 12. Suppliers
CREATE POLICY "Allow authenticated insert" ON suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON suppliers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON suppliers FOR DELETE TO authenticated USING (true);

-- 13. Recipes
CREATE POLICY "Allow authenticated insert" ON recipes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON recipes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON recipes FOR DELETE TO authenticated USING (true);

-- 14. Recipe Items
CREATE POLICY "Allow authenticated insert" ON recipe_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON recipe_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON recipe_items FOR DELETE TO authenticated USING (true);

-- 15. Production Batches
CREATE POLICY "Allow authenticated insert" ON production_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON production_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON production_batches FOR DELETE TO authenticated USING (true);

-- 16. Deliveries
CREATE POLICY "Allow authenticated insert" ON deliveries FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON deliveries FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON deliveries FOR DELETE TO authenticated USING (true);

-- 17. Expenses
CREATE POLICY "Allow authenticated insert" ON expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON expenses FOR DELETE TO authenticated USING (true);

-- 18. Notifications
CREATE POLICY "Allow authenticated insert" ON notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update" ON notifications FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON notifications FOR DELETE TO authenticated USING (true);

-- 19. Audit Logs
CREATE POLICY "Allow authenticated insert" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);
-- Audit logs should generally not be updated or deleted, but for development we can allow it
CREATE POLICY "Allow authenticated update" ON audit_logs FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated delete" ON audit_logs FOR DELETE TO authenticated USING (true);
