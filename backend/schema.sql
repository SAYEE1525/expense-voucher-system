-- Expense Voucher Management System : database schema (SQLite)

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('employee','director','accounts')),
  employee_code TEXT,
  department    TEXT,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS vouchers (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_number     TEXT NOT NULL UNIQUE,
  voucher_date       TEXT NOT NULL,
  expense_date       TEXT NOT NULL,
  department         TEXT NOT NULL,
  title              TEXT NOT NULL,
  category           TEXT,
  description        TEXT,
  amount             REAL NOT NULL CHECK (amount > 0),
  user_id            INTEGER NOT NULL REFERENCES users(id),
  employee_name      TEXT NOT NULL,
  employee_code      TEXT,
  employee_signature TEXT,
  status             TEXT NOT NULL DEFAULT 'Draft'
                     CHECK (status IN ('Draft','Submitted','Pending Approval','Approved','Rejected')),
  director_id        INTEGER REFERENCES users(id),
  director_signature TEXT,
  approval_date      TEXT,
  rejected_at        TEXT,
  rejection_reason   TEXT,
  created_at         TEXT NOT NULL,
  updated_at         TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vouchers_user   ON vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status ON vouchers(status);

-- Audit trail of every state change
CREATE TABLE IF NOT EXISTS voucher_history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  voucher_id INTEGER NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  action     TEXT NOT NULL,
  actor_id   INTEGER REFERENCES users(id),
  actor_name TEXT,
  note       TEXT,
  created_at TEXT NOT NULL
);
