-- 1. Create Accounts Table
CREATE TABLE IF NOT EXISTS store_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    balance DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Transactions Ledger
CREATE TABLE IF NOT EXISTS account_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES store_accounts(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('INITIAL', 'DEPOSIT', 'WITHDRAWAL')),
    amount DECIMAL(10,2) NOT NULL,
    remarks TEXT NOT NULL,
    performed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create RPC Function to process safely
CREATE OR REPLACE FUNCTION process_transaction(
    p_account_id UUID,
    p_type TEXT,
    p_amount DECIMAL,
    p_remarks TEXT,
    p_user_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance DECIMAL;
BEGIN
    -- Lock the row for update to prevent race conditions
    SELECT balance INTO v_current_balance
    FROM store_accounts
    WHERE id = p_account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;

    IF p_type = 'WITHDRAWAL' AND v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Insert Transaction
    INSERT INTO account_transactions (account_id, type, amount, remarks, performed_by)
    VALUES (p_account_id, p_type, p_amount, p_remarks, p_user_id);

    -- Update Balance
    IF p_type = 'DEPOSIT' THEN
        UPDATE store_accounts SET balance = balance + p_amount, updated_at = NOW() WHERE id = p_account_id;
    ELSIF p_type = 'WITHDRAWAL' THEN
        UPDATE store_accounts SET balance = balance - p_amount, updated_at = NOW() WHERE id = p_account_id;
    END IF;
END;
$$;

-- 4. Set RLS Policies
ALTER TABLE store_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated full access to store_accounts" 
    ON store_accounts FOR ALL TO authenticated USING (true);
    
CREATE POLICY "Allow authenticated full access to account_transactions" 
    ON account_transactions FOR ALL TO authenticated USING (true);

