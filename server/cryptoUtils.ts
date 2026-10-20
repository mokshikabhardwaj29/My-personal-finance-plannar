/**
 * Cryptographic & Authentication Utilities
 *
 * Implements:
 * 1. PBKDF2 password hashing (≥ 600,000 iterations, SHA-256, 16-byte salt, constant-time compare).
 * 2. Minimum 10-char password policy + common passwords blacklist.
 * 3. Cryptographically secure 256-bit session token generator and SHA-256 hasher.
 * 4. Single-use email verification and password reset token generators.
 * 5. 4-digit PIN hashing for device-level quick unlock.
 */

import crypto from 'crypto';

export const PBKDF2_ITERATIONS = 600000;
export const PBKDF2_KEY_LEN = 32;
export const SALT_LEN = 16;
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Common weak password blacklist (checked case-insensitively and trimmed)
 */
export const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  '1234567890',
  '123456789',
  '12345678',
  'qwertyuiop',
  'qwerty1234',
  'welcome123',
  'admin12345',
  'administrator',
  'letmein123',
  'monkey1234',
  'dragon1234',
  'football123',
  'baseball123',
  'superman123',
  'ledgerly123',
  'familyvault',
  'changeme123',
  'passw0rd123',
  'trustnoone1',
  'iloveyou123',
  'sunshine123',
  'princess123',
  'starwars123',
  'secret1234',
]);

/**
 * Validate password against length and common password blacklist
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      valid: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`,
    };
  }
  const normalized = password.trim().toLowerCase();
  if (COMMON_PASSWORDS.has(normalized)) {
    return {
      valid: false,
      error: 'This password is too common or easily guessed. Please choose a stronger password.',
    };
  }
  return { valid: true };
}

/**
 * Hash password with PBKDF2 (SHA-256, 600,000 iterations)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_LEN);
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(
      password,
      salt,
      PBKDF2_ITERATIONS,
      PBKDF2_KEY_LEN,
      'sha256',
      (err, derivedKey) => {
        if (err) return reject(err);
        const saltHex = salt.toString('hex');
        const keyHex = derivedKey.toString('hex');
        resolve(`pbkdf2_sha256$${PBKDF2_ITERATIONS}$${saltHex}$${keyHex}`);
      }
    );
  });
}

/**
 * Verify password against stored hash using constant-time comparison
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (!password || !storedHash) return false;
  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2_sha256') {
    return false;
  }
  const iterations = parseInt(parts[1], 10);
  const salt = Buffer.from(parts[2], 'hex');
  const expectedKey = Buffer.from(parts[3], 'hex');

  return new Promise((resolve) => {
    crypto.pbkdf2(password, salt, iterations, expectedKey.length, 'sha256', (err, derivedKey) => {
      if (err) return resolve(false);
      try {
        const matches = crypto.timingSafeEqual(derivedKey, expectedKey);
        resolve(matches);
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Hash quick PIN (4 digits) with per-user salt
 */
export async function hashPin(pin: string, salt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(pin, salt, 100000, 32, 'sha256', (err, key) => {
      if (err) return reject(err);
      resolve(key.toString('hex'));
    });
  });
}

/**
 * Verify quick PIN using constant-time comparison
 */
export async function verifyPin(pin: string, salt: string, storedPinHash: string): Promise<boolean> {
  if (!pin || !storedPinHash) return false;
  try {
    const computed = await hashPin(pin, salt);
    const computedBuf = Buffer.from(computed, 'hex');
    const storedBuf = Buffer.from(storedPinHash, 'hex');
    if (computedBuf.length !== storedBuf.length) return false;
    return crypto.timingSafeEqual(computedBuf, storedBuf);
  } catch {
    return false;
  }
}

/**
 * Generate cryptographically secure random 256-bit token
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Compute SHA-256 hash of a token for secure database storage
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
