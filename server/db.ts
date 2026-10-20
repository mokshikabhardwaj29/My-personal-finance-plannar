import fs from 'fs';
import path from 'path';

export interface TransactionRow {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  amount: number; // positive magnitude
  type: 'expense' | 'income';
  account: string;
  tags: string[]; // stored as JSON array in D1
  receipt: number; // 0 or 1
  source: string; // manual, csv, document, google-drive
  fingerprint: string;
  createdAt: string;
}

export interface TagRow {
  name: string;
  createdAt: string;
}

export interface RuleRow {
  id: string;
  whenText: string;
  thenText: string;
  enabled: number; // 0 or 1
  createdAt: string;
}

export interface SettingRow {
  key: string;
  value: string; // JSON or scalar text
  updatedAt: string;
}

export interface DocumentRow {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
  status: 'queued' | 'stored' | 'review';
  source: 'upload' | 'google-drive';
  createdAt: string;
}

export interface GameEventRow {
  id: string;
  type: string;
  xp: number;
  refKey: string;
  meta: string; // JSON
  localDate: string; // YYYY-MM-DD
  createdAt: string;
}

export interface DatabaseState {
  transactions: TransactionRow[];
  tags: TagRow[];
  rules: RuleRow[];
  settings: Record<string, { value: string; updatedAt: string }>;
  documents: DocumentRow[];
  game_events: GameEventRow[];
}

const DB_DIR = path.resolve(process.cwd(), '.data');
const DB_FILE = path.join(DB_DIR, 'ledgerly_db.json');

class LedgerlyDatabase {
  private state: DatabaseState = {
    transactions: [],
    tags: [],
    rules: [],
    settings: {},
    documents: [],
    game_events: [],
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = {
          transactions: parsed.transactions || [],
          tags: parsed.tags || [],
          rules: parsed.rules || [],
          settings: parsed.settings || {},
          documents: parsed.documents || [],
          game_events: parsed.game_events || [],
        };
      } else {
        this.persist();
      }
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing database:', err);
      this.initialized = true;
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const tmpFile = `${DB_FILE}.tmp.${Date.now()}`;
      fs.writeFileSync(tmpFile, JSON.stringify(this.state, null, 2), 'utf-8');
      fs.renameSync(tmpFile, DB_FILE);
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  public getState(): DatabaseState {
    return {
      transactions: [...this.state.transactions],
      tags: [...this.state.tags],
      rules: [...this.state.rules],
      settings: { ...this.state.settings },
      documents: [...this.state.documents],
      game_events: [...this.state.game_events],
    };
  }

  // --- Transactions ---
  public getTransactions(limit = 5000): TransactionRow[] {
    return [...this.state.transactions]
      .sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : b.createdAt.localeCompare(a.createdAt)))
      .slice(0, limit);
  }

  public getTransactionById(id: string): TransactionRow | undefined {
    return this.state.transactions.find((t) => t.id === id);
  }

  public hasTransactionFingerprint(fingerprint: string): boolean {
    const normalizedInput = fingerprint.trim().toLowerCase();
    return this.state.transactions.some((t) => {
      if (!t.fingerprint) return false;
      const tf = t.fingerprint.trim().toLowerCase();
      if (tf === normalizedInput) return true;
      // Normalize pipe separators if existing records were saved with pipes
      const pipeConverted = tf.replace(/\|/g, '/').replace(/\s+/g, ' ');
      const inputPipeConverted = normalizedInput.replace(/\|/g, '/').replace(/\s+/g, ' ');
      return pipeConverted === inputPipeConverted;
    });
  }

  public insertTransaction(tx: TransactionRow): boolean {
    if (this.hasTransactionFingerprint(tx.fingerprint)) {
      return false; // duplicate rejected
    }
    this.state.transactions.push(tx);
    this.persist();
    return true;
  }

  public insertTransactionsBatch(txs: TransactionRow[]): { inserted: TransactionRow[]; duplicates: number } {
    const inserted: TransactionRow[] = [];
    let duplicates = 0;
    for (const tx of txs) {
      if (this.hasTransactionFingerprint(tx.fingerprint)) {
        duplicates++;
      } else {
        this.state.transactions.push(tx);
        inserted.push(tx);
      }
    }
    if (inserted.length > 0) {
      this.persist();
    }
    return { inserted, duplicates };
  }

  public updateTransaction(id: string, updates: Partial<Pick<TransactionRow, 'category' | 'tags' | 'receipt'>>): TransactionRow | null {
    const index = this.state.transactions.findIndex((t) => t.id === id);
    if (index === -1) return null;
    const current = this.state.transactions[index];
    const updated = {
      ...current,
      ...updates,
    };
    this.state.transactions[index] = updated;
    this.persist();
    return updated;
  }

  public deleteTransaction(id: string): boolean {
    const prevLen = this.state.transactions.length;
    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    if (this.state.transactions.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Tags ---
  public getTags(): TagRow[] {
    return [...this.state.tags].sort((a, b) => a.name.localeCompare(b.name));
  }

  public insertTag(name: string): TagRow | null {
    const cleanName = name.trim();
    if (!cleanName) return null;
    const exists = this.state.tags.find((t) => t.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) return exists;
    const newTag: TagRow = {
      name: cleanName,
      createdAt: new Date().toISOString(),
    };
    this.state.tags.push(newTag);
    this.persist();
    return newTag;
  }

  public deleteTag(name: string): boolean {
    const clean = name.trim().toLowerCase();
    const prevLen = this.state.tags.length;
    this.state.tags = this.state.tags.filter((t) => t.name.toLowerCase() !== clean);
    if (this.state.tags.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Rules ---
  public getRules(): RuleRow[] {
    return [...this.state.rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public insertRule(rule: RuleRow): RuleRow {
    this.state.rules.push(rule);
    this.persist();
    return rule;
  }

  public updateRule(id: string, updates: Partial<RuleRow>): RuleRow | null {
    const idx = this.state.rules.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.state.rules[idx] = { ...this.state.rules[idx], ...updates };
    this.persist();
    return this.state.rules[idx];
  }

  public deleteRule(id: string): boolean {
    const prevLen = this.state.rules.length;
    this.state.rules = this.state.rules.filter((r) => r.id !== id);
    if (this.state.rules.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Settings ---
  public getSetting<T>(key: string, defaultValue: T): T {
    const row = this.state.settings[key];
    if (!row) return defaultValue;
    try {
      return JSON.parse(row.value) as T;
    } catch {
      return row.value as unknown as T;
    }
  }

  public getRawSetting(key: string): string | undefined {
    return this.state.settings[key]?.value;
  }

  public getAllSettings(): Record<string, unknown> {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(this.state.settings)) {
      try {
        res[k] = JSON.parse(v.value);
      } catch {
        res[k] = v.value;
      }
    }
    return res;
  }

  public setSetting<T>(key: string, value: T): void {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    this.state.settings[key] = {
      value: strVal,
      updatedAt: new Date().toISOString(),
    };
    this.persist();
  }

  public deleteSetting(key: string): void {
    if (this.state.settings[key]) {
      delete this.state.settings[key];
      this.persist();
    }
  }

  // --- Documents ---
  public getDocuments(limit = 100): DocumentRow[] {
    return [...this.state.documents]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  public getDocumentById(id: string): DocumentRow | undefined {
    return this.state.documents.find((d) => d.id === id);
  }

  public insertDocument(doc: DocumentRow): DocumentRow {
    this.state.documents.push(doc);
    this.persist();
    return doc;
  }

  public deleteDocument(id: string): boolean {
    const prevLen = this.state.documents.length;
    this.state.documents = this.state.documents.filter((d) => d.id !== id);
    if (this.state.documents.length !== prevLen) {
      this.persist();
      return true;
    }
    return false;
  }

  // --- Game Events ---
  public getGameEvents(): GameEventRow[] {
    return [...this.state.game_events].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  public hasGameEventRefKey(refKey: string): boolean {
    return this.state.game_events.some((e) => e.refKey === refKey);
  }

  public insertGameEvent(event: GameEventRow): boolean {
    if (this.hasGameEventRefKey(event.refKey)) {
      return false; // idempotent: already recorded
    }
    this.state.game_events.push(event);
    this.persist();
    return true;
  }

  public getDailyXpForType(type: string, localDate: string): number {
    return this.state.game_events
      .filter((e) => e.type === type && e.localDate === localDate)
      .reduce((sum, e) => sum + e.xp, 0);
  }

  // --- Wipe Data / Reset Game ---
  public resetGameOnly(): void {
    this.state.game_events = [];
    delete this.state.settings['gameBadges'];
    delete this.state.settings['gameFreezeDates'];
    delete this.state.settings['gameQuestState'];
    delete this.state.settings['gameSeenThrough'];
    // Keep userTimezone and mascot preferences
    this.persist();
  }

  public wipeAllData(resetTimestamp: string): void {
    const keptUserTimezone = this.getSetting<string>('userTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');
    const defaultMascotProfile = {
      showPenny: true,
      celebrations: true,
      sounds: false,
      animationLevel: 'follow', // follow, full, reduced
    };

    this.state = {
      transactions: [],
      tags: [],
      rules: [],
      settings: {},
      documents: [],
      game_events: [],
    };

    this.setSetting('freshStart', true);
    this.setSetting('driveResetAt', resetTimestamp);
    this.setSetting('assetsTotal', 0);
    this.setSetting('liabilitiesTotal', 0);
    this.setSetting('netWorthConfigured', false);
    this.setSetting('selectedPeriod', 'all-time');
    this.setSetting('userTimezone', keptUserTimezone);
    this.setSetting('gameProfile', defaultMascotProfile);

    // Starter categories & accounts definitions (configuration only, no financial balances)
    this.setSetting('categories', [
      'Housing',
      'Groceries',
      'Shopping',
      'Dining',
      'Transportation',
      'Utilities',
      'Subscriptions',
      'Insurance',
      'Health',
      'Entertainment',
      'Income',
      'Needs review',
      'Other',
    ]);

    this.setSetting('accounts', [
      'Main Checking',
      'Everyday Visa',
      'Rewards Card',
      'Cash',
    ]);

    this.setSetting('goals', []);
    this.setSetting('budgets', []);
    this.setSetting('subscriptions', []);
    this.setSetting('recurring', []);
    this.setSetting('dismissedPatterns', []);

    this.persist();
  }
}

export const db = new LedgerlyDatabase();
