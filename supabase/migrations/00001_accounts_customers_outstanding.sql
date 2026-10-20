-- ============================================================
-- Migration 00001: Multi-account support + Customer Outstanding
-- ============================================================

-- 1. Add account_type to store_accounts (if column doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'store_accounts' AND column_name = 'account_type'
  ) THEN
    ALTER TABLE store_accounts
      ADD COLUMN account_type TEXT NOT NULL DEFAULT 'CASH'
      CHECK (account_type IN ('CASH', 'BANK', 'UPI', 'OTHER'));
  END IF;
END $$;

-- 2. Create customer_outstanding table
CREATE TABLE IF NOT EXISTS customer_outstanding (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id   UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  amount        DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  description   TEXT NOT NULL,
  is_settled    BOOLEAN NOT NULL DEFAULT false,
  settled_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Index for fast customer lookups
CREATE INDEX IF NOT EXISTS idx_customer_outstanding_customer
  ON customer_outstanding(customer_id, is_settled);

-- 4. Enable Row Level Security
ALTER TABLE customer_outstanding ENABLE ROW LEVEL SECURITY;

-- 5. RLS policy: authenticated users can do everything
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'customer_outstanding' AND policyname = 'auth_only'
  ) THEN
    CREATE POLICY "auth_only" ON customer_outstanding
      FOR ALL USING (auth.role() = 'authenticated');
  END IF;
END $$;
