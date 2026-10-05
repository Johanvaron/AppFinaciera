-- A movement paid straight to a debt from one of the accounts ("Abonar"): it lowers the
-- account balance like any expense AND lowers the debt. Fixed-expense payments keep using
-- fixed_expense_id; a movement never carries both links.
ALTER TABLE transactions ADD COLUMN debt_id INTEGER REFERENCES debts (id) ON DELETE SET NULL;

CREATE INDEX transactions_debt ON transactions (debt_id, date);
