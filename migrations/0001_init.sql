-- Historial compartido de gastos y liquidaciones entre Angel y Nelson.
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('expense', 'settlement')),
  description TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),
  paid_by TEXT NOT NULL CHECK (paid_by IN ('Angel', 'Nelson')),
  contribution REAL NOT NULL,
  -- entre cuántas personas se dividió la cuenta y cuántas partes cubrió
  -- paid_by; null si no se dividió o si vino del escáner de facturas
  split_people INTEGER,
  split_paid_parts INTEGER,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS records_created_at ON records (created_at);
