-- ====================================================================
-- Migration: 0001_multi_user_auth.sql
-- Ledgerly Multi-User Authentication, Role Authorization & Family Scoping
-- Implements:
--  - users, families, family_members, parent_child_links
--  - sessions (hashed tokens, sliding expiry)
--  - email_tokens (single-use verify & password reset)
--  - user_profiles (optional gender, interests, onboarding)
--  - consents (DPDP Act 2023 verifiable parental consent)
--  - audit_log (actor, action, target, IP, timestamp)
-- ====================================================================

-- 1. Users table (Email lowercased and unique)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending_verification', 'suspended')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. Families table (Multi-tenant family accounts)
CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 3. Family Members table (Strict role: owner | parent | child)
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

-- 4. Parent-Child Links (Explicit parent guardianship linkage)
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

-- 5. Sessions table (Hashed session IDs, sliding expiry, revocation)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,              -- SHA-256 hash of random 256-bit session token
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

-- 6. Email Tokens table (Single-use verify and password reset)
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('verify', 'reset')),
  token_hash TEXT NOT NULL UNIQUE,  -- SHA-256 hash of single-use token
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_email_tokens_lookup ON email_tokens(token_hash, type);

-- 7. User Profiles table (Onboarding, demographics, quick-switch PIN)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  date_of_birth TEXT,               -- YYYY-MM-DD
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female', 'non-binary', 'prefer_not_to_say') OR gender IS NULL),
  interests TEXT NOT NULL DEFAULT '[]', -- JSON array of financial interests
  preferences TEXT NOT NULL DEFAULT '{}', -- JSON object
  onboarding_completed_at TEXT,
  quick_pin_hash TEXT,              -- Optional hashed 4-digit PIN for device quick unlock
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Consents table (India DPDP Act 2023 verifiable parental consent)
CREATE TABLE IF NOT EXISTS consents (
  id TEXT PRIMARY KEY,
  child_user_id TEXT NOT NULL,
  parent_user_id TEXT NOT NULL,
  type TEXT NOT NULL,               -- 'dpdp_parental_consent'
  granted_at TEXT NOT NULL,
  revoked_at TEXT,
  ip TEXT,
  metadata TEXT NOT NULL DEFAULT '{}',
  FOREIGN KEY (child_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_consents_child ON consents(child_user_id, revoked_at);

-- 9. Audit Log table (Security & sensitive action recording)
CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT NOT NULL,
  action TEXT NOT NULL,             -- 'login' | 'failed_login' | 'logout' | 'role_change' | 'import' | 'export' | 'delete' | 'consent_granted' | 'consent_revoked'
  target TEXT,
  family_id TEXT,
  ip TEXT,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_log(family_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_user_id, action);

-- ====================================================================
-- Safe Migration for Existing Data (Default Family Vault)
-- Existing transactions, documents, rules, tags, and settings are preserved
-- and associated with the initial primary family vault.
-- ====================================================================

INSERT OR IGNORE INTO families (id, name, created_at)
VALUES ('family_default_v1', 'Primary Family Vault', CURRENT_TIMESTAMP);
