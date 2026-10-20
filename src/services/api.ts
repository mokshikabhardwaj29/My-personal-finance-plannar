import {
  AppStatePayload,
  Transaction,
  GameDelta,
  AppSettings,
  DocumentMeta,
  UserProfile,
  DatabaseStatus,
  QueryResult,
  VerificationSuiteResult,
} from '../types';

export class ApiService {
  private token: string | null = null;

  constructor() {
    try {
      this.token = localStorage.getItem('ledgerly_auth_token') || sessionStorage.getItem('ledgerly_auth_token');
    } catch {
      this.token = null;
    }
  }

  public setAuthToken(token: string | null, remember = true) {
    this.token = token;
    try {
      if (token) {
        if (remember) {
          localStorage.setItem('ledgerly_auth_token', token);
        } else {
          sessionStorage.setItem('ledgerly_auth_token', token);
        }
      } else {
        localStorage.removeItem('ledgerly_auth_token');
        sessionStorage.removeItem('ledgerly_auth_token');
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  public getAuthToken(): string | null {
    return this.token;
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = { ...customHeaders };
    if (this.token) {
      headers['x-ledgerly-owner-key'] = this.token;
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  // ==========================================================================
  // Multi-User Authentication & Family Session
  // ==========================================================================

  async getClaimStatus(): Promise<{ ownershipClaimed: boolean }> {
    const res = await fetch('/api/auth/claim-status');
    if (!res.ok) return { ownershipClaimed: false };
    return res.json();
  }

  async register(payload: {
    email: string;
    password: string;
    displayName: string;
    remember?: boolean;
  }): Promise<{
    success: boolean;
    sessionToken: string;
    user: { id: string; email: string; emailVerified: boolean; status: string };
    profile: any;
    family: any;
    role: 'owner' | 'parent' | 'child';
  }> {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Registration failed' }));
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    this.setAuthToken(data.sessionToken, payload.remember ?? true);
    return data;
  }

  async login(payload: {
    email: string;
    password?: string;
    remember?: boolean;
  }): Promise<{
    success: boolean;
    sessionToken: string;
    user: { id: string; email: string; emailVerified: boolean; status: string };
    profile: any;
    family: any;
    role: 'owner' | 'parent' | 'child';
  }> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Login failed' }));
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    this.setAuthToken(data.sessionToken, payload.remember ?? true);
    return data;
  }

  async pinUnlock(payload: {
    userId: string;
    pin: string;
    remember?: boolean;
  }): Promise<{
    success: boolean;
    sessionToken: string;
    user: { id: string; email: string; emailVerified: boolean; status: string };
    profile: any;
    family: any;
    role: 'owner' | 'parent' | 'child';
  }> {
    const res = await fetch('/api/auth/pin-unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'PIN unlock failed' }));
      throw new Error(err.error || 'PIN unlock failed');
    }
    const data = await res.json();
    this.setAuthToken(data.sessionToken, payload.remember ?? true);
    return data;
  }

  async verifyEmail(token: string): Promise<{ success: boolean; user: any }> {
    const res = await fetch('/api/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Verification failed' }));
      throw new Error(err.error || 'Verification failed');
    }
    return res.json();
  }

  async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to request password reset' }));
      throw new Error(err.error || 'Failed to request password reset');
    }
    return res.json();
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Password reset failed' }));
      throw new Error(err.error || 'Password reset failed');
    }
    return res.json();
  }

  async getMe(): Promise<{
    authenticated: boolean;
    user: { id: string; email: string; emailVerified: boolean; status: string } | null;
    profile: any | null;
    family: any | null;
    role: 'owner' | 'parent' | 'child' | null;
  }> {
    return this.getSession();
  }

  async getSession(): Promise<{
    authenticated: boolean;
    user: { id: string; email: string; emailVerified: boolean; status: string } | null;
    profile: any | null;
    family: any | null;
    role: 'owner' | 'parent' | 'child' | null;
  }> {
    let res: Response;
    try {
      res = await fetch('/api/auth/session', {
        headers: this.getHeaders(),
      });
    } catch {
      const netErr = new Error('Network failure: Unable to reach NotePay server. Please check your connection.');
      (netErr as any).isNetworkError = true;
      throw netErr;
    }

    if (!res.ok) {
      if (res.status === 401) {
        this.setAuthToken(null);
        return { authenticated: false, user: null, profile: null, family: null, role: null };
      }
      if (res.status === 403) {
        const authErr = new Error('Forbidden: You do not have permission to access this resource.');
        (authErr as any).status = 403;
        throw authErr;
      }
      if (res.status >= 500) {
        const srvErr = new Error(`Server error (${res.status}): Failed to verify session`);
        (srvErr as any).status = res.status;
        throw srvErr;
      }
      const connErr = new Error(`Connection error (${res.status}): Failed to verify session`);
      (connErr as any).status = res.status;
      throw connErr;
    }

    const data = await res.json();
    if (!data.authenticated) {
      this.setAuthToken(null);
    }
    return data;
  }

  async completeOnboarding(payload: {
    displayName?: string;
    dateOfBirth?: string;
    age?: number;
    gender?: 'male' | 'female' | 'non-binary' | 'prefer_not_to_say' | null;
    interests?: string[];
    preferences?: Record<string, unknown>;
    quickPin?: string;
  }): Promise<{ success: boolean; profile: any }> {
    const res = await fetch('/api/auth/onboarding', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to complete onboarding' }));
      throw new Error(err.error || 'Failed to complete onboarding');
    }
    return res.json();
  }

  async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      });
    } finally {
      this.setAuthToken(null);
    }
  }

  async getFamilyMembers(): Promise<{ family: any; members: any[] }> {
    const res = await fetch('/api/family/members', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch family members' }));
      throw new Error(err.error || 'Failed to fetch family members');
    }
    return res.json();
  }

  async createChild(payload: {
    displayName: string;
    age: number;
    dateOfBirth?: string;
    quickPin: string;
    parentalConsentGranted: boolean;
  }): Promise<{ success: boolean; childUser: any; childProfile: any; consent: any }> {
    const res = await fetch('/api/family/children', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to create child account' }));
      throw new Error(err.error || 'Failed to create child account');
    }
    return res.json();
  }

  async deleteChild(childId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/family/children/${encodeURIComponent(childId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to delete child account' }));
      throw new Error(err.error || 'Failed to delete child account');
    }
    return res.json();
  }

  async inviteMember(payload: {
    email: string;
    role: 'parent' | 'child';
    displayName?: string;
  }): Promise<{ success: boolean; user: any; profile: any }> {
    const res = await fetch('/api/family/invites', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to invite family member' }));
      throw new Error(err.error || 'Failed to invite family member');
    }
    return res.json();
  }

  async removeMember(userId: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/family/members/${encodeURIComponent(userId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to remove member' }));
      throw new Error(err.error || 'Failed to remove member');
    }
    return res.json();
  }

  async getFamilyAuditLogs(): Promise<{ logs: any[] }> {
    const res = await fetch('/api/family/audit-log', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch audit log' }));
      throw new Error(err.error || 'Failed to fetch audit log');
    }
    return res.json();
  }

  // ==========================================================================
  // Database & D1 Introspection
  // ==========================================================================

  async getDatabaseStatus(): Promise<DatabaseStatus> {
    const res = await fetch('/api/database/status', {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch database status' }));
      throw new Error(err.error || 'Failed to fetch database status');
    }
    return res.json();
  }

  async getTableRows(
    tableName: string,
    options: { page?: number; limit?: number; search?: string } = {}
  ): Promise<{ tableName: string; page: number; limit: number; total: number; rows: unknown[] }> {
    const params = new URLSearchParams();
    if (options.page) params.set('page', String(options.page));
    if (options.limit) params.set('limit', String(options.limit));
    if (options.search) params.set('search', options.search);

    const res = await fetch(`/api/database/tables/${encodeURIComponent(tableName)}?${params.toString()}`, {
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch table records' }));
      throw new Error(err.error || 'Failed to fetch table records');
    }
    return res.json();
  }

  async executeDatabaseQuery(sql: string): Promise<QueryResult> {
    const res = await fetch('/api/database/query', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ sql }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Query execution error' }));
      throw new Error(err.error || 'Query execution error');
    }
    return res.json();
  }

  async runDatabaseVerification(): Promise<VerificationSuiteResult> {
    const res = await fetch('/api/database/verify', {
      method: 'POST',
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Verification test run failed' }));
      throw new Error(err.error || 'Verification test run failed');
    }
    return res.json();
  }

  // ==========================================================================
  // Financial State & Transactions
  // ==========================================================================

  async fetchState(): Promise<AppStatePayload> {
    let res: Response;
    try {
      res = await fetch('/api/state', {
        headers: this.getHeaders(),
      });
    } catch {
      const netErr = new Error('Network failure: Unable to reach NotePay server. Please check your connection.');
      (netErr as any).isNetworkError = true;
      throw netErr;
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to fetch state' }));
      const error = new Error(err.error || 'Failed to fetch state');
      (error as any).status = res.status;
      throw error;
    }
    return res.json();
  }

  async createTransactions(
    items: Partial<Transaction> | Array<Partial<Transaction>>
  ): Promise<{ inserted: number; duplicates: number; transactions: Transaction[]; gameDelta: GameDelta }> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
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
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
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
      headers: this.getHeaders(),
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
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
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
      headers: this.getHeaders(),
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
      headers: this.getHeaders(),
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
    const res = await fetch('/api/drive-sync', {
      headers: this.getHeaders(),
    });
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
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Drive sync failed' }));
      throw new Error(err.error || 'Drive sync failed');
    }
    return res.json();
  }

  async acknowledgeSeenGameEvents(): Promise<void> {
    await fetch('/api/game/seen', {
      method: 'POST',
      headers: this.getHeaders(),
    }).catch(() => {});
  }

  async resetProgress(): Promise<{ success: boolean; game: unknown }> {
    const res = await fetch('/api/game', {
      method: 'DELETE',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ confirmation: 'RESET NOTEPAY PROGRESS' }),
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
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ confirmation: 'DELETE ALL NOTEPAY DATA' }),
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
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
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
