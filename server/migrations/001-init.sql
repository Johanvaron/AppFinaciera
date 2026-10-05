-- Money is always integer Colombian pesos. Dates are 'YYYY-MM-DD', months 'YYYY-MM'.

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('efectivo', 'ahorros', 'corriente', 'tarjeta', 'billetera')),
  initial_balance INTEGER NOT NULL DEFAULT 0,
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

CREATE TABLE categories (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  "group" TEXT NOT NULL CHECK ("group" IN ('ingresos', 'fijos', 'variables', 'ahorro')),
  color TEXT NOT NULL DEFAULT 'slate',
  archived INTEGER NOT NULL DEFAULT 0 CHECK (archived IN (0, 1))
) STRICT;

CREATE TABLE fixed_expenses (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount >= 0),
  variable_amount INTEGER NOT NULL DEFAULT 0 CHECK (variable_amount IN (0, 1)),
  due_day INTEGER CHECK (due_day BETWEEN 1 AND 31),
  category_id INTEGER NOT NULL REFERENCES categories (id),
  account_id INTEGER REFERENCES accounts (id),
  start_month TEXT NOT NULL,
  end_month TEXT,
  note TEXT NOT NULL DEFAULT '',
  position INTEGER NOT NULL DEFAULT 0
) STRICT;

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY,
  date TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'transfer')),
  account_id INTEGER NOT NULL REFERENCES accounts (id),
  to_account_id INTEGER REFERENCES accounts (id),
  category_id INTEGER REFERENCES categories (id),
  description TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  -- A fixed-expense payment: the month it applies to may differ from the date's month.
  fixed_expense_id INTEGER REFERENCES fixed_expenses (id),
  fixed_month TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((type = 'transfer') = (to_account_id IS NOT NULL)),
  CHECK ((type = 'transfer') = (category_id IS NULL)),
  CHECK ((fixed_expense_id IS NULL) = (fixed_month IS NULL))
) STRICT;

CREATE INDEX transactions_date ON transactions (date);
CREATE INDEX transactions_account ON transactions (account_id);
CREATE INDEX transactions_to_account ON transactions (to_account_id);
CREATE INDEX transactions_category ON transactions (category_id);
CREATE INDEX transactions_fixed ON transactions (fixed_month, fixed_expense_id);

-- Per-month override of a fixed expense: its own expected amount and/or "does not apply this month".
CREATE TABLE fixed_months (
  id INTEGER PRIMARY KEY,
  fixed_id INTEGER NOT NULL REFERENCES fixed_expenses (id),
  month TEXT NOT NULL,
  expected_amount INTEGER CHECK (expected_amount >= 0),
  skipped INTEGER NOT NULL DEFAULT 0 CHECK (skipped IN (0, 1)),
  UNIQUE (fixed_id, month)
) STRICT;

-- A budget applies from `month` onward until a later row replaces it. NULL amount = no budget from then on.
CREATE TABLE budgets (
  id INTEGER PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories (id),
  month TEXT NOT NULL,
  amount INTEGER CHECK (amount >= 0),
  UNIQUE (category_id, month)
) STRICT;
