/**
 * Automated Verification Suite for Ledgerly Persistence, Idempotency, and Datasets
 * Runs full architectural tests against:
 * 1. Empty-Start Contract
 * 2. Cloudflare D1 DDL schema.sql integrity
 * 3. Synthetic CSV import verification using reference datasets
 * 4. Idempotency & Duplicate Fingerprint collision rejection
 * 5. Gamification fraud prevention (append-only XP ledger & unique refKey)
 * 6. Recurring pattern & cadence detection
 * 7. Cloudflare R2 object storage operations & size limits
 * 8. Owner-Only privacy authentication guard
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { db, TransactionRow } from './db.js';
import { r2Bucket } from './d1R2Adapter.js';
import {
  SYNTHETIC_FIXTURE_INCOME_TRENDS_CSV,
  SYNTHETIC_FIXTURE_PERSONAL_BUDGET_CSV,
  computeCanonicalFingerprint,
  classifyFromTrainingPool,
  CADENCE_DICTIONARY,
} from './referenceDatasets.js';
import { detectRecurringPatterns } from './detectionEngine.js';
import { gameEngine, getUserLocalDate } from './gameEngine.js';
import { getOrCreateOwnerKey, verifyOwnerToken } from './authGuard.js';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, details = ''): void {
  results.push({
    name,
    passed: Boolean(condition),
    details: condition ? 'PASSED' : `FAILED: ${details}`,
  });
}

export async function runFullVerification(): Promise<{ passed: boolean; results: TestResult[] }> {
  console.log('=== Running Ledgerly Persistence & Dataset Verification Suite ===\n');

  // --------------------------------------------------------------------------
  // Test 1: Empty-Start Contract & Settings Initialization
  // --------------------------------------------------------------------------
  const nowIso = new Date().toISOString();
  db.wipeAllData(nowIso);

  const freshTxs = db.getTransactions();
  assert(freshTxs.length === 0, 'Empty-Start Contract: Initial live transactions is zero', `Count was ${freshTxs.length}`);

  const categories = db.getSetting<string[]>('categories', []);
  assert(Array.isArray(categories) && categories.length > 5, 'Empty-Start Contract: Default categories initialized', `Got: ${categories.length}`);

  const accounts = db.getSetting<string[]>('accounts', []);
  assert(Array.isArray(accounts) && accounts.length > 0, 'Empty-Start Contract: Default accounts initialized', `Got: ${accounts.length}`);

  const freshStart = db.getSetting<boolean>('freshStart', false);
  assert(freshStart === true, 'Empty-Start Contract: freshStart flag is true');

  // --------------------------------------------------------------------------
  // Test 2: D1 Relational Schema File Integrity
  // --------------------------------------------------------------------------
  const schemaPath = path.resolve(process.cwd(), 'schema.sql');
  const schemaExists = fs.existsSync(schemaPath);
  assert(schemaExists, 'D1 Schema: schema.sql exists in root');

  if (schemaExists) {
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS transactions'), 'D1 Schema: transactions table declared');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS documents'), 'D1 Schema: documents table declared');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS rules'), 'D1 Schema: rules table declared');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS tags'), 'D1 Schema: tags table declared');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS settings'), 'D1 Schema: settings table declared');
    assert(schemaContent.includes('CREATE TABLE IF NOT EXISTS game_events'), 'D1 Schema: game_events table declared');
    assert(schemaContent.includes('fingerprint TEXT NOT NULL UNIQUE'), 'D1 Schema: fingerprint UNIQUE constraint declared');
    assert(schemaContent.includes('refKey TEXT NOT NULL UNIQUE'), 'D1 Schema: refKey UNIQUE constraint declared');
  }

  // --------------------------------------------------------------------------
  // Test 3: Synthetic CSV Parsing & Categorization via Reference Dataset Pools
  // --------------------------------------------------------------------------
  const parseCsvLines = (csv: string) => {
    const lines = csv.trim().split('\n');
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const rows: Array<Record<string, string>> = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map((p) => p.trim());
      if (parts.length >= header.length) {
        const item: Record<string, string> = {};
        header.forEach((h, idx) => {
          item[h] = parts[idx];
        });
        rows.push(item);
      }
    }
    return rows;
  };

  const syntheticPersonalRows = parseCsvLines(SYNTHETIC_FIXTURE_PERSONAL_BUDGET_CSV);
  assert(syntheticPersonalRows.length > 5, 'Reference Dataset: Synthetic personal budget CSV fixture loaded', `Count: ${syntheticPersonalRows.length}`);

  // Test keyword classifier on reference merchant names
  const netflixClassified = classifyFromTrainingPool('Netflix.com');
  assert(netflixClassified.category === 'Subscriptions', 'Reference Dataset Dictionary: Netflix classified as Subscriptions');

  const shellClassified = classifyFromTrainingPool('Shell Oil 9214');
  assert(shellClassified.category === 'Transportation', 'Reference Dataset Dictionary: Shell classified as Transportation');

  const pgeClassified = classifyFromTrainingPool('PG&E Energy Utility');
  assert(pgeClassified.category === 'Utilities', 'Reference Dataset Dictionary: PG&E classified as Utilities');

  // --------------------------------------------------------------------------
  // Test 4: Idempotency & Canonical Fingerprint Generation
  // --------------------------------------------------------------------------
  const fp1 = computeCanonicalFingerprint('2026-09-02', "Trader Joe's #104", 84.5, 'Everyday Visa');
  const expectedFp1 = "2026-09-02/trader joe's #104 84.50 everyday visa";
  assert(fp1 === expectedFp1, 'Fingerprint Specification: Canonical format match', `Got ${fp1}`);

  // Import first transaction
  const tx1: TransactionRow = {
    id: crypto.randomUUID(),
    date: '2026-09-02',
    merchant: "Trader Joe's #104",
    category: 'Groceries',
    amount: 84.5,
    type: 'expense',
    account: 'Everyday Visa',
    tags: ['food', 'essential'],
    receipt: 0,
    source: 'csv',
    fingerprint: fp1,
    createdAt: nowIso,
  };

  const insertedFirst = db.insertTransaction(tx1);
  assert(insertedFirst === true, 'Idempotency: First transaction inserted successfully');

  // Attempt duplicate insert of exact transaction
  const insertedDuplicate = db.insertTransaction({
    ...tx1,
    id: crypto.randomUUID(),
  });
  assert(insertedDuplicate === false, 'Idempotency: Duplicate transaction with identical fingerprint rejected');

  // --------------------------------------------------------------------------
  // Test 5: Gamification Integrity & Append-Only XP Ledger
  // --------------------------------------------------------------------------
  const refKey1 = `csv-import:${fp1}:1`;
  const event1Inserted = db.insertGameEvent({
    id: crypto.randomUUID(),
    type: 'csv-import',
    xp: 20,
    refKey: refKey1,
    meta: JSON.stringify({ count: 1 }),
    localDate: getUserLocalDate('America/Los_Angeles'),
    createdAt: nowIso,
  });
  assert(event1Inserted === true, 'Gamification Integrity: Initial XP event recorded in append-only ledger');

  // Attempt duplicate XP event with identical refKey
  const duplicateXpAttempt = db.insertGameEvent({
    id: crypto.randomUUID(),
    type: 'csv-import',
    xp: 20,
    refKey: refKey1,
    meta: JSON.stringify({ count: 1 }),
    localDate: getUserLocalDate('America/Los_Angeles'),
    createdAt: nowIso,
  });
  assert(duplicateXpAttempt === false, 'Gamification Integrity: Duplicate XP event rejected by unique refKey constraint');

  // --------------------------------------------------------------------------
  // Test 6: Recurring Pattern & Cadence Detection
  // --------------------------------------------------------------------------
  const recurringTxs: TransactionRow[] = [
    {
      id: crypto.randomUUID(),
      date: '2026-07-03',
      merchant: 'Netflix.com',
      category: 'Subscriptions',
      amount: 15.49,
      type: 'expense',
      account: 'Everyday Visa',
      tags: ['digital'],
      receipt: 0,
      source: 'csv',
      fingerprint: computeCanonicalFingerprint('2026-07-03', 'Netflix.com', 15.49, 'Everyday Visa'),
      createdAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      date: '2026-08-03',
      merchant: 'Netflix.com',
      category: 'Subscriptions',
      amount: 15.49,
      type: 'expense',
      account: 'Everyday Visa',
      tags: ['digital'],
      receipt: 0,
      source: 'csv',
      fingerprint: computeCanonicalFingerprint('2026-08-03', 'Netflix.com', 15.49, 'Everyday Visa'),
      createdAt: nowIso,
    },
    {
      id: crypto.randomUUID(),
      date: '2026-09-03',
      merchant: 'Netflix.com',
      category: 'Subscriptions',
      amount: 15.49,
      type: 'expense',
      account: 'Everyday Visa',
      tags: ['digital'],
      receipt: 0,
      source: 'csv',
      fingerprint: computeCanonicalFingerprint('2026-09-03', 'Netflix.com', 15.49, 'Everyday Visa'),
      createdAt: nowIso,
    },
  ];

  const detected = detectRecurringPatterns(recurringTxs, []);
  assert(detected.subscriptions.length >= 1, 'Recurrence Engine: Netflix detected as subscription');
  if (detected.subscriptions.length >= 1) {
    const netflix = detected.subscriptions[0];
    assert(netflix.cadence === 'monthly', 'Cadence Engine: Netflix detected with monthly cadence');
    assert(netflix.confidence === 'High confidence', 'Recurrence Engine: High confidence assigned for 3 occurrences');
  }

  // --------------------------------------------------------------------------
  // Test 7: Cloudflare R2 Storage Operations
  // --------------------------------------------------------------------------
  const testObjectKey = 'test/synthetic-receipt.pdf';
  const dummyPayload = Buffer.from('%PDF-1.4 synthetic test file content');
  await r2Bucket.put(testObjectKey, dummyPayload, {
    httpMetadata: { contentType: 'application/pdf' },
  });

  const headRes = await r2Bucket.head(testObjectKey);
  assert(headRes !== null && headRes.size === dummyPayload.length, 'R2 Bucket: Object put and head verified');

  const getRes = await r2Bucket.get(testObjectKey);
  assert(getRes !== null && (await getRes.text()).includes('synthetic test file'), 'R2 Bucket: Object retrieved intact');

  await r2Bucket.delete(testObjectKey);
  const headAfterDelete = await r2Bucket.head(testObjectKey);
  assert(headAfterDelete === null, 'R2 Bucket: Object deleted successfully');

  // --------------------------------------------------------------------------
  // Test 8: Owner-Only Privacy Guard
  // --------------------------------------------------------------------------
  const ownerToken = getOrCreateOwnerKey();
  assert(typeof ownerToken === 'string' && ownerToken.length === 64, 'Owner Privacy: Owner token created with 64 hex characters');

  const validTokenCheck = verifyOwnerToken(ownerToken);
  assert(validTokenCheck === true, 'Owner Privacy: Valid owner token accepted');

  const invalidTokenCheck = verifyOwnerToken('malicious_or_forged_key_0000000000000000000000000000000000000000000000');
  assert(invalidTokenCheck === false, 'Owner Privacy: Invalid/forged token rejected');

  // --------------------------------------------------------------------------
  // Clean up: Reset to pristine empty state per Empty-Start Contract
  // --------------------------------------------------------------------------
  db.wipeAllData(new Date().toISOString());

  const allPassed = results.every((r) => r.passed);
  console.log(`\nVerification Suite Complete: ${results.filter((r) => r.passed).length}/${results.length} tests passed.`);
  for (const r of results) {
    console.log(`  [${r.passed ? 'PASS' : 'FAIL'}] ${r.name}`);
  }

  return { passed: allPassed, results };
}

// Auto-run if executed directly via node/tsx
if (process.argv[1]?.includes('verifyPersistenceAndDatasets')) {
  runFullVerification()
    .then((summary) => {
      process.exit(summary.passed ? 0 : 1);
    })
    .catch((err) => {
      console.error('Fatal error running verification suite:', err);
      process.exit(1);
    });
}
