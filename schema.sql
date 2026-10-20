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

-- 7. Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 8. Families Table
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 9. Family Members Table
CREATE TABLE IF NOT EXISTS family_members (
  user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'parent', 'child')),
  created_at TEXT NOT NULL,
  PRIMARY KEY (user_id, family_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_family_members_role ON family_members(family_id, role);

-- 10. Parent-Child Links Table
CREATE TABLE IF NOT EXISTS parent_child_links (
  parent_user_id TEXT NOT NULL,
  child_user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (parent_user_id, child_user_id),
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (child_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

-- 11. Sessions Table (Hashed Session Tokens)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  family_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL,
  ip TEXT,
  user_agent TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 12. Email Tokens Table
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verify', 'reset')),
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup ON email_tokens(token_hash, type);

-- 13. User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  date_of_birth TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer_not_to_say') OR gender IS NULL),
  interests TEXT NOT NULL DEFAULT '[]',
  preferences TEXT NOT NULL DEFAULT '{}',
  onboarding_completed_at TEXT,
  quick_pin_hash TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Consents Table (DPDP Act 2023 Parental Consent)
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  child_user_id TEXT NOT NULL,
  parent_user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  ip TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (child_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consents_child ON consents(child_user_id, revoked_at);

-- 15. Audit Log Table
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  family_id TEXT,
  ip TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_log(family_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id, action);

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
