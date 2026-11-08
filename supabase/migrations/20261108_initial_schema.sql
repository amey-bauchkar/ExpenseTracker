-- ==============================================================================
-- DIGITAL HISHOB-KHATA (डिजिटल हिशोब वही) — SUPABASE POSTGRESQL SCHEMA
-- Production database schema with Row Level Security, Triggers & Sync RPCs
-- ==============================================================================

-- 1. ENUMS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM (
        'expense',
        'income',
        'lend',
        'repayment',
        'transfer',
        'writeoff'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. PROFILES & SETTINGS
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    language TEXT NOT NULL DEFAULT 'mr',
    currency TEXT NOT NULL DEFAULT 'INR',
    theme TEXT NOT NULL DEFAULT 'light',
    text_scale SMALLINT NOT NULL DEFAULT 100,
    digits TEXT NOT NULL DEFAULT 'latin',
    fy_start_month SMALLINT NOT NULL DEFAULT 4,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACCOUNTS
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('cash', 'bank', 'upi', 'other')),
    opening_balance_paise BIGINT NOT NULL DEFAULT 0,
    opening_date DATE NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 4. CATEGORIES
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name_mr TEXT,
    name_en TEXT,
    icon TEXT NOT NULL DEFAULT 'Tag',
    color TEXT NOT NULL DEFAULT '#0F766E',
    sort_order INT NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 5. PEOPLE
CREATE TABLE IF NOT EXISTS people (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- 6. TRANSACTIONS (Unified Typed Ledger)
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type transaction_type NOT NULL,
    amount_paise BIGINT NOT NULL CHECK (amount_paise > 0),
    occurred_at TIMESTAMPTZ NOT NULL,
    local_date DATE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    to_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    person_id UUID REFERENCES people(id) ON DELETE RESTRICT,
    counterparty_text TEXT,
    loan_id UUID REFERENCES transactions(id) ON DELETE RESTRICT,
    reason TEXT,
    note TEXT,
    expected_return_date DATE,
    receipt_path TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,

    -- Constraints
    CONSTRAINT chk_expense_account CHECK (
        (type = 'expense' AND account_id IS NOT NULL) OR (type <> 'expense')
    ),
    CONSTRAINT chk_transfer_accounts CHECK (
        (type = 'transfer' AND account_id IS NOT NULL AND to_account_id IS NOT NULL AND account_id <> to_account_id) OR (type <> 'transfer')
    ),
    CONSTRAINT chk_lend_person CHECK (
        (type = 'lend' AND person_id IS NOT NULL AND account_id IS NOT NULL) OR (type <> 'lend')
    ),
    CONSTRAINT chk_repayment_loan CHECK (
        (type = 'repayment' AND person_id IS NOT NULL AND account_id IS NOT NULL AND loan_id IS NOT NULL) OR (type <> 'repayment')
    ),
    CONSTRAINT chk_writeoff_loan CHECK (
        (type = 'writeoff' AND person_id IS NOT NULL AND loan_id IS NOT NULL) OR (type <> 'writeoff')
    ),
    CONSTRAINT chk_no_loan_for_income_expense CHECK (
        (type IN ('income', 'expense') AND loan_id IS NULL) OR (type NOT IN ('income', 'expense'))
    )
);

-- 7. OVER-REPAYMENT PREVENTION TRIGGER
CREATE OR REPLACE FUNCTION trg_check_over_repayment()
RETURNS TRIGGER AS $$
DECLARE
    loan_amount BIGINT;
    already_settled BIGINT;
BEGIN
    IF NEW.type IN ('repayment', 'writeoff') AND NEW.deleted_at IS NULL THEN
        -- Verify loan exists and is a lend
        SELECT amount_paise INTO loan_amount
        FROM transactions
        WHERE id = NEW.loan_id AND type = 'lend' AND deleted_at IS NULL;

        IF loan_amount IS NULL THEN
            RAISE EXCEPTION 'Associated loan not found or not active';
        END IF;

        -- Sum existing repayments and writeoffs (excluding current record if updating)
        SELECT COALESCE(SUM(amount_paise), 0) INTO already_settled
        FROM transactions
        WHERE loan_id = NEW.loan_id
          AND type IN ('repayment', 'writeoff')
          AND deleted_at IS NULL
          AND id <> NEW.id;

        IF (already_settled + NEW.amount_paise) > loan_amount THEN
            RAISE EXCEPTION 'Repayment amount % exceeds remaining loan balance %',
                NEW.amount_paise, (loan_amount - already_settled);
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_repayment ON transactions;
CREATE TRIGGER trg_validate_repayment
    BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION trg_check_over_repayment();

-- 8. INDEXES
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, local_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_type_date ON transactions(user_id, type, local_date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_person ON transactions(user_id, person_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_transactions_loan_id ON transactions(user_id, loan_id) WHERE loan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(user_id, category_id, local_date);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(user_id, account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_updated_at ON transactions(user_id, updated_at);

-- 9. DERIVED LOAN SUMMARY VIEW
CREATE OR REPLACE VIEW view_loan_summary AS
SELECT
    l.id AS loan_id,
    l.user_id,
    l.person_id,
    p.name AS person_name,
    l.occurred_at,
    l.local_date,
    l.amount_paise,
    COALESCE(SUM(CASE WHEN r.type = 'repayment' AND r.deleted_at IS NULL THEN r.amount_paise ELSE 0 END), 0) AS returned_paise,
    COALESCE(SUM(CASE WHEN r.type = 'writeoff' AND r.deleted_at IS NULL THEN r.amount_paise ELSE 0 END), 0) AS written_off_paise,
    (l.amount_paise - COALESCE(SUM(CASE WHEN r.deleted_at IS NULL THEN r.amount_paise ELSE 0 END), 0)) AS remaining_paise,
    CASE
        WHEN (l.amount_paise - COALESCE(SUM(CASE WHEN r.deleted_at IS NULL THEN r.amount_paise ELSE 0 END), 0)) <= 0 THEN 'fully_returned'
        WHEN COALESCE(SUM(CASE WHEN r.deleted_at IS NULL THEN r.amount_paise ELSE 0 END), 0) > 0 THEN 'partially_returned'
        ELSE 'pending'
    END AS status,
    l.reason,
    l.expected_return_date
FROM transactions l
LEFT JOIN people p ON l.person_id = p.id
LEFT JOIN transactions r ON r.loan_id = l.id
WHERE l.type = 'lend' AND l.deleted_at IS NULL
GROUP BY l.id, l.user_id, l.person_id, p.name, l.occurred_at, l.local_date, l.amount_paise, l.reason, l.expected_return_date;

-- 10. ROW LEVEL SECURITY (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own settings" ON settings
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own accounts" ON accounts
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own categories" ON categories
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own people" ON people
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own transactions" ON transactions
    FOR ALL USING (auth.uid() = user_id);

-- 11. RPC: SYNC ENGINE (push_changes and pull_changes)
CREATE OR REPLACE FUNCTION push_changes(changes JSONB)
RETURNS JSONB AS $$
DECLARE
    item JSONB;
    tbl TEXT;
    action TEXT;
    payload JSONB;
    success_count INT := 0;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(changes)
    LOOP
        tbl := item->>'table_name';
        action := item->>'action';
        payload := item->'payload';

        IF tbl = 'accounts' THEN
            INSERT INTO accounts (id, user_id, name, kind, opening_balance_paise, opening_date, sort_order, archived_at, created_at, updated_at, deleted_at)
            VALUES (
                (payload->>'id')::UUID, (payload->>'user_id')::UUID, payload->>'name', payload->>'kind',
                (payload->>'opening_balance_paise')::BIGINT, (payload->>'opening_date')::DATE,
                (payload->>'sort_order')::INT, (payload->>'archived_at')::TIMESTAMPTZ,
                (payload->>'created_at')::TIMESTAMPTZ, (payload->>'updated_at')::TIMESTAMPTZ,
                (payload->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                opening_balance_paise = EXCLUDED.opening_balance_paise,
                sort_order = EXCLUDED.sort_order,
                archived_at = EXCLUDED.archived_at,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;

        ELSIF tbl = 'categories' THEN
            INSERT INTO categories (id, user_id, name_mr, name_en, icon, color, sort_order, is_default, archived_at, created_at, updated_at, deleted_at)
            VALUES (
                (payload->>'id')::UUID, (payload->>'user_id')::UUID, payload->>'name_mr', payload->>'name_en',
                payload->>'icon', payload->>'color', (payload->>'sort_order')::INT, (payload->>'is_default')::BOOLEAN,
                (payload->>'archived_at')::TIMESTAMPTZ, (payload->>'created_at')::TIMESTAMPTZ,
                (payload->>'updated_at')::TIMESTAMPTZ, (payload->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                name_mr = EXCLUDED.name_mr,
                name_en = EXCLUDED.name_en,
                icon = EXCLUDED.icon,
                color = EXCLUDED.color,
                sort_order = EXCLUDED.sort_order,
                archived_at = EXCLUDED.archived_at,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;

        ELSIF tbl = 'people' THEN
            INSERT INTO people (id, user_id, name, phone, note, created_at, updated_at, deleted_at)
            VALUES (
                (payload->>'id')::UUID, (payload->>'user_id')::UUID, payload->>'name',
                payload->>'phone', payload->>'note',
                (payload->>'created_at')::TIMESTAMPTZ, (payload->>'updated_at')::TIMESTAMPTZ,
                (payload->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                phone = EXCLUDED.phone,
                note = EXCLUDED.note,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;

        ELSIF tbl = 'transactions' THEN
            INSERT INTO transactions (
                id, user_id, type, amount_paise, occurred_at, local_date,
                account_id, to_account_id, category_id, person_id,
                counterparty_text, loan_id, reason, note, expected_return_date,
                receipt_path, device_id, created_at, updated_at, deleted_at
            )
            VALUES (
                (payload->>'id')::UUID, (payload->>'user_id')::UUID, (payload->>'type')::transaction_type,
                (payload->>'amount_paise')::BIGINT, (payload->>'occurred_at')::TIMESTAMPTZ, (payload->>'local_date')::DATE,
                (payload->>'account_id')::UUID, (payload->>'to_account_id')::UUID,
                (payload->>'category_id')::UUID, (payload->>'person_id')::UUID,
                payload->>'counterparty_text', (payload->>'loan_id')::UUID,
                payload->>'reason', payload->>'note', (payload->>'expected_return_date')::DATE,
                payload->>'receipt_path', payload->>'device_id',
                (payload->>'created_at')::TIMESTAMPTZ, (payload->>'updated_at')::TIMESTAMPTZ,
                (payload->>'deleted_at')::TIMESTAMPTZ
            )
            ON CONFLICT (id) DO UPDATE SET
                amount_paise = EXCLUDED.amount_paise,
                occurred_at = EXCLUDED.occurred_at,
                local_date = EXCLUDED.local_date,
                account_id = EXCLUDED.account_id,
                to_account_id = EXCLUDED.to_account_id,
                category_id = EXCLUDED.category_id,
                person_id = EXCLUDED.person_id,
                counterparty_text = EXCLUDED.counterparty_text,
                loan_id = EXCLUDED.loan_id,
                reason = EXCLUDED.reason,
                note = EXCLUDED.note,
                expected_return_date = EXCLUDED.expected_return_date,
                receipt_path = EXCLUDED.receipt_path,
                updated_at = EXCLUDED.updated_at,
                deleted_at = EXCLUDED.deleted_at;
        END IF;

        success_count := success_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'applied_count', success_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
