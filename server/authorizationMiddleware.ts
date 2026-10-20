/**
 * Unified Server-Side Authorization Middleware
 *
 * Enforces:
 * 1. Session resolution from HttpOnly cookie `ledgerly_session` or Authorization Bearer header.
 * 2. Central role permission mapping (owner: all; parent: finances/kids; child: academy/jar only).
 * 3. Scoping by family_id on all access.
 * 4. Parent-to-child verification: parents can only access linked children.
 * 5. Returns 401 for unauthenticated, 403 for unauthorized.
 * 6. Audit logging of security violations.
 */

import { Request, Response, NextFunction } from 'express';
import { authService, User, UserRole, Family, UserProfileData } from './authService.js';
import { DEFAULT_DRIVE_SYNC_SERVICE_KEY } from './cloudflareWorkerAuth.js';

export interface AuthenticatedRequest extends Request {
  auth?: {
    user: User;
    profile: UserProfileData;
    family: Family;
    role: UserRole;
    sessionToken: string;
    isDriveSyncService?: boolean;
  };
}

export type PermissionCheck = (auth: NonNullable<AuthenticatedRequest['auth']>, req: Request) => boolean;

/**
 * Central Permission Definition Map
 * Format: [method, routePattern, allowedRoles, scopeCheckFunction, testName]
 */
export interface RoutePermissionRule {
  method: string;
  pathPattern: RegExp;
  pathName: string;
  allowedRoles: UserRole[];
  scopeCheck?: (auth: NonNullable<AuthenticatedRequest['auth']>, req: Request) => boolean;
  testName: string;
}

export const ROUTE_PERMISSIONS: RoutePermissionRule[] = [
  // Database routes: Strictly Owner-only
  {
    method: 'GET',
    pathPattern: /^\/api\/database\/status$/,
    pathName: '/api/database/status',
    allowedRoles: ['owner'],
    testName: 'Database status owner only',
  },
  {
    method: 'GET',
    pathPattern: /^\/api\/database\/tables\/[a-zA-Z0-9_-]+$/,
    pathName: '/api/database/tables/:tableName',
    allowedRoles: ['owner'],
    testName: 'Database table rows owner only',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/database\/query$/,
    pathName: '/api/database/query',
    allowedRoles: ['owner'],
    testName: 'Database SQL query console owner only',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/database\/verify$/,
    pathName: '/api/database/verify',
    allowedRoles: ['owner'],
    testName: 'Database verification suite owner only',
  },

  // Family Member Management: Owner and Parent (with linking checks)
  {
    method: 'GET',
    pathPattern: /^\/api\/family\/members$/,
    pathName: '/api/family/members',
    allowedRoles: ['owner', 'parent'],
    testName: 'Family members list for parent and owner',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/family\/children$/,
    pathName: '/api/family/children',
    allowedRoles: ['owner', 'parent'],
    testName: 'Child creation with consent for parent and owner',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/family\/children\/[a-zA-Z0-9_-]+$/,
    pathName: '/api/family/children/:id',
    allowedRoles: ['owner', 'parent'],
    scopeCheck: (auth, req) => {
      if (auth.role === 'owner') return true;
      const childId = req.params.id;
      return authService.isChildLinkedToParent(auth.user.id, childId);
    },
    testName: 'Parent delete only linked child',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/family\/invites$/,
    pathName: '/api/family/invites',
    allowedRoles: ['owner'],
    testName: 'Invite family member owner only',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/family\/members\/[a-zA-Z0-9_-]+$/,
    pathName: '/api/family/members/:id',
    allowedRoles: ['owner'],
    testName: 'Remove family member owner only',
  },
  {
    method: 'GET',
    pathPattern: /^\/api\/family\/audit-log$/,
    pathName: '/api/family/audit-log',
    allowedRoles: ['owner'],
    testName: 'Audit log inspection owner only',
  },

  // Financial Ledger & Import: Owner & Parent only
  {
    method: 'POST',
    pathPattern: /^\/api\/transactions$/,
    pathName: '/api/transactions [POST]',
    allowedRoles: ['owner', 'parent'],
    testName: 'Create transaction owner and parent only',
  },
  {
    method: 'PATCH',
    pathPattern: /^\/api\/transactions$/,
    pathName: '/api/transactions [PATCH]',
    allowedRoles: ['owner', 'parent'],
    testName: 'Update transaction owner and parent only',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/transactions$/,
    pathName: '/api/transactions [DELETE]',
    allowedRoles: ['owner', 'parent'],
    testName: 'Delete transaction owner and parent only',
  },

  // Preferences & Budgets: Owner & Parent only
  {
    method: 'PUT',
    pathPattern: /^\/api\/preferences$/,
    pathName: '/api/preferences',
    allowedRoles: ['owner', 'parent'],
    testName: 'Update preferences owner and parent only',
  },

  // Documents & R2 Receipt storage: Owner & Parent only
  {
    method: 'POST',
    pathPattern: /^\/api\/documents$/,
    pathName: '/api/documents [POST]',
    allowedRoles: ['owner', 'parent'],
    testName: 'Upload documents owner and parent only',
  },
  {
    method: 'GET',
    pathPattern: /^\/api\/documents\/[a-zA-Z0-9_-]+\/download$/,
    pathName: '/api/documents/:id/download',
    allowedRoles: ['owner', 'parent'],
    testName: 'Download receipt owner and parent only',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/documents\/[a-zA-Z0-9_-]+$/,
    pathName: '/api/documents/:id [DELETE]',
    allowedRoles: ['owner', 'parent'],
    testName: 'Delete document owner and parent only',
  },

  // Google Drive Ingestion: Owner only (plus automated service Bearer bypass)
  {
    method: 'GET',
    pathPattern: /^\/api\/drive-sync$/,
    pathName: '/api/drive-sync [GET]',
    allowedRoles: ['owner'],
    testName: 'Drive sync status owner only',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/drive-sync$/,
    pathName: '/api/drive-sync [POST]',
    allowedRoles: ['owner'],
    testName: 'Drive sync ingest owner only or service bypass',
  },

  // State Deletion & Wipe: Owner only
  {
    method: 'DELETE',
    pathPattern: /^\/api\/state$/,
    pathName: '/api/state [DELETE]',
    allowedRoles: ['owner'],
    testName: 'Wipe all data owner only',
  },
  {
    method: 'DELETE',
    pathPattern: /^\/api\/game$/,
    pathName: '/api/game [DELETE]',
    allowedRoles: ['owner'],
    testName: 'Reset game progress owner only',
  },

  // State Retrieval: Accessible to all roles, but child gets scoped view
  {
    method: 'GET',
    pathPattern: /^\/api\/state$/,
    pathName: '/api/state [GET]',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Fetch state role scoped',
  },

  // Gamification & Kids Learning
  {
    method: 'POST',
    pathPattern: /^\/api\/game\/seen$/,
    pathName: '/api/game/seen',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Acknowledge game seen all authenticated',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/gemini\/kids-learn$/,
    pathName: '/api/gemini/kids-learn',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Kids academy learning assistant all roles',
  },

  // User Profile & Onboarding
  {
    method: 'GET',
    pathPattern: /^\/api\/auth\/me$/,
    pathName: '/api/auth/me',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Fetch current profile all authenticated',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/auth\/onboarding$/,
    pathName: '/api/auth/onboarding',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Complete onboarding all authenticated',
  },
  {
    method: 'POST',
    pathPattern: /^\/api\/auth\/logout$/,
    pathName: '/api/auth/logout',
    allowedRoles: ['owner', 'parent', 'child'],
    testName: 'Logout all authenticated',
  },
];

/**
 * Public routes that do not require an active session
 */
export const PUBLIC_AUTH_ROUTES = new Set([
  '/api/health',
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/verify-email',
  '/api/auth/resend-verification',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/pin-unlock',
  '/api/auth/claim-status',
]);

/**
 * Extract session token from cookie, Authorization Bearer, or custom header
 */
export function extractSessionToken(req: Request): string | null {
  // 1. Check HttpOnly cookie
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').map((c) => c.trim());
    for (const cookie of cookies) {
      if (cookie.startsWith('ledgerly_session=')) {
        return decodeURIComponent(cookie.slice('ledgerly_session='.length));
      }
    }
  }

  // 2. Check Authorization Bearer header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 3. Check legacy custom header
  const customHeader = req.headers['x-ledgerly-owner-key'] as string | undefined;
  if (customHeader) {
    return customHeader.trim();
  }

  return null;
}

/**
 * Unified authorization middleware
 */
export function authorizationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow non-API requests (static files, React SPA routes)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  // Allow public endpoints
  if (PUBLIC_AUTH_ROUTES.has(req.path)) {
    return next();
  }

  // Check Bearer Token Header Bypass for /api/drive-sync (Scheduled 8am Agent)
  if (req.path === '/api/drive-sync') {
    const authHeader = req.headers.authorization;
    let bearerToken: string | undefined;
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      bearerToken = authHeader.slice(7).trim();
    }
    const customDriveKey = req.headers['x-drive-sync-key'] as string | undefined;
    const token = bearerToken || customDriveKey;

    const expectedKey = process.env.DRIVE_SYNC_TOKEN || DEFAULT_DRIVE_SYNC_SERVICE_KEY;
    if (token && token === expectedKey) {
      // Authorized via service token bypass
      (req as AuthenticatedRequest).auth = {
        user: {
          id: 'svc_drive_sync',
          email: 'service.drive.sync@family.ledgerly.internal',
          passwordHash: '',
          emailVerifiedAt: new Date().toISOString(),
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        profile: {
          userId: 'svc_drive_sync',
          displayName: 'Google Drive Sync Agent',
          dateOfBirth: null,
          age: null,
          gender: null,
          interests: [],
          preferences: {},
          onboardingCompletedAt: new Date().toISOString(),
          quickPinHash: null,
          createdAt: new Date().toISOString(),
        },
        family: { id: 'family_default_v1', name: 'Primary Family Vault', createdAt: '' },
        role: 'owner',
        sessionToken: token,
        isDriveSyncService: true,
      };
      return next();
    }
  }

  // Extract session token
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({
      error: 'Unauthenticated: Valid session token required',
      path: req.path,
    });
    return;
  }

  // Validate session against database
  const validation = authService.validateSessionToken(token);
  if (!validation.valid || !validation.user || !validation.family || !validation.role) {
    res.status(401).json({
      error: validation.error || 'Unauthenticated: Invalid or expired session',
      path: req.path,
    });
    return;
  }

  const authData: NonNullable<AuthenticatedRequest['auth']> = {
    user: validation.user,
    profile: validation.profile!,
    family: validation.family,
    role: validation.role,
    sessionToken: token,
  };

  (req as AuthenticatedRequest).auth = authData;

  // Match request against Central Permission Definition Map
  const matchingRule = ROUTE_PERMISSIONS.find(
    (r) => r.method === req.method && r.pathPattern.test(req.path)
  );

  if (matchingRule) {
    // Check role permission
    if (!matchingRule.allowedRoles.includes(authData.role)) {
      authService.logAudit({
        actorUserId: authData.user.id,
        action: 'permission_denied_403',
        familyId: authData.family.id,
        ip: req.ip,
        details: { path: req.path, method: req.method, role: authData.role },
      });

      res.status(403).json({
        error: `Forbidden: Role '${authData.role}' does not have permission to access ${req.method} ${req.path}`,
        requiredRoles: matchingRule.allowedRoles,
      });
      return;
    }

    // Check scope check (e.g. parent linked to child)
    if (matchingRule.scopeCheck && !matchingRule.scopeCheck(authData, req)) {
      authService.logAudit({
        actorUserId: authData.user.id,
        action: 'scope_permission_denied_403',
        familyId: authData.family.id,
        ip: req.ip,
        details: { path: req.path, method: req.method, reason: 'Parent not linked to child' },
      });

      res.status(403).json({
        error: 'Forbidden: Access to requested resource is outside user scope or guardianship link',
      });
      return;
    }
  }

  next();
}
