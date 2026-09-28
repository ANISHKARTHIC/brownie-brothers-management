-- Add DELETE policy for orders
CREATE POLICY "Allow authenticated delete" ON orders FOR DELETE TO authenticated USING (true);
