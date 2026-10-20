-- ====================================================================
-- Ledgerly: Cloudflare D1 Idempotent Relational Database Schema
-- Master Specification: Zero Live Seed Records (Empty-Start Contract),
-- Server-Side Idempotency, Append-Only XP Ledger, and Owner Privacy.
-- ====================================================================

-- 1. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,                                       -- ISO YYYY-MM-DD
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL CHECK (amount > 0),                  -- Positive magnitude
  type TEXT NOT NULL CHECK (type IN ('expense', 'income')), -- 'expense' | 'income'
  account TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',                          -- JSON array of tag strings
  receipt INTEGER NOT NULL DEFAULT 0 CHECK (receipt IN (0, 1)),
  source TEXT NOT NULL DEFAULT 'manual',                    -- 'manual' | 'csv' | 'document' | 'google-drive'
  fingerprint TEXT NOT NULL UNIQUE,                         -- date + "/" + merchant.trim().toLowerCase() + " " + amount.toFixed(2) + " " + account.trim().toLowerCase()
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_transactions_account ON transactions(account);
CREATE INDEX IF NOT EXISTS idx_transactions_fingerprint ON transactions(fingerprint);

-- 2. Documents Table (Metadata for Cloudflare R2 bucket storage)
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL CHECK (size >= 0),
  objectKey TEXT NOT NULL UNIQUE,                           -- R2 object storage path
  status TEXT NOT NULL CHECK (status IN ('queued', 'stored', 'review')),
  source TEXT NOT NULL CHECK (source IN ('upload', 'google-drive')),
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_documents_objectkey ON documents(objectKey);
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);

-- 3. Rules Table (Automated Categorization & Tagging Engine)
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  whenText TEXT NOT NULL,
  thenText TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_when ON rules(whenText);

-- 4. Tags Table (Normalized Tag Registry)
CREATE TABLE IF NOT EXISTS tags (
  name TEXT PRIMARY KEY,
  createdAt TEXT NOT NULL
);

-- 5. Settings Table (Configuration Key-Value Store)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,                                      -- JSON string or scalar
  updatedAt TEXT NOT NULL
);

-- 6. Game Events Table (Append-Only Gamification & XP Ledger)
-- Unique refKey enforces server-side idempotency: XP is never awarded twice.
CREATE TABLE IF NOT EXISTS game_events (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                                       -- 'manual-entry' | 'receipt-attached' | 'csv-import' | 'quest' | 'challenge' | 'streak'
  xp INTEGER NOT NULL CHECK (xp >= 0),
  refKey TEXT NOT NULL UNIQUE,                              -- Deduplication key, e.g. "manual:<fingerprint>" or "csv-import:<hash>"
  meta TEXT NOT NULL DEFAULT '{}',                          -- JSON payload of event metadata
  localDate TEXT NOT NULL,                                  -- YYYY-MM-DD in user's configured timezone
  createdAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_events_refkey ON game_events(refKey);
CREATE INDEX IF NOT EXISTS idx_game_events_localdate ON game_events(localDate);
CREATE INDEX IF NOT EXISTS idx_game_events_type ON game_events(type);

-- ====================================================================
-- Default Initial Settings Seed (Empty-Start Configuration Contract)
-- Note: Zero transactions seeded. Only base taxonomy & profile defaults.
-- ====================================================================

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'categories',
  '["Housing","Groceries","Shopping","Dining","Transportation","Utilities","Subscriptions","Insurance","Health","Entertainment","Income","Needs review","Other"]',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'accounts',
  '["Main Checking","Everyday Visa","Rewards Card","Cash"]',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'selectedPeriod',
  '"all-time"',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'gameProfile',
  '{"showPenny":true,"celebrations":true,"sounds":false,"animationLevel":"follow"}',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'freshStart',
  'true',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'netWorthConfigured',
  'false',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'assetsTotal',
  '0',
  CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES (
  'liabilitiesTotal',
  '0',
  CURRENT_TIMESTAMP
);
