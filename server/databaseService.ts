/**
 * Ledgerly Database Persistence & D1 Query Service
 * Provides deep introspection, Cloudflare D1 table inspection, SQL query runner,
 * R2 bucket status, and live verification suite executor.
 */

import fs from 'fs';
import path from 'path';
import { db, TransactionRow, DocumentRow, RuleRow, TagRow, SettingRow, GameEventRow } from './db.js';
import { r2Bucket } from './d1R2Adapter.js';
import { runFullVerification } from './verifyPersistenceAndDatasets.js';

export interface TableSummary {
  name: string;
  rowCount: number;
  columns: Array<{ name: string; type: string; primaryKey?: boolean; notNull?: boolean }>;
  indexes: string[];
  description: string;
}

export const TABLE_METADATA: Record<string, { columns: Array<{ name: string; type: string; primaryKey?: boolean; notNull?: boolean }>; indexes: string[]; description: string }> = {
  transactions: {
    description: 'Financial transactions ledger with canonical fingerprint deduplication',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'date', type: 'TEXT (ISO YYYY-MM-DD)', notNull: true },
      { name: 'merchant', type: 'TEXT', notNull: true },
      { name: 'category', type: 'TEXT', notNull: true },
      { name: 'amount', type: 'REAL (> 0)', notNull: true },
      { name: 'type', type: 'TEXT (expense | income)', notNull: true },
      { name: 'account', type: 'TEXT', notNull: true },
      { name: 'tags', type: 'JSON Array', notNull: true },
      { name: 'receipt', type: 'INTEGER (0 | 1)', notNull: true },
      { name: 'source', type: 'TEXT (manual | csv | document | google-drive)', notNull: true },
      { name: 'fingerprint', type: 'TEXT (UNIQUE)', notNull: true },
      { name: 'createdAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['idx_transactions_date', 'idx_transactions_category', 'idx_transactions_account', 'idx_transactions_fingerprint'],
  },
  documents: {
    description: 'Metadata records for Cloudflare R2 bucket stored receipts & attachments',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'filename', type: 'TEXT', notNull: true },
      { name: 'mimeType', type: 'TEXT', notNull: true },
      { name: 'size', type: 'INTEGER (Bytes)', notNull: true },
      { name: 'objectKey', type: 'TEXT (UNIQUE)', notNull: true },
      { name: 'status', type: 'TEXT (queued | stored | review)', notNull: true },
      { name: 'source', type: 'TEXT (upload | google-drive)', notNull: true },
      { name: 'createdAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['idx_documents_objectkey', 'idx_documents_status'],
  },
  rules: {
    description: 'Automated categorization and keyword matching rules',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'whenText', type: 'TEXT', notNull: true },
      { name: 'thenText', type: 'TEXT', notNull: true },
      { name: 'enabled', type: 'INTEGER (0 | 1)', notNull: true },
      { name: 'createdAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['idx_rules_when'],
  },
  tags: {
    description: 'Normalized registry of user-defined taxonomy tags',
    columns: [
      { name: 'name', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'createdAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['sqlite_autoindex_tags_1'],
  },
  settings: {
    description: 'Key-value configuration store for accounts, categories, and profiles',
    columns: [
      { name: 'key', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'value', type: 'TEXT (JSON / Scalar)', notNull: true },
      { name: 'updatedAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['sqlite_autoindex_settings_1'],
  },
  game_events: {
    description: 'Append-only gamification XP ledger with refKey idempotency',
    columns: [
      { name: 'id', type: 'TEXT', primaryKey: true, notNull: true },
      { name: 'type', type: 'TEXT', notNull: true },
      { name: 'xp', type: 'INTEGER (>= 0)', notNull: true },
      { name: 'refKey', type: 'TEXT (UNIQUE)', notNull: true },
      { name: 'meta', type: 'TEXT (JSON)', notNull: true },
      { name: 'localDate', type: 'TEXT (YYYY-MM-DD)', notNull: true },
      { name: 'createdAt', type: 'TEXT (ISO)', notNull: true },
    ],
    indexes: ['idx_game_events_localDate', 'idx_game_events_type', 'idx_game_events_refkey'],
  },
};

export class DatabaseService {
  /**
   * Introspect current database state, table counts, R2 bucket, and schema
   */
  async getStatus(): Promise<{
    engine: string;
    version: string;
    connected: boolean;
    emptyStartStatus: { verified: boolean; message: string; freshStart: boolean };
    fingerprintFormula: string;
    r2Bucket: {
      status: string;
      objectCount: number;
      totalBytes: number;
      maxSizeBytes: number;
      objects: Array<{ key: string; size: number; uploaded: string }>;
    };
    tables: TableSummary[];
    rawSchemaSql: string;
  }> {
    const d1State = db.getState();
    const r2List = await r2Bucket.list({ limit: 100 });
    const totalBytes = r2List.objects.reduce((acc, obj) => acc + obj.size, 0);

    const schemaPath = path.resolve(process.cwd(), 'schema.sql');
    let rawSchemaSql = '';
    if (fs.existsSync(schemaPath)) {
      rawSchemaSql = fs.readFileSync(schemaPath, 'utf-8');
    }

    const tables: TableSummary[] = Object.keys(TABLE_METADATA).map((tableName) => {
      let rowCount = 0;
      if (tableName === 'transactions') rowCount = d1State.transactions.length;
      else if (tableName === 'documents') rowCount = d1State.documents.length;
      else if (tableName === 'rules') rowCount = d1State.rules.length;
      else if (tableName === 'tags') rowCount = d1State.tags.length;
      else if (tableName === 'settings') rowCount = Object.keys(d1State.settings).length;
      else if (tableName === 'game_events') rowCount = d1State.game_events.length;

      return {
        name: tableName,
        rowCount,
        columns: TABLE_METADATA[tableName].columns,
        indexes: TABLE_METADATA[tableName].indexes,
        description: TABLE_METADATA[tableName].description,
      };
    });

    const isFresh = db.getSetting<boolean>('freshStart', true);
    const txCount = d1State.transactions.length;

    return {
      engine: 'Cloudflare D1 (SQLite Dialect)',
      version: '3.42.0-d1',
      connected: true,
      emptyStartStatus: {
        verified: txCount === 0 || isFresh,
        message: txCount === 0 ? 'Empty-Start verified: Zero unverified records seeded.' : `User instance active with ${txCount} transactions.`,
        freshStart: isFresh,
      },
      fingerprintFormula: 'date + "/" + merchant.trim().toLowerCase() + " " + amount.toFixed(2) + " " + account.trim().toLowerCase()',
      r2Bucket: {
        status: 'Healthy (Bound as BUCKET)',
        objectCount: r2List.objects.length,
        totalBytes,
        maxSizeBytes: 20 * 1024 * 1024,
        objects: r2List.objects.map((o) => ({
          key: o.key,
          size: o.size,
          uploaded: o.uploaded.toISOString(),
        })),
      },
      tables,
      rawSchemaSql,
    };
  }

  /**
   * Fetch paginated rows from any table
   */
  getTableRows(tableName: string, options: { page?: number; limit?: number; search?: string } = {}): {
    tableName: string;
    page: number;
    limit: number;
    total: number;
    rows: unknown[];
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(100, Math.max(1, options.limit || 20));
    const search = (options.search || '').trim().toLowerCase();
    const d1State = db.getState();

    let rawList: unknown[] = [];
    if (tableName === 'transactions') rawList = d1State.transactions;
    else if (tableName === 'documents') rawList = d1State.documents;
    else if (tableName === 'rules') rawList = d1State.rules;
    else if (tableName === 'tags') rawList = d1State.tags;
    else if (tableName === 'settings') {
      rawList = Object.entries(d1State.settings).map(([key, v]: [string, { value: string; updatedAt: string }]) => ({
        key,
        value: typeof v.value === 'string' ? v.value : JSON.stringify(v.value),
        updatedAt: v.updatedAt,
      }));
    } else if (tableName === 'game_events') rawList = d1State.game_events;
    else {
      throw new Error(`Table '${tableName}' does not exist in Cloudflare D1 schema`);
    }

    let filtered = rawList;
    if (search) {
      filtered = rawList.filter((item) => JSON.stringify(item).toLowerCase().includes(search));
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      tableName,
      page,
      limit,
      total: filtered.length,
      rows: paginated,
    };
  }

  /**
   * Execute safe SQL queries against Cloudflare D1 state
   */
  executeQuery(sql: string): {
    columns: string[];
    rows: Record<string, unknown>[];
    rowCount: number;
    durationMs: number;
    query: string;
  } {
    const startTime = performance.now();
    const trimmed = sql.trim().replace(/;+$/, '');
    const lower = trimmed.toLowerCase();

    // Enforce SELECT queries for security
    if (!lower.startsWith('select')) {
      throw new Error('Only SELECT queries are permitted in the web D1 interactive console for security.');
    }

    // Determine target table
    let targetTable = '';
    for (const tbl of Object.keys(TABLE_METADATA)) {
      if (new RegExp(`\\bfrom\\s+${tbl}\\b`, 'i').test(lower)) {
        targetTable = tbl;
        break;
      }
    }

    if (!targetTable) {
      throw new Error('Could not identify target D1 table. Available tables: ' + Object.keys(TABLE_METADATA).join(', '));
    }

    const d1State = db.getState();
    let rawRows: Record<string, unknown>[] = [];
    if (targetTable === 'transactions') rawRows = d1State.transactions as unknown as Record<string, unknown>[];
    else if (targetTable === 'documents') rawRows = d1State.documents as unknown as Record<string, unknown>[];
    else if (targetTable === 'rules') rawRows = d1State.rules as unknown as Record<string, unknown>[];
    else if (targetTable === 'tags') rawRows = d1State.tags as unknown as Record<string, unknown>[];
    else if (targetTable === 'settings') {
      rawRows = Object.entries(d1State.settings).map(([key, v]: [string, { value: string; updatedAt: string }]) => ({
        key,
        value: typeof v.value === 'string' ? v.value : JSON.stringify(v.value),
        updatedAt: v.updatedAt,
      }));
    } else if (targetTable === 'game_events') rawRows = d1State.game_events as unknown as Record<string, unknown>[];

    let result = [...rawRows];

    // Check WHERE clause
    const whereMatch = lower.match(/\bwhere\s+(.*?)(?:\s+order\s+by|\s+group\s+by|\s+limit|$)/i);
    if (whereMatch) {
      const condition = whereMatch[1].trim();
      // Simple where evaluation
      const eqMatch = condition.match(/([a-zA-Z_]+)\s*(=|like|in)\s*(['"]?)(.*?)\3(?:\s+|$)/i);
      if (eqMatch) {
        const col = eqMatch[1];
        const op = eqMatch[2].toLowerCase();
        const val = eqMatch[4];
        result = result.filter((row) => {
          const rowVal = String(row[col] ?? '').toLowerCase();
          if (op === '=') return rowVal === val.toLowerCase();
          if (op === 'like') return rowVal.includes(val.replace(/%/g, '').toLowerCase());
          return true;
        });
      }
    }

    // Check ORDER BY
    const orderMatch = lower.match(/\border\s+by\s+([a-zA-Z_]+)(?:\s+(asc|desc))?/i);
    if (orderMatch) {
      const col = orderMatch[1];
      const isDesc = orderMatch[2]?.toLowerCase() === 'desc';
      result.sort((a, b) => {
        const valA = a[col] as string | number;
        const valB = b[col] as string | number;
        if (valA === valB) return 0;
        if (valA === undefined) return 1;
        if (valB === undefined) return -1;
        if (isDesc) return valA > valB ? -1 : 1;
        return valA > valB ? 1 : -1;
      });
    }

    // Check LIMIT
    const limitMatch = lower.match(/\blimit\s+(\d+)/i);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 50;
    const finalRows = result.slice(0, Math.min(100, limit));

    // Determine columns
    const columns = finalRows.length > 0 ? Object.keys(finalRows[0]) : TABLE_METADATA[targetTable].columns.map((c) => c.name);
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      columns,
      rows: finalRows,
      rowCount: finalRows.length,
      durationMs,
      query: trimmed,
    };
  }

  /**
   * Run the full 31-test verification suite on demand
   */
  async runVerificationSuite(): Promise<{
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    results: Array<{ name: string; passed: boolean; details: string }>;
    durationMs: number;
  }> {
    const startTime = performance.now();
    const suiteOutput = await runFullVerification();
    const durationMs = Math.round((performance.now() - startTime) * 100) / 100;

    const passedCount = suiteOutput.results.filter((r) => r.passed).length;
    const failedCount = suiteOutput.results.length - passedCount;

    return {
      passed: suiteOutput.passed,
      totalTests: suiteOutput.results.length,
      passedTests: passedCount,
      failedTests: failedCount,
      results: suiteOutput.results,
      durationMs,
    };
  }
}

export const databaseService = new DatabaseService();
