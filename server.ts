import express, { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { db, TransactionRow, DocumentRow, RuleRow } from './server/db.js';
import { storage } from './server/storage.js';
import { gameEngine, getUserLocalDate } from './server/gameEngine.js';
import { detectRecurringPatterns } from './server/detectionEngine.js';
import { handleKidsLearn } from './server/kidsTutor.js';
import { computeCanonicalFingerprint } from './server/referenceDatasets.js';
import { authService, UserRole } from './server/authService.js';
import {
  authorizationMiddleware,
  AuthenticatedRequest,
  extractSessionToken,
} from './server/authorizationMiddleware.js';
import { databaseService } from './server/databaseService.js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parsers with support for large documents and Drive batches
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));
app.use(authorizationMiddleware);

// Helper to set secure session cookie
function setSessionCookie(res: Response, token: string) {
  res.cookie('ledgerly_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

// ============================================================================
// Multi-User Identity & Authentication Endpoints
// ============================================================================

// Check whether the primary family vault ownership has been claimed
app.get('/api/auth/claim-status', (_req: Request, res: Response) => {
  const claimed = authService.isOwnershipClaimed();
  res.json({ ownershipClaimed: claimed });
});

// Register a new user (first user claims ownership of the existing family vault)
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, password, displayName } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    const result = await authService.register({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      ip: req.ip,
      baseUrl,
    });

    setSessionCookie(res, result.sessionToken);

    res.json({
      success: true,
      sessionToken: result.sessionToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: Boolean(result.user.emailVerifiedAt),
        status: result.user.status,
      },
      profile: result.profile,
      family: result.family,
      role: result.role,
    });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Registration failed' });
  }
});

// Sign in with email and password
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    const result = await authService.login({
      email,
      password,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });

    setSessionCookie(res, result.sessionToken);

    res.json({
      success: true,
      sessionToken: result.sessionToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: Boolean(result.user.emailVerifiedAt),
        status: result.user.status,
      },
      profile: result.profile,
      family: result.family,
      role: result.role,
    });
  } catch (err: unknown) {
    res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid email or password' });
  }
});

// Quick PIN unlock on an already trusted device
app.post('/api/auth/pin-unlock', async (req: Request, res: Response) => {
  try {
    const { userId, pin } = req.body || {};
    if (!userId || !pin) {
      res.status(400).json({ error: 'User ID and 4-digit PIN are required' });
      return;
    }

    const result = await authService.unlockWithPin({
      userId,
      pin,
      ip: req.ip,
    });

    setSessionCookie(res, result.sessionToken);

    res.json({
      success: true,
      sessionToken: result.sessionToken,
      user: {
        id: result.user.id,
        email: result.user.email,
        emailVerified: Boolean(result.user.emailVerifiedAt),
        status: result.user.status,
      },
      profile: result.profile,
      family: result.family,
      role: result.role,
    });
  } catch (err: unknown) {
    res.status(401).json({ error: err instanceof Error ? err.message : 'PIN unlock failed' });
  }
});

// Verify email address via single-use token
app.post('/api/auth/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body || {};
    if (!token) {
      res.status(400).json({ error: 'Verification token is required' });
      return;
    }

    const result = await authService.verifyEmail(token, req.ip);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Verification failed' });
  }
});

// Request password reset email
app.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    const host = req.get('host') || 'localhost:3000';
    const protocol = req.protocol || 'http';
    const baseUrl = `${protocol}://${host}`;

    await authService.requestPasswordReset(email, baseUrl, req.ip);
    res.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been dispatched.',
    });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to request password reset' });
  }
});

// Reset password with single-use token (invalidates all existing sessions)
app.post('/api/auth/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body || {};
    if (!token || !newPassword) {
      res.status(400).json({ error: 'Token and new password are required' });
      return;
    }

    const result = await authService.resetPassword(token, newPassword, req.ip);
    res.clearCookie('ledgerly_session');
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Password reset failed' });
  }
});

// Safe session-status endpoint: reports whether caller is authenticated without exposing private financial data
app.get('/api/auth/session', (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth) {
    res.json({
      authenticated: false,
      user: null,
      profile: null,
      family: null,
      role: null,
    });
    return;
  }

  res.json({
    authenticated: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      emailVerified: Boolean(auth.user.emailVerifiedAt),
      status: auth.user.status,
    },
    profile: auth.profile,
    family: auth.family,
    role: auth.role,
  });
});

// Fetch caller's authenticated user profile & family details
app.get('/api/auth/me', (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  res.json({
    authenticated: true,
    user: {
      id: auth.user.id,
      email: auth.user.email,
      emailVerified: Boolean(auth.user.emailVerifiedAt),
      status: auth.user.status,
    },
    profile: auth.profile,
    family: auth.family,
    role: auth.role,
  });
});

// First-login onboarding (demographics, optional gender, interests, quick PIN)
app.post('/api/auth/onboarding', async (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const { displayName, dateOfBirth, age, gender, interests, preferences, quickPin } = req.body || {};

    const updatedProfile = await authService.completeOnboarding(
      auth.user.id,
      {
        displayName,
        dateOfBirth,
        age,
        gender: gender || null, // Optional, never forced
        interests: Array.isArray(interests) ? interests : [],
        preferences: typeof preferences === 'object' ? preferences : {},
        quickPin,
      },
      req.ip
    );

    res.json({ success: true, profile: updatedProfile });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to complete onboarding' });
  }
});

// Logout endpoint (invalidates session and clears cookie)
app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = extractSessionToken(req);
  if (token) {
    authService.logout(token, req.ip);
  }
  res.clearCookie('ledgerly_session');
  res.json({ success: true, message: 'Signed out successfully' });
});

// ============================================================================
// Family & Child Account Management (India DPDP Act 2023 Compliant)
// ============================================================================

// List all family members
app.get('/api/family/members', (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const members = authService.getFamilyMembersWithProfiles(auth.family.id);
  res.json({ family: auth.family, members });
});

// Parent/Owner creates child account with mandatory verifiable parental consent
app.post('/api/family/children', async (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const { displayName, age, dateOfBirth, quickPin, parentalConsentGranted } = req.body || {};

    const result = await authService.createChildAccount(auth.user.id, {
      displayName,
      age: Number(age) || 10,
      dateOfBirth,
      quickPin,
      parentalConsentGranted: Boolean(parentalConsentGranted),
      ip: req.ip,
    });

    res.json({
      success: true,
      childUser: {
        id: result.childUser.id,
        email: result.childUser.email,
      },
      childProfile: result.childProfile,
      consent: result.consent,
    });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to create child account' });
  }
});

// Parent/Owner revokes consent and deletes child data
app.delete('/api/family/children/:id', (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const childId = req.params.id;
    const result = authService.revokeChildConsentAndDelete(auth.user.id, childId, req.ip);
    res.json(result);
  } catch (err: unknown) {
    res.status(403).json({ error: err instanceof Error ? err.message : 'Failed to revoke child consent' });
  }
});

// Owner invites new family member (parent or child)
app.post('/api/family/invites', async (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const { email, role, displayName } = req.body || {};
    const result = await authService.inviteMember(auth.user.id, {
      email,
      role: role || 'parent',
      displayName,
      ip: req.ip,
    });

    res.json({
      success: true,
      user: {
        id: result.memberUser.id,
        email: result.memberUser.email,
      },
      profile: result.memberProfile,
    });
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to invite family member' });
  }
});

// Owner removes family member
app.delete('/api/family/members/:id', (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    if (!auth) {
      res.status(401).json({ error: 'Unauthenticated' });
      return;
    }

    const targetUserId = req.params.id;
    const result = authService.removeMember(auth.user.id, targetUserId, req.ip);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to remove family member' });
  }
});

// Owner views family security audit log
app.get('/api/family/audit-log', (req: Request, res: Response) => {
  const auth = (req as AuthenticatedRequest).auth;
  if (!auth) {
    res.status(401).json({ error: 'Unauthenticated' });
    return;
  }

  const logs = authService.getFamilyAuditLogs(auth.family.id);
  res.json({ logs });
});

// ============================================================================
// Cloudflare D1 Database Introspection & SQL Query Endpoints
// ============================================================================

// Get high-level database health, Cloudflare D1 status, R2 bucket stats, and table summaries
app.get('/api/database/status', async (_req: Request, res: Response) => {
  try {
    const status = await databaseService.getStatus();
    res.json(status);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to fetch database status' });
  }
});

// Get table rows with pagination and search
app.get('/api/database/tables/:tableName', (req: Request, res: Response) => {
  try {
    const { tableName } = req.params;
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const search = (req.query.search as string) || '';

    const data = databaseService.getTableRows(tableName, { page, limit, search });
    res.json(data);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Failed to query table' });
  }
});

// Execute interactive SQL queries against D1
app.post('/api/database/query', (req: Request, res: Response) => {
  try {
    const { sql } = req.body || {};
    if (!sql || typeof sql !== 'string') {
      res.status(400).json({ error: 'SQL query string is required' });
      return;
    }
    const result = databaseService.executeQuery(sql);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Query execution error' });
  }
});

// Run live 31-test verification suite
app.post('/api/database/verify', async (_req: Request, res: Response) => {
  try {
    const result = await databaseService.runVerificationSuite();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Verification suite execution error' });
  }
});

// Multer memory storage for uploads (up to 20MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB
  },
});

// Initialize default settings if fresh
const existingCategories = db.getSetting<string[] | null>('categories', null);
if (!existingCategories) {
  db.wipeAllData(new Date().toISOString());
}

// Helper: apply categorization rules to transaction
function applyRulesToTransaction(tx: Partial<TransactionRow>, rules: RuleRow[]): void {
  const enabledRules = rules.filter((r) => r.enabled === 1);
  const merchantLower = (tx.merchant || '').toLowerCase();

  for (const rule of enabledRules) {
    const whenLower = rule.whenText.toLowerCase().trim();
    if (merchantLower.includes(whenLower)) {
      const thenText = rule.thenText.trim();
      // Check if thenText specifies category or tag
      // If it mentions "tag: xyz" or starts with "tag", add to tags
      if (thenText.toLowerCase().startsWith('tag:')) {
        const tagName = thenText.slice(4).trim();
        if (tagName && !tx.tags?.includes(tagName)) {
          tx.tags = [...(tx.tags || []), tagName];
        }
      } else {
        tx.category = thenText;
      }
      break;
    }
  }
}

// ----------------------------------------------------
// 1. GET /api/state
// ----------------------------------------------------
app.get('/api/state', (req: Request, res: Response) => {
  try {
    const auth = (req as AuthenticatedRequest).auth;
    const isChild = auth?.role === 'child';

    const game = gameEngine.getFullGameState();
    const settings = db.getAllSettings();

    if (isChild) {
      // Child-Safe Scoped State: No family bank accounts, transactions, or receipts
      return res.json({
        transactions: [],
        tags: [],
        rules: [],
        settings: {
          categories: ['Savings Jar', 'Dream Goals'],
          accounts: ['My Digital Coin Jar'],
          goals: settings.goals || [],
          gameProfile: settings.gameProfile || {},
          selectedPeriod: 'all-time',
        },
        documents: [],
        game,
        detected: { recurring: [], subscriptions: [] },
      });
    }

    // Owner and Parent get full family vault financial state
    const transactions = db.getTransactions(5000);
    const tags = db.getTags();
    const rules = db.getRules();
    const documents = db.getDocuments(100);

    const dismissedPatterns = (settings.dismissedPatterns as string[]) || [];
    const detected = detectRecurringPatterns(transactions, dismissedPatterns);

    res.json({
      transactions,
      tags,
      rules,
      settings,
      documents,
      game,
      detected,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error fetching state:', err);
    res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 2. POST /api/transactions
// ----------------------------------------------------
app.post('/api/transactions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    const items: Array<Record<string, unknown>> = Array.isArray(body) ? body : [body];

    if (items.length === 0) {
      return res.status(400).json({ error: 'No transaction data provided' });
    }

    const rules = db.getRules();
    const savedTransactions: TransactionRow[] = [];
    let duplicates = 0;
    const nowIso = new Date().toISOString();
    const userTimezone = db.getSetting<string>('userTimezone', 'America/Los_Angeles');
    const todayLocalDate = getUserLocalDate(userTimezone);

    for (const item of items) {
      const merchant = String(item.merchant || '').trim();
      const amount = Number(item.amount);
      const date = String(item.date || '').trim(); // YYYY-MM-DD
      const type = item.type === 'income' ? 'income' : 'expense';
      const account = String(item.account || 'Imported account').trim();
      let category = String(item.category || 'Needs review').trim();
      const source = String(item.source || 'manual').trim();
      const receipt = item.receipt ? 1 : 0;

      // Validation
      if (!merchant) {
        return res.status(400).json({ error: 'Merchant or source is required' });
      }
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required' });
      }
      if (isNaN(amount) || amount <= 0 || !isFinite(amount)) {
        return res.status(400).json({ error: 'Amount must be a positive finite number' });
      }

      // Normalize tags: trim, remove blanks, deduplicate case-insensitively
      const rawTags: string[] = Array.isArray(item.tags) ? item.tags : [];
      const normalizedTags: string[] = [];
      const seenTagSet = new Set<string>();
      for (const t of rawTags) {
        const cleaned = String(t || '').trim();
        if (cleaned && !seenTagSet.has(cleaned.toLowerCase())) {
          seenTagSet.add(cleaned.toLowerCase());
          normalizedTags.push(cleaned);
          db.insertTag(cleaned);
        }
      }

      // Duplicate fingerprint: date + "/" + merchant.trim().toLowerCase() + " " + amount.toFixed(2) + " " + account.trim().toLowerCase()
      const fingerprint = computeCanonicalFingerprint(date, merchant, amount, account);

      if (db.hasTransactionFingerprint(fingerprint)) {
        duplicates++;
        continue;
      }

      const txRow: TransactionRow = {
        id: crypto.randomUUID(),
        date,
        merchant,
        category,
        amount,
        type,
        account,
        tags: normalizedTags,
        receipt,
        source,
        fingerprint,
        createdAt: nowIso,
      };

      // Apply rules after duplicate check
      applyRulesToTransaction(txRow, rules);

      if (db.insertTransaction(txRow)) {
        savedTransactions.push(txRow);
      } else {
        duplicates++;
      }
    }

    // Gamification awards (Server-side, idempotent)
    let totalXpAwarded = 0;
    let lastGameDelta = null;

    if (savedTransactions.length > 0) {
      if (items.length === 1 && items[0].source !== 'csv') {
        const single = savedTransactions[0];
        // Single manual transaction: 10 XP
        const manualRef = `manual:${single.fingerprint}`;
        const delta = gameEngine.awardAction('manual-entry', 10, manualRef, {
          merchant: single.merchant,
          amount: single.amount,
        });
        totalXpAwarded += delta.xpAwarded;
        lastGameDelta = delta;

        // If receipt attached: 5 XP
        if (single.receipt === 1) {
          const receiptRef = `receipt:${single.id}`;
          const rDelta = gameEngine.awardAction('receipt-attached', 5, receiptRef, {
            txId: single.id,
          });
          totalXpAwarded += rDelta.xpAwarded;
          gameEngine.unlockBadge('paper-trail', rDelta.newBadges);
          lastGameDelta = rDelta;
        }

        gameEngine.unlockBadge('first-step', lastGameDelta.newBadges);
      } else {
        // CSV Batch import: 20 base + 1 per newly inserted up to +30
        const batchBase = 20;
        const perTx = Math.min(30, savedTransactions.length);
        const csvBatchRef = `csv-import:${savedTransactions[0].fingerprint}:${savedTransactions.length}`;
        const delta = gameEngine.awardAction('csv-import', batchBase + perTx, csvBatchRef, {
          count: savedTransactions.length,
        });
        totalXpAwarded += delta.xpAwarded;
        gameEngine.unlockBadge('first-step', delta.newBadges);
        gameEngine.unlockBadge('importer', delta.newBadges);
        lastGameDelta = delta;
      }
    }

    if (!lastGameDelta) {
      // Recompute without delta
      const full = gameEngine.getFullGameState();
      lastGameDelta = {
        xpAwarded: 0,
        totalXp: full.totalXp,
        level: full.level,
        levelTitle: full.levelTitle,
        leveledUp: false,
        newBadges: [],
        questsCompleted: [],
        streak: {
          current: full.currentStreak,
          longest: full.longestStreak,
          extendedToday: false,
        },
        pendingCelebration: false,
      };
    }

    return res.json({
      inserted: savedTransactions.length,
      duplicates,
      transactions: savedTransactions,
      gameDelta: lastGameDelta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error inserting transactions:', err);
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 3. PATCH /api/transactions
// ----------------------------------------------------
app.patch('/api/transactions', (req: Request, res: Response) => {
  try {
    const { id, category, tags, receipt } = req.body;
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const existing = db.getTransactionById(id);
    if (!existing) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const updates: Partial<TransactionRow> = {};
    let wasNeedsReview = existing.category === 'Needs review';
    let hadTagsCount = existing.tags.length;

    if (typeof category === 'string' && category.trim()) {
      updates.category = category.trim();
    }

    if (Array.isArray(tags)) {
      const normalized: string[] = [];
      const seen = new Set<string>();
      for (const t of tags) {
        const c = String(t || '').trim();
        if (c && !seen.has(c.toLowerCase())) {
          seen.add(c.toLowerCase());
          normalized.push(c);
          db.insertTag(c);
        }
      }
      updates.tags = normalized;
    }

    if (receipt !== undefined) {
      updates.receipt = receipt ? 1 : 0;
    }

    const updated = db.updateTransaction(id, updates);
    if (!updated) {
      return res.status(500).json({ error: 'Failed to update transaction' });
    }

    // Gamification rewards for categorization & tags
    let gameDelta = null;

    if (wasNeedsReview && updated.category !== 'Needs review') {
      const catRef = `cat:${updated.id}`;
      gameDelta = gameEngine.awardAction('categorize', 5, catRef, {
        txId: updated.id,
        category: updated.category,
      });

      // Check if all needs review items are cleared
      const remainingReviews = db.getTransactions().filter((t) => t.category === 'Needs review').length;
      if (remainingReviews === 0) {
        const userTimezone = db.getSetting<string>('userTimezone', 'America/Los_Angeles');
        const todayDate = getUserLocalDate(userTimezone);
        const clearRef = `inbox-cleared:${todayDate}`;
        const clearDelta = gameEngine.awardAction('review-inbox-cleared', 20, clearRef, { date: todayDate });
        gameEngine.unlockBadge('tidy-ledger', clearDelta.newBadges);
        gameDelta = clearDelta;
      }
    }

    if (updated.tags.length > hadTagsCount) {
      const tagRef = `tag:${updated.id}:${updated.tags.length}`;
      const tDelta = gameEngine.awardAction('tag', 2, tagRef, { txId: updated.id });
      if (!gameDelta) gameDelta = tDelta;

      // Check Tag Team badge (applied tags to 10 transactions)
      const allTxs = db.getTransactions();
      const taggedCount = allTxs.filter((t) => t.tags && t.tags.length > 0).length;
      if (taggedCount >= 10) {
        gameEngine.unlockBadge('tag-team', gameDelta.newBadges);
      }
    }

    if (!gameDelta) {
      const full = gameEngine.getFullGameState();
      gameDelta = {
        xpAwarded: 0,
        totalXp: full.totalXp,
        level: full.level,
        levelTitle: full.levelTitle,
        leveledUp: false,
        newBadges: [],
        questsCompleted: [],
        streak: { current: full.currentStreak, longest: full.longestStreak, extendedToday: false },
        pendingCelebration: false,
      };
    }

    return res.json({
      transaction: updated,
      gameDelta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error updating transaction:', err);
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 4. DELETE /api/transactions
// ----------------------------------------------------
app.delete('/api/transactions', (req: Request, res: Response) => {
  try {
    const id = String(req.query.id || req.body?.id || '').trim();
    if (!id) {
      return res.status(400).json({ error: 'Transaction ID is required' });
    }

    const success = db.deleteTransaction(id);
    if (!success) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 5. PUT /api/preferences
// ----------------------------------------------------
app.put('/api/preferences', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    let gameDelta = null;

    // Save individual preference groups without resetting others
    if (body.categories !== undefined && Array.isArray(body.categories)) {
      db.setSetting('categories', body.categories);
    }

    if (body.accounts !== undefined && Array.isArray(body.accounts)) {
      db.setSetting('accounts', body.accounts);
    }

    if (body.selectedPeriod !== undefined && typeof body.selectedPeriod === 'string') {
      db.setSetting('selectedPeriod', body.selectedPeriod);
    }

    // NotePay planner settings are stored alongside existing preferences; never replace the full state.
    if (body.notePayPlanner !== undefined && body.notePayPlanner && typeof body.notePayPlanner === 'object' && !Array.isArray(body.notePayPlanner)) {
      const planner = body.notePayPlanner as Record<string, unknown>;
      const allowance = Number(planner.allowance);
      const savingsGoal = Number(planner.savingsGoal);
      const savedAmount = Number(planner.savedAmount);
      const dailyPlan = Number(planner.dailyPlan);
      const note = typeof planner.note === 'string' ? planner.note.slice(0, 100) : '';
      if ([allowance, savingsGoal, savedAmount, dailyPlan].every((value) => Number.isFinite(value) && value >= 0 && value <= 100000000)) {
        db.setSetting('notePayPlanner', { allowance, savingsGoal, savedAmount, dailyPlan, note });
      } else {
        return res.status(400).json({ error: 'Invalid pocket-money planner values' });
      }
    }

    if (body.userTimezone !== undefined && typeof body.userTimezone === 'string') {
      db.setSetting('userTimezone', body.userTimezone);
    }

    if (body.gameProfile !== undefined && typeof body.gameProfile === 'object') {
      db.setSetting('gameProfile', body.gameProfile);
    }

    if (body.dismissedPatterns !== undefined && Array.isArray(body.dismissedPatterns)) {
      db.setSetting('dismissedPatterns', body.dismissedPatterns);
    }

    // Rules
    if (body.rule !== undefined && typeof body.rule === 'object') {
      const r = body.rule;
      const ruleRow: RuleRow = {
        id: r.id || crypto.randomUUID(),
        whenText: String(r.whenText || '').trim(),
        thenText: String(r.thenText || '').trim(),
        enabled: r.enabled !== false ? 1 : 0,
        createdAt: new Date().toISOString(),
      };
      db.insertRule(ruleRow);
      // Award 10 XP for creating rule
      const ruleRef = `rule:${ruleRow.id}`;
      gameDelta = gameEngine.awardAction('create-rule', 10, ruleRef, { ruleId: ruleRow.id });
      gameEngine.unlockBadge('rule-maker', gameDelta.newBadges);
    }

    // Budgets
    if (body.budgets !== undefined && Array.isArray(body.budgets)) {
      const prevBudgets = db.getSetting<unknown[]>('budgets', []);
      db.setSetting('budgets', body.budgets);

      if (body.budgets.length > prevBudgets.length) {
        const latest = body.budgets[body.budgets.length - 1];
        const budgetRef = `budget:${latest.id || latest.category}`;
        gameDelta = gameEngine.awardAction('create-budget', 15, budgetRef, { category: latest.category });
        gameEngine.unlockBadge('budget-builder', gameDelta.newBadges);
      }
    }

    // Goals
    if (body.goals !== undefined && Array.isArray(body.goals)) {
      const prevGoals = db.getSetting<Array<{ id: string; current: number; target: number }>>('goals', []);
      db.setSetting('goals', body.goals);

      // Check if goal created or progress updated
      if (body.goals.length > prevGoals.length) {
        const latest = body.goals[body.goals.length - 1];
        const goalRef = `goal:${latest.id || latest.name}`;
        gameDelta = gameEngine.awardAction('create-goal', 15, goalRef, { name: latest.name });
        gameEngine.unlockBadge('goal-getter', gameDelta.newBadges);
      } else {
        // Check for progress updates & milestones
        for (const g of body.goals) {
          const oldG = prevGoals.find((p) => p.id === g.id);
          if (oldG && g.current > oldG.current) {
            const progRef = `goal-progress:${g.id}:${g.current}`;
            gameDelta = gameEngine.awardAction('goal-progress', 5, progRef, { goalId: g.id, current: g.current });

            const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
            if (pct >= 25) {
              const m25 = `goal-milestone:${g.id}:25`;
              if (!db.hasGameEventRefKey(m25)) {
                gameEngine.awardAction('goal-milestone', 20, m25, { goalId: g.id, milestone: 25 });
                gameEngine.unlockBadge('quarter-mile', gameDelta.newBadges);
              }
            }
            if (pct >= 50) {
              const m50 = `goal-milestone:${g.id}:50`;
              if (!db.hasGameEventRefKey(m50)) gameEngine.awardAction('goal-milestone', 30, m50, { goalId: g.id, milestone: 50 });
            }
            if (pct >= 75) {
              const m75 = `goal-milestone:${g.id}:75`;
              if (!db.hasGameEventRefKey(m75)) gameEngine.awardAction('goal-milestone', 40, m75, { goalId: g.id, milestone: 75 });
            }
            if (pct >= 100) {
              const m100 = `goal-milestone:${g.id}:100`;
              if (!db.hasGameEventRefKey(m100)) {
                gameEngine.awardAction('goal-milestone', 100, m100, { goalId: g.id, milestone: 100 });
                gameEngine.unlockBadge('finish-line', gameDelta.newBadges);
              }
            }
          }
        }
      }
    }

    // Subscriptions & Recurring confirmed
    if (body.subscriptions !== undefined && Array.isArray(body.subscriptions)) {
      db.setSetting('subscriptions', body.subscriptions);
    }

    if (body.recurring !== undefined && Array.isArray(body.recurring)) {
      db.setSetting('recurring', body.recurring);
    }

    // Keep pattern suggestion award
    if (body.keptPatternKey && typeof body.keptPatternKey === 'string') {
      const keepRef = `keep-suggestion:${body.keptPatternKey}`;
      gameDelta = gameEngine.awardAction('keep-suggestion', 10, keepRef, { patternKey: body.keptPatternKey });
      gameEngine.unlockBadge('pattern-spotter', gameDelta.newBadges);
    }

    // Net worth setup
    if (body.assetsTotal !== undefined || body.liabilitiesTotal !== undefined) {
      if (body.assetsTotal !== undefined) db.setSetting('assetsTotal', Number(body.assetsTotal) || 0);
      if (body.liabilitiesTotal !== undefined) db.setSetting('liabilitiesTotal', Number(body.liabilitiesTotal) || 0);
      db.setSetting('netWorthConfigured', true);

      const nwRef = 'net-worth:first-time';
      if (!db.hasGameEventRefKey(nwRef)) {
        gameDelta = gameEngine.awardAction('set-net-worth', 20, nwRef);
        gameEngine.unlockBadge('net-worth-navigator', gameDelta.newBadges);
      }
    }

    if (!gameDelta) {
      const full = gameEngine.getFullGameState();
      gameDelta = {
        xpAwarded: 0,
        totalXp: full.totalXp,
        level: full.level,
        levelTitle: full.levelTitle,
        leveledUp: false,
        newBadges: [],
        questsCompleted: [],
        streak: { current: full.currentStreak, longest: full.longestStreak, extendedToday: false },
        pendingCelebration: false,
      };
    }

    return res.json({
      settings: db.getAllSettings(),
      gameDelta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error saving preferences:', err);
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 6. POST /api/documents (Multipart upload up to 20MB)
// ----------------------------------------------------
app.post('/api/documents', upload.array('files'), (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const createdDocs: DocumentRow[] = [];
    let totalXp = 0;
    let lastDelta = null;

    for (const f of files) {
      if (f.size > 20 * 1024 * 1024) {
        return res.status(400).json({ error: `File ${f.originalname} exceeds the 20 MB size limit` });
      }

      const fileUuid = crypto.randomUUID();
      const safeName = storage.sanitizeFilename(f.originalname);
      const objectKey = `uploads/${fileUuid}-${safeName}`;

      storage.storeFile(objectKey, f.buffer);

      const docRow: DocumentRow = {
        id: fileUuid,
        filename: f.originalname,
        mimeType: f.mimetype || 'application/octet-stream',
        size: f.size,
        objectKey,
        status: 'stored',
        source: 'upload',
        createdAt: new Date().toISOString(),
      };

      db.insertDocument(docRow);
      createdDocs.push(docRow);

      // Award 8 XP for document upload
      const docRef = `doc:${docRow.id}`;
      const delta = gameEngine.awardAction('document-upload', 8, docRef, { filename: docRow.filename });
      totalXp += delta.xpAwarded;
      lastDelta = delta;
    }

    if (!lastDelta) {
      const full = gameEngine.getFullGameState();
      lastDelta = {
        xpAwarded: 0,
        totalXp: full.totalXp,
        level: full.level,
        levelTitle: full.levelTitle,
        leveledUp: false,
        newBadges: [],
        questsCompleted: [],
        streak: { current: full.currentStreak, longest: full.longestStreak, extendedToday: false },
        pendingCelebration: false,
      };
    }

    return res.json({
      documents: createdDocs,
      gameDelta: lastDelta,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error uploading documents:', err);
    return res.status(500).json({ error: message });
  }
});

// Document download / preview
app.get('/api/documents/:id/download', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const doc = db.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const buffer = storage.readFile(doc.objectKey);
    if (!buffer) {
      return res.status(404).json({ error: 'File data not found in vault' });
    }

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${doc.filename}"`);
    return res.send(buffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// Delete document
app.delete('/api/documents/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const doc = db.getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    storage.deleteFile(doc.objectKey);
    db.deleteDocument(id);
    return res.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 7. GET /api/drive-sync
// ----------------------------------------------------
app.get('/api/drive-sync', (_req: Request, res: Response) => {
  try {
    const userTimezone = db.getSetting<string>('userTimezone', 'America/Los_Angeles');
    const folderMeta = db.getSetting('driveFolderMeta', {
      name: 'Ledgerly Financial Inbox',
      id: 'drive_folder_ledgerly_financial_inbox',
      url: 'https://drive.google.com/drive/folders/drive_folder_ledgerly_financial_inbox',
    });

    const scheduleMeta = {
      time: '08:00',
      timezone: userTimezone,
      cadence: 'daily',
    };

    const syncMeta = db.getSetting('driveSyncMeta', {
      lastSyncedAt: null,
      status: 'idle',
      lastCounts: {
        imported: 0,
        duplicates: 0,
        storedFiles: 0,
        review: 0,
        errors: [],
      },
    });

    const processedFileIds = db.getSetting<string[]>('processedFileIds', []).slice(-5000);
    const resetAt = db.getSetting<string | null>('driveResetAt', null);

    res.json({
      folder: folderMeta,
      schedule: scheduleMeta,
      lastSyncedAt: syncMeta.lastSyncedAt,
      status: syncMeta.status,
      counts: syncMeta.lastCounts,
      processedFileIds,
      resetAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 8. POST /api/drive-sync
// ----------------------------------------------------
app.post('/api/drive-sync', (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const { transactions = [], files = [], errors = [] } = body;

    const resetAt = db.getSetting<string | null>('driveResetAt', null);
    const processedIds = new Set(db.getSetting<string[]>('processedFileIds', []));

    let transactionsImported = 0;
    let duplicatesSkipped = 0;
    let filesStored = 0;
    let filesNeedingReview = 0;
    const rules = db.getRules();
    const newProcessedIds: string[] = [];

    // Process files first
    for (const f of files) {
      if (f.driveFileId && processedIds.has(f.driveFileId)) {
        continue;
      }
      if (resetAt && f.modifiedTime && f.modifiedTime <= resetAt) {
        continue; // ignore files modified at or before reset
      }

      try {
        let objectKey = `drive-inbox/${f.driveFileId || crypto.randomUUID()}-${storage.sanitizeFilename(f.filename || 'drive_file')}`;
        if (f.base64Content) {
          const buf = Buffer.from(f.base64Content, 'base64');
          if (buf.length > 20 * 1024 * 1024) {
            errors.push(`File ${f.filename} exceeds 20 MB`);
            continue;
          }
          storage.storeFile(objectKey, buf);
        }

        const docStatus = f.status === 'review' ? 'review' : 'stored';
        if (docStatus === 'review') filesNeedingReview++;
        else filesStored++;

        const docRow: DocumentRow = {
          id: f.driveFileId || crypto.randomUUID(),
          filename: f.filename || 'Drive Document',
          mimeType: f.mimeType || 'application/octet-stream',
          size: f.size || 0,
          objectKey,
          status: docStatus,
          source: 'google-drive',
          createdAt: new Date().toISOString(),
        };
        db.insertDocument(docRow);

        if (f.driveFileId) {
          processedIds.add(f.driveFileId);
          newProcessedIds.push(f.driveFileId);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error storing drive file';
        errors.push(msg);
      }
    }

    // Process transactions
    for (const t of transactions) {
      const merchant = String(t.merchant || '').trim();
      const amount = Number(t.amount);
      const date = String(t.date || '').trim();
      const type = t.type === 'income' ? 'income' : 'expense';
      const account = String(t.account || 'Drive import').trim();
      let category = String(t.category || 'Needs review').trim();

      if (!merchant || !date || isNaN(amount) || amount <= 0) {
        continue;
      }

      const tags = Array.isArray(t.tags) ? [...t.tags] : [];
      if (!tags.includes('Drive import')) {
        tags.push('Drive import');
      }

      const fingerprint = computeCanonicalFingerprint(date, merchant, amount, account);
      if (db.hasTransactionFingerprint(fingerprint)) {
        duplicatesSkipped++;
        continue;
      }

      const txRow: TransactionRow = {
        id: crypto.randomUUID(),
        date,
        merchant,
        category,
        amount,
        type,
        account,
        tags,
        receipt: t.receipt ? 1 : 0,
        source: 'google-drive',
        fingerprint,
        createdAt: new Date().toISOString(),
      };

      applyRulesToTransaction(txRow, rules);

      if (db.insertTransaction(txRow)) {
        transactionsImported++;
      } else {
        duplicatesSkipped++;
      }
    }

    // Persist processed IDs
    db.setSetting('processedFileIds', Array.from(processedIds).slice(-5000));

    // Update sync metadata
    const nowIso = new Date().toISOString();
    const overallStatus = errors.length > 0 && filesStored === 0 && transactionsImported === 0 ? 'failed' : errors.length > 0 ? 'partial' : 'complete';

    db.setSetting('driveSyncMeta', {
      lastSyncedAt: nowIso,
      status: overallStatus,
      lastCounts: {
        imported: transactionsImported,
        duplicates: duplicatesSkipped,
        storedFiles: filesStored,
        review: filesNeedingReview,
        errors,
      },
    });

    let xpAwarded = 0;
    if (transactionsImported > 0 || filesStored > 0) {
      const driveRef = `drive-sync:${nowIso.slice(0, 10)}:${filesStored}:${transactionsImported}`;
      const delta = gameEngine.awardAction('drive-sync', 15, driveRef, {
        transactionsImported,
        filesStored,
      });
      xpAwarded = delta.xpAwarded;
      gameEngine.unlockBadge('drive-dropper', delta.newBadges);
      if (transactionsImported > 0) {
        gameEngine.unlockBadge('first-step', delta.newBadges);
      }
    }

    return res.json({
      status: overallStatus,
      lastSyncedAt: nowIso,
      transactionsImported,
      duplicatesSkipped,
      filesStored,
      filesNeedingReview,
      errors,
      xpAwarded,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Error during drive sync:', err);
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 9. POST /api/game/seen (Acknowledge celebrations)
// ----------------------------------------------------
app.post('/api/game/seen', (_req: Request, res: Response) => {
  try {
    const nowIso = new Date().toISOString();
    db.setSetting('gameSeenThrough', nowIso);
    return res.json({ success: true, seenThrough: nowIso });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 10. DELETE /api/game (Reset game progress only)
// ----------------------------------------------------
app.delete('/api/game', (req: Request, res: Response) => {
  try {
    const confirmation = req.body?.confirmation;
    if (confirmation !== 'RESET LEDGERLY PROGRESS') {
      return res.status(400).json({ error: 'Invalid confirmation. Expected exact string: RESET LEDGERLY PROGRESS' });
    }

    db.resetGameOnly();
    const game = gameEngine.getFullGameState();
    return res.json({ success: true, game });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 11. DELETE /api/state (Complete Data Wipe)
// ----------------------------------------------------
app.delete('/api/state', (req: Request, res: Response) => {
  try {
    const confirmation = req.body?.confirmation;
    if (confirmation !== 'DELETE ALL LEDGERLY DATA') {
      return res.status(400).json({ error: 'Invalid confirmation. Expected exact string: DELETE ALL LEDGERLY DATA' });
    }

    const resetTimestamp = new Date().toISOString();
    // 1. Wipe all DB records and restore initial state
    db.wipeAllData(resetTimestamp);
    // 2. Wipe R2 file storage
    storage.wipeAllFiles();

    // Unlock Fresh Start quiet badge (awarded 0 XP)
    gameEngine.unlockBadge('fresh-start');

    return res.json({
      success: true,
      message: 'All Ledgerly data erased cleanly. Starting fresh.',
      driveResetAt: resetTimestamp,
      state: {
        transactions: [],
        documents: [],
        rules: [],
        tags: [],
        settings: db.getAllSettings(),
        game: gameEngine.getFullGameState(),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return res.status(500).json({ error: message });
  }
});

// ----------------------------------------------------
// 12. POST /api/gemini/kids-learn (Gemini 3.8 Flash Kids Finance Tutor)
// ----------------------------------------------------
app.post('/api/gemini/kids-learn', handleKidsLearn);

// ----------------------------------------------------
// Vite middleware in development / static files in production
// ----------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Ledgerly server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
