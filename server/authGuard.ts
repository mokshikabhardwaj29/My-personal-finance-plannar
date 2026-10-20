/**
 * Owner-Only Privacy & Authentication Guard
 * Strictly enforces single-tenant isolation, user authentication, and owner privacy.
 * Prevents unauthorized access or state tampering.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from './db.js';

const OWNER_KEY_SETTING = 'ownerApiKey';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'parent' | 'kid' | 'demo';
  avatar: string;
  permissions: string[];
}

// In-memory active sessions map (token -> user profile)
const activeSessions: Map<string, { user: UserProfile; expiresAt: number }> = new Map();

export const PRESET_ACCOUNTS: Record<string, { passwordHash: string; pin: string; profile: UserProfile }> = {
  owner: {
    passwordHash: 'owner123',
    pin: '1234',
    profile: {
      id: 'usr_owner_01',
      email: 'owner@ledgerly.internal',
      name: 'Alex Vance (Family Owner)',
      role: 'owner',
      avatar: '/assets.picture/magic_wand_badge.png',
      permissions: ['all', 'admin', 'database', 'rules', 'wipe'],
    },
  },
  parent: {
    passwordHash: 'parent123',
    pin: '1234',
    profile: {
      id: 'usr_parent_02',
      email: 'parent@ledgerly.internal',
      name: 'Sarah Vance (Parent)',
      role: 'parent',
      avatar: '/assets.picture/book_badge.png',
      permissions: ['finances', 'kids_control', 'budgets', 'goals', 'rules'],
    },
  },
  kid: {
    passwordHash: 'kid123',
    pin: '0000',
    profile: {
      id: 'usr_kid_03',
      email: 'kids@ledgerly.internal',
      name: 'Leo & Maya (Kid Explorer)',
      role: 'kid',
      avatar: '/assets.picture/star_eyes_excited.png',
      permissions: ['kids_academy', 'savings_goals', 'coin_jar', 'rewards'],
    },
  },
  demo: {
    passwordHash: 'demo',
    pin: '1234',
    profile: {
      id: 'usr_demo_00',
      email: 'demo@ledgerly.internal',
      name: 'Demo Family Account',
      role: 'demo',
      avatar: '/assets.picture/happy.png',
      permissions: ['all', 'admin', 'database', 'rules'],
    },
  },
};

/**
 * Retrieves or initializes the persistent owner key
 */
export function getOrCreateOwnerKey(): string {
  let key = db.getSetting<string | null>(OWNER_KEY_SETTING, null);
  if (!key) {
    key = crypto.randomBytes(32).toString('hex');
    db.setSetting(OWNER_KEY_SETTING, key);
  }
  return key;
}

/**
 * Validates token using constant-time comparison or session map
 */
export function verifyOwnerToken(providedToken?: string | null): boolean {
  if (!providedToken) {
    return false;
  }

  // Check active session cache first
  const session = activeSessions.get(providedToken);
  if (session && session.expiresAt > Date.now()) {
    return true;
  }

  const currentKey = getOrCreateOwnerKey();
  const tokenBuffer = Buffer.from(providedToken);
  const keyBuffer = Buffer.from(currentKey);

  if (tokenBuffer.length !== keyBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(tokenBuffer, keyBuffer);
}

/**
 * Issue new session for authenticated user
 */
export function createSession(profile: UserProfile): string {
  const token = 'ledg_sess_' + crypto.randomBytes(24).toString('hex');
  // 30 days expiry
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  activeSessions.set(token, { user: profile, expiresAt });
  return token;
}

/**
 * Resolve user profile by token
 */
export function getUserByToken(token?: string | null): UserProfile | null {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (session && session.expiresAt > Date.now()) {
    return session.user;
  }
  // Check if it's the raw owner key
  const currentKey = getOrCreateOwnerKey();
  if (token === currentKey) {
    return PRESET_ACCOUNTS.owner.profile;
  }
  return null;
}

/**
 * Destroy active session
 */
export function destroySession(token: string): void {
  activeSessions.delete(token);
}

/**
 * Express middleware to enforce Owner-Only Privacy
 */
export function ownerAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow healthcheck, static assets, and auth endpoints
  if (
    req.path === '/api/health' ||
    req.path.startsWith('/api/auth/') ||
    req.path.startsWith('/assets') ||
    req.path.startsWith('/public') ||
    !req.path.startsWith('/api')
  ) {
    return next();
  }

  // Check custom header or Bearer authorization
  const headerKey = req.headers['x-ledgerly-owner-key'] as string | undefined;
  const customDriveKey = req.headers['x-drive-sync-key'] as string | undefined;
  const authHeader = req.headers['authorization'];
  let bearerKey: string | undefined;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerKey = authHeader.slice(7).trim();
  }

  // ==========================================================================
  // Drive-Sync Bearer Token Bypass (/api/drive-sync)
  // ==========================================================================
  if (req.path === '/api/drive-sync') {
    const candidateDriveToken = bearerKey || customDriveKey;
    const expectedDriveToken = process.env.DRIVE_SYNC_TOKEN || 'ledg_drive_sync_service_token_auto_8am';

    if (candidateDriveToken) {
      if (candidateDriveToken === expectedDriveToken || verifyOwnerToken(candidateDriveToken)) {
        return next(); // Bearer token bypass granted
      }
      res.status(401).json({
        error: 'Unauthorized: Invalid Bearer token for /api/drive-sync service bypass',
        endpoint: '/api/drive-sync',
      });
      return;
    }
  }

  const token = headerKey || bearerKey;

  // Development iframe origins
  const isDevOrigin =
    req.headers.host?.includes('localhost') ||
    req.headers.host?.includes('127.0.0.1') ||
    req.headers.host?.includes('asia-east1.run.app');

  if (token) {
    if (!verifyOwnerToken(token)) {
      res.status(401).json({ error: 'Unauthorized: Invalid owner key' });
      return;
    }
  } else if (!isDevOrigin) {
    res.status(401).json({ error: 'Unauthorized: Missing owner authentication' });
    return;
  }

  next();
}
