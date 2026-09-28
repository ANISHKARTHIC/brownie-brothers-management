CREATE OR REPLACE FUNCTION reverse_transaction(
    p_transaction_id UUID
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_current_balance DECIMAL;
BEGIN
    -- 1. Fetch the transaction
    SELECT * INTO v_tx
    FROM account_transactions
    WHERE id = p_transaction_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Transaction not found';
    END IF;

    -- 2. Check 24-hour limit
    IF v_tx.created_at < (NOW() - INTERVAL '24 hours') THEN
        RAISE EXCEPTION 'Transactions older than 24 hours cannot be deleted';
    END IF;

    -- 3. Lock the account row
    SELECT balance INTO v_current_balance
    FROM store_accounts
    WHERE id = v_tx.account_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Account not found';
    END IF;

    -- 4. Reverse the balance
    IF v_tx.type = 'DEPOSIT' THEN
        UPDATE store_accounts SET balance = balance - v_tx.amount, updated_at = NOW() WHERE id = v_tx.account_id;
    ELSIF v_tx.type = 'WITHDRAWAL' THEN
        UPDATE store_accounts SET balance = balance + v_tx.amount, updated_at = NOW() WHERE id = v_tx.account_id;
    ELSIF v_tx.type = 'INITIAL' THEN
        -- Reversing an initial balance means subtracting it
        UPDATE store_accounts SET balance = balance - v_tx.amount, updated_at = NOW() WHERE id = v_tx.account_id;
    END IF;

    -- 5. Delete the transaction
    DELETE FROM account_transactions WHERE id = p_transaction_id;
END;
$$;
