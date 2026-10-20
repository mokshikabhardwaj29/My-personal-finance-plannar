import { AppStatePayload, Transaction, GameDelta, AppSettings, DocumentMeta } from '../types';

export class ApiService {
  async fetchState(): Promise<AppStatePayload> {
    const res = await fetch('/api/state');
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch state' }));
      throw new Error(err.error || 'Failed to fetch state');
    }
    return res.json();
  }

  async createTransactions(
    items: Partial<Transaction> | Array<Partial<Transaction>>
  ): Promise<{ inserted: number; duplicates: number; transactions: Transaction[]; gameDelta: GameDelta }> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save transaction' }));
      throw new Error(err.error || 'Failed to save transaction');
    }
    return res.json();
  }

  async updateTransaction(
    id: string,
    updates: { category?: string; tags?: string[]; receipt?: number }
  ): Promise<{ transaction: Transaction; gameDelta: GameDelta }> {
    const res = await fetch('/api/transactions', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to update transaction' }));
      throw new Error(err.error || 'Failed to update transaction');
    }
    return res.json();
  }

  async deleteTransaction(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/transactions?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete transaction' }));
      throw new Error(err.error || 'Failed to delete transaction');
    }
    return res.json();
  }

  async savePreferences(preferences: Partial<AppSettings> & Record<string, unknown>): Promise<{ settings: AppSettings; gameDelta: GameDelta }> {
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to save preferences' }));
      throw new Error(err.error || 'Failed to save preferences');
    }
    return res.json();
  }

  async uploadDocuments(files: File[]): Promise<{ documents: DocumentMeta[]; gameDelta: GameDelta }> {
    const formData = new FormData();
    for (const f of files) {
      formData.append('files', f);
    }
    const res = await fetch('/api/documents', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to upload documents' }));
      throw new Error(err.error || 'Failed to upload documents');
    }
    return res.json();
  }

  async deleteDocument(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete document' }));
      throw new Error(err.error || 'Failed to delete document');
    }
    return res.json();
  }

  async fetchDriveSync(): Promise<{
    folder: { name: string; id: string; url: string };
    schedule: { time: string; timezone: string; cadence: string };
    lastSyncedAt: string | null;
    status: string;
    counts: { imported: number; duplicates: number; storedFiles: number; review: number; errors: string[] };
    processedFileIds: string[];
    resetAt: string | null;
  }> {
    const res = await fetch('/api/drive-sync');
    if (!res.ok) {
      throw new Error('Failed to fetch Drive sync status');
    }
    return res.json();
  }

  async postDriveSync(payload: {
    transactions?: Array<Record<string, unknown>>;
    files?: Array<Record<string, unknown>>;
    errors?: string[];
  }): Promise<{
    status: string;
    lastSyncedAt: string;
    transactionsImported: number;
    duplicatesSkipped: number;
    filesStored: number;
    filesNeedingReview: number;
    errors: string[];
    xpAwarded: number;
  }> {
    const res = await fetch('/api/drive-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Drive sync failed' }));
      throw new Error(err.error || 'Drive sync failed');
    }
    return res.json();
  }

  async acknowledgeSeenGameEvents(): Promise<void> {
    await fetch('/api/game/seen', { method: 'POST' }).catch(() => {});
  }

  async resetProgress(): Promise<{ success: boolean; game: unknown }> {
    const res = await fetch('/api/game', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'RESET LEDGERLY PROGRESS' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to reset progress' }));
      throw new Error(err.error || 'Failed to reset progress');
    }
    return res.json();
  }

  async eraseAllData(): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/state', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'DELETE ALL LEDGERLY DATA' }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to erase data' }));
      throw new Error(err.error || 'Failed to erase data');
    }
    return res.json();
  }

  async kidsLearn(params: {
    prompt: string;
    mode: 'ask' | 'story' | 'quiz' | 'need-vs-want';
    ageGroup?: 'junior' | 'explorer' | 'teen';
    language?: 'english' | 'hinglish' | 'hindi';
    storyStep?: number;
    storyChoice?: string;
  }): Promise<{ success: boolean; result: string; mode: string; source: string }> {
    const res = await fetch('/api/gemini/kids-learn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Kids learning request failed' }));
      throw new Error(err.error || 'Kids learning request failed');
    }
    return res.json();
  }
}

export const api = new ApiService();
