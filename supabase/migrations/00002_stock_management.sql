-- ============================================================
-- Migration 00002: Stock management (recipes, atomic stock RPCs, seed)
-- Run in Supabase SQL editor. Idempotent.
-- ============================================================

-- 1. Free-form stock recipes (e.g. "Fudge Brownie Tray")
CREATE TABLE IF NOT EXISTS stock_recipes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL UNIQUE,
  emoji       TEXT NOT NULL DEFAULT '🍫',
  yield_label TEXT NOT NULL DEFAULT 'batch',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_recipe_items (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipe_id         UUID NOT NULL REFERENCES stock_recipes(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity          DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  UNIQUE (recipe_id, inventory_item_id)
);

CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inv_tx_item ON inventory_transactions(inventory_item_id);

ALTER TABLE stock_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_recipe_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_recipes' AND policyname='auth_only') THEN
    CREATE POLICY "auth_only" ON stock_recipes FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stock_recipe_items' AND policyname='auth_only') THEN
    CREATE POLICY "auth_only" ON stock_recipe_items FOR ALL USING (auth.role() = 'authenticated');
  END IF;
  -- Make sure inventory tables are writable by signed-in users
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_items' AND cmd IN ('ALL','INSERT')) THEN
    CREATE POLICY "Allow authenticated insert" ON inventory_items FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_items' AND cmd IN ('ALL','UPDATE')) THEN
    CREATE POLICY "Allow authenticated update" ON inventory_items FOR UPDATE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_items' AND cmd IN ('ALL','DELETE')) THEN
    CREATE POLICY "Allow authenticated delete" ON inventory_items FOR DELETE TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inventory_transactions' AND cmd IN ('ALL','INSERT')) THEN
    CREATE POLICY "Allow authenticated insert" ON inventory_transactions FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
END $$;

-- 2. Atomic stock adjustment (row-locked, logged). p_delta is signed.
--    Types: IN (restock), OUT (usage), ADJUSTMENT (manual +/-), WASTAGE.
CREATE OR REPLACE FUNCTION adjust_stock(
  p_item  UUID,
  p_delta DECIMAL,
  p_type  inventory_transaction_type,
  p_notes TEXT DEFAULT NULL,
  p_ref   UUID DEFAULT NULL
) RETURNS DECIMAL
LANGUAGE plpgsql AS $$
DECLARE
  v_new DECIMAL;
BEGIN
  IF p_delta = 0 THEN RAISE EXCEPTION 'Quantity cannot be zero'; END IF;

  UPDATE inventory_items
     SET current_stock = current_stock + p_delta
   WHERE id = p_item AND current_stock + p_delta >= 0
   RETURNING current_stock INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'Not enough stock (or item not found)';
  END IF;

  INSERT INTO inventory_transactions(inventory_item_id, transaction_type, quantity, reference_id, notes, created_by)
  VALUES (p_item, p_type,
          CASE WHEN p_type = 'ADJUSTMENT' THEN p_delta ELSE abs(p_delta) END,
          p_ref, p_notes, auth.uid());

  RETURN v_new;
END $$;

-- 3. Use a recipe N times: deducts every ingredient atomically, or nothing.
CREATE OR REPLACE FUNCTION use_recipe(p_recipe UUID, p_batches DECIMAL)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  r   RECORD;
  v_name TEXT;
  v_note TEXT;
BEGIN
  IF p_batches IS NULL OR p_batches <= 0 THEN RAISE EXCEPTION 'Batches must be > 0'; END IF;
  SELECT name INTO v_name FROM stock_recipes WHERE id = p_recipe;
  IF v_name IS NULL THEN RAISE EXCEPTION 'Recipe not found'; END IF;
  v_note := 'Recipe: ' || v_name || ' × ' || trim(trailing '.' from trim(trailing '0' from p_batches::text));

  FOR r IN SELECT inventory_item_id, quantity FROM stock_recipe_items WHERE recipe_id = p_recipe LOOP
    PERFORM adjust_stock(r.inventory_item_id, -(r.quantity * p_batches), 'OUT', v_note, p_recipe);
  END LOOP;
END $$;

-- 4. Seed default ingredients + recipes (only if missing)
INSERT INTO inventory_items (name, category, unit, current_stock, min_stock, max_stock)
SELECT v.name, 'INGREDIENT', v.unit, v.stock, v.min, v.max
FROM (VALUES
  ('Chocolate',   'kg',  5,   1,   10),
  ('Butter',      'kg',  4,   1,   8),
  ('Sugar',       'kg',  8,   2,   15),
  ('Eggs',        'pcs', 60,  12,  120),
  ('Vanilla',     'ml',  250, 50,  500),
  ('Maida',       'kg',  10,  2,   20),
  ('Cocoa',       'kg',  2,   0.5, 5),
  ('Choco Chips', 'kg',  3,   0.5, 6),
  ('Nuts',        'kg',  2,   0.5, 5)
) AS v(name, unit, stock, min, max)
WHERE NOT EXISTS (SELECT 1 FROM inventory_items i WHERE lower(i.name) = lower(v.name));

INSERT INTO stock_recipes (name, emoji, yield_label) VALUES
  ('Fudge Brownie Tray',            '🍫', 'tray'),
  ('Nutty Brownie Tray',            '🥜', 'tray'),
  ('Chocolate Chip Cookies (12 pcs)','🍪', 'batch'),
  ('Cocoa Cake (1 layer)',          '🎂', 'layer')
ON CONFLICT (name) DO NOTHING;

-- Recipe quantities are sensible defaults — edit them in the app (Recipes tab).
INSERT INTO stock_recipe_items (recipe_id, inventory_item_id, quantity)
SELECT r.id, i.id, q.qty
FROM (VALUES
  ('Fudge Brownie Tray','Chocolate',0.25), ('Fudge Brownie Tray','Butter',0.2),
  ('Fudge Brownie Tray','Sugar',0.3),      ('Fudge Brownie Tray','Eggs',4),
  ('Fudge Brownie Tray','Vanilla',5),      ('Fudge Brownie Tray','Maida',0.15),
  ('Fudge Brownie Tray','Cocoa',0.05),     ('Fudge Brownie Tray','Choco Chips',0.1),
  ('Nutty Brownie Tray','Chocolate',0.25), ('Nutty Brownie Tray','Butter',0.2),
  ('Nutty Brownie Tray','Sugar',0.3),      ('Nutty Brownie Tray','Eggs',4),
  ('Nutty Brownie Tray','Vanilla',5),      ('Nutty Brownie Tray','Maida',0.15),
  ('Nutty Brownie Tray','Cocoa',0.05),     ('Nutty Brownie Tray','Nuts',0.1),
  ('Chocolate Chip Cookies (12 pcs)','Butter',0.1), ('Chocolate Chip Cookies (12 pcs)','Sugar',0.1),
  ('Chocolate Chip Cookies (12 pcs)','Eggs',1),     ('Chocolate Chip Cookies (12 pcs)','Vanilla',3),
  ('Chocolate Chip Cookies (12 pcs)','Maida',0.2),  ('Chocolate Chip Cookies (12 pcs)','Choco Chips',0.1),
  ('Cocoa Cake (1 layer)','Maida',0.25), ('Cocoa Cake (1 layer)','Sugar',0.2),
  ('Cocoa Cake (1 layer)','Cocoa',0.05), ('Cocoa Cake (1 layer)','Butter',0.15),
  ('Cocoa Cake (1 layer)','Eggs',3),     ('Cocoa Cake (1 layer)','Vanilla',5)
) AS q(rname, iname, qty)
JOIN stock_recipes r ON r.name = q.rname
JOIN inventory_items i ON lower(i.name) = lower(q.iname)
ON CONFLICT (recipe_id, inventory_item_id) DO NOTHING;
