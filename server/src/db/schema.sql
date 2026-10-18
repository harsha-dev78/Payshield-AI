-- PayShield AI SQLite Schema
-- Designed for tamper-evident audit trails and evidence persistence

CREATE TABLE IF NOT EXISTS transactions (
  order_id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  items_json TEXT NOT NULL,
  telemetry_json TEXT NOT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING',
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  overall_score INTEGER NOT NULL,
  tier TEXT NOT NULL,
  confidence REAL NOT NULL,
  signals_json TEXT NOT NULL,
  factors_json TEXT NOT NULL,
  missing_info_json TEXT NOT NULL,
  counterfactuals_json TEXT NOT NULL,
  recommendation_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  assessed_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES transactions (order_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  details_json TEXT NOT NULL,
  policy_version TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_order ON audit_logs(order_id);
CREATE INDEX IF NOT EXISTS idx_trans_status ON transactions(payment_status);
CREATE INDEX IF NOT EXISTS idx_assessments_tier ON risk_assessments(tier);
