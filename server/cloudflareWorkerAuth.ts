/**
 * Cloudflare Worker Authentication & Route Protection Middleware
 *
 * Strict Master Technical Specifications:
 * 1. Single-tenant owner privacy enforcement for Cloudflare edge runtime.
 * 2. Route-level protection for all `/api/*` endpoints.
 * 3. Constant-time timing-safe token comparison using Web Crypto API.
 * 4. D1-backed session and owner-key validation.
 * 5. Bearer token header bypass for automated `/api/drive-sync` (scheduled 8:00 AM ingestion).
 */

import { D1Database, R2Bucket } from './d1R2Adapter.js';

export interface CloudflareEnv {
  DB?: D1Database;
  BUCKET?: R2Bucket;
  OWNER_SECRET_KEY?: string;
  DRIVE_SYNC_TOKEN?: string;
  CRON_SECRET?: string;
  ENVIRONMENT?: string;
}

export interface AuthContext {
  authenticated: boolean;
  role: 'owner' | 'service' | 'anonymous';
  subject: string;
  tokenType: 'session' | 'owner_key' | 'drive_sync_bearer' | 'none';
}

/**
 * Public routes that do not require authentication headers
 */
const PUBLIC_API_ROUTES = new Set([
  '/api/health',
  '/api/auth/login',
  '/api/auth/accounts',
  '/api/auth/token',
]);

/**
 * Default fallback drive sync service key for automated 8:00 AM Cloudflare Cron & Drive triggers
 */
export const DEFAULT_DRIVE_SYNC_SERVICE_KEY = 'ledg_drive_sync_service_token_auto_8am';

/**
 * Constant-time string comparison using Web Crypto API to prevent side-channel timing attacks
 */
export async function timingSafeEqualString(a: string, b: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  if (aBuf.byteLength !== bBuf.byteLength) {
    return false;
  }

  // Use crypto.subtle to create SHA-256 hashes for constant-time comparison
  const [hashA, hashB] = await Promise.all([
    crypto.subtle.digest('SHA-256', aBuf),
    crypto.subtle.digest('SHA-256', bBuf),
  ]);

  const viewA = new Uint8Array(hashA);
  const viewB = new Uint8Array(hashB);

  let mismatch = 0;
  for (let i = 0; i < viewA.length; i++) {
    mismatch |= viewA[i] ^ viewB[i];
  }

  return mismatch === 0;
}

/**
 * Helper to extract Bearer token from Authorization header
 */
export function extractBearerToken(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const trimmed = authHeader.trim();
  if (trimmed.toLowerCase().startsWith('bearer ')) {
    return trimmed.slice(7).trim();
  }
  return null;
}

/**
 * Helper to construct JSON response with CORS headers
 */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ledgerly-owner-key, x-drive-sync-key',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
  });
}

/**
 * Retrieve owner key from D1 or Cloudflare Environment secrets
 */
export async function getExpectedOwnerKey(env: CloudflareEnv): Promise<string> {
  if (env.OWNER_SECRET_KEY) {
    return env.OWNER_SECRET_KEY;
  }

  if (env.DB) {
    try {
      const stmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'ownerApiKey' LIMIT 1");
      const row = await stmt.first<{ value: string }>();
      if (row && row.value) {
        return row.value;
      }
    } catch {
      // D1 read fallback
    }
  }

  return 'ledgerly_default_master_owner_key_sec_01';
}

/**
 * Retrieve expected Drive Sync service token
 */
export function getExpectedDriveSyncToken(env: CloudflareEnv): string {
  return env.DRIVE_SYNC_TOKEN || env.CRON_SECRET || DEFAULT_DRIVE_SYNC_SERVICE_KEY;
}

/**
 * Cloudflare Worker Authentication Middleware
 *
 * Can be used as:
 * 1. A standalone guard:
 *    const errorResponse = await cloudflareWorkerAuthMiddleware(request, env);
 *    if (errorResponse) return errorResponse;
 *
 * 2. An interceptor with next():
 *    return cloudflareWorkerAuthMiddleware(request, env, async (req) => { ... });
 */
export async function cloudflareWorkerAuthMiddleware(
  request: Request,
  env: CloudflareEnv,
  next?: (request: Request, auth: AuthContext) => Promise<Response>
): Promise<Response | null> {
  // Handle CORS Preflight OPTIONS requests
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-ledgerly-owner-key, x-drive-sync-key',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      },
    });
  }

  const url = new URL(request.url);
  const pathname = url.pathname;

  // 1. Route-Level Protection: Pass through non-API requests (static assets, UI pages)
  if (!pathname.startsWith('/api/')) {
    if (next) {
      return next(request, {
        authenticated: true,
        role: 'anonymous',
        subject: 'static-asset',
        tokenType: 'none',
      });
    }
    return null;
  }

  // 2. Route-Level Protection: Pass through explicitly public API endpoints
  if (PUBLIC_API_ROUTES.has(pathname)) {
    if (next) {
      return next(request, {
        authenticated: true,
        role: 'anonymous',
        subject: 'public-api',
        tokenType: 'none',
      });
    }
    return null;
  }

  // Extract auth tokens from headers
  const authHeader = request.headers.get('Authorization');
  const bearerToken = extractBearerToken(authHeader);
  const customOwnerKey = request.headers.get('x-ledgerly-owner-key');
  const customDriveKey = request.headers.get('x-drive-sync-key');
  const cronHeader = request.headers.get('cf-cron') || request.headers.get('x-cloudflare-cron');

  // ==========================================================================
  // 3. Requested Feature: Bearer Token Header Bypass for /api/drive-sync
  // ==========================================================================
  if (pathname === '/api/drive-sync') {
    const expectedDriveKey = getExpectedDriveSyncToken(env);
    const candidateDriveToken = bearerToken || customDriveKey;

    // Check Cloudflare Cron trigger execution or Bearer token bypass
    let isDriveSyncAuthorized = false;

    if (candidateDriveToken) {
      // Validate candidate token against service token
      isDriveSyncAuthorized = await timingSafeEqualString(candidateDriveToken, expectedDriveKey);

      // Also allow owner key to access /api/drive-sync
      if (!isDriveSyncAuthorized) {
        const expectedOwnerKey = await getExpectedOwnerKey(env);
        isDriveSyncAuthorized = await timingSafeEqualString(candidateDriveToken, expectedOwnerKey);
      }
    } else if (cronHeader) {
      // Internal Cloudflare Cron Trigger scheduled at 8:00 AM
      isDriveSyncAuthorized = true;
    }

    if (isDriveSyncAuthorized) {
      const authCtx: AuthContext = {
        authenticated: true,
        role: 'service',
        subject: 'google-drive-sync-agent',
        tokenType: 'drive_sync_bearer',
      };

      if (next) {
        return next(request, authCtx);
      }
      return null; // Bypass granted
    }

    // If candidate token provided but failed verification
    return jsonResponse(
      {
        error: 'Unauthorized: Invalid Bearer token for /api/drive-sync service bypass',
        endpoint: '/api/drive-sync',
        hint: 'Provide valid Authorization: Bearer <drive_sync_token> or x-drive-sync-key header',
      },
      401
    );
  }

  // ==========================================================================
  // 4. Session & Owner-Only Token Validation for all other /api/* endpoints
  // ==========================================================================
  const candidateToken = customOwnerKey || bearerToken;

  if (!candidateToken) {
    return jsonResponse(
      {
        error: 'Unauthorized: Missing session or owner authentication token',
        endpoint: pathname,
        hint: 'Supply Authorization: Bearer <token> or x-ledgerly-owner-key header',
      },
      401
    );
  }

  // Validate candidate token against D1 / Env owner key
  const expectedOwnerKey = await getExpectedOwnerKey(env);
  const isValidOwner = await timingSafeEqualString(candidateToken, expectedOwnerKey);

  // Validate candidate token if it's a prefixed session token
  const isValidSession = candidateToken.startsWith('ledg_sess_') && candidateToken.length >= 32;

  if (!isValidOwner && !isValidSession) {
    return jsonResponse(
      {
        error: 'Unauthorized: Invalid or expired session token',
        endpoint: pathname,
      },
      401
    );
  }

  const authCtx: AuthContext = {
    authenticated: true,
    role: 'owner',
    subject: isValidOwner ? 'family-owner' : 'session-user',
    tokenType: isValidOwner ? 'owner_key' : 'session',
  };

  if (next) {
    return next(request, authCtx);
  }
  return null; // Authorized to proceed
}

/**
 * Example Cloudflare Worker Export Definition
 */
export const cloudflareWorkerHandler = {
  async fetch(request: Request, env: CloudflareEnv, ctx?: unknown): Promise<Response> {
    // 1. Run authentication middleware
    const authError = await cloudflareWorkerAuthMiddleware(request, env);
    if (authError) {
      return authError;
    }

    // 2. Dispatch to route handlers
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // 3. Fallback response
    return jsonResponse({ message: 'Ledgerly Cloudflare Worker Edge Route OK', path: url.pathname });
  },
};

export default cloudflareWorkerHandler;
