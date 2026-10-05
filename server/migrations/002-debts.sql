-- Credit cards and loans. The balance is derived: initial + charges - manual payments - linked fixed-expense payments.
CREATE TABLE debts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('tarjeta', 'prestamo')),
  initial_balance INTEGER NOT NULL CHECK (initial_balance >= 0),
  start_date TEXT NOT NULL,
  fixed_expense_id INTEGER UNIQUE REFERENCES fixed_expenses (id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

-- Hand-entered charges (purchases, interest) and payments made outside the checklist.
CREATE TABLE debt_entries (
  id INTEGER PRIMARY KEY,
  debt_id INTEGER NOT NULL REFERENCES debts (id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cargo', 'abono')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL DEFAULT ''
) STRICT;

CREATE INDEX debt_entries_debt ON debt_entries (debt_id, date);
