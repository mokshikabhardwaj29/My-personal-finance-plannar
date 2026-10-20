export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: string;
  amount: number;
  type: 'expense' | 'income';
  account: string;
  tags: string[];
  receipt: number; // 0 or 1
  source: string;
  fingerprint: string;
  createdAt: string;
}

export interface Tag {
  name: string;
  createdAt: string;
}

export interface Rule {
  id: string;
  whenText: string;
  thenText: string;
  enabled: number; // 0 or 1
  createdAt: string;
}

export interface DocumentMeta {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  objectKey: string;
  status: 'queued' | 'stored' | 'review';
  source: 'upload' | 'google-drive';
  createdAt: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  active: boolean;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  dueDate?: string;
  note?: string;
}

export interface Subscription {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  nextRenewalDate: string;
  account?: string;
  active: boolean;
}

export interface RecurringPayment {
  id: string;
  name: string;
  category: string;
  amount: number;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  nextDate: string;
  account?: string;
  active: boolean;
}

export interface GameBadge {
  id: string;
  title: string;
  description: string;
  criterion: string;
  unlocked: boolean;
  unlockedAt: string | null;
  icon: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  completed: boolean;
  progress: number;
  maxProgress: number;
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  rewardXp: number;
  completed: boolean;
  progress: number;
  maxProgress: number;
  endsAt: string;
}

export interface FirstStepItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  targetTab: string;
  actionLabel: string;
}

export interface GameDelta {
  xpAwarded: number;
  totalXp: number;
  level: number;
  levelTitle: string;
  leveledUp: boolean;
  newBadges: GameBadge[];
  questsCompleted: string[];
  streak: {
    current: number;
    longest: number;
    extendedToday: boolean;
    freezeUsed?: boolean;
  };
  pendingCelebration: boolean;
}

export interface GameProfile {
  showPenny: boolean;
  celebrations: boolean;
  sounds: boolean;
  animationLevel: 'follow' | 'full' | 'reduced';
}

export interface GameState {
  totalXp: number;
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
  currentStreak: number;
  longestStreak: number;
  freezes: number;
  recentActiveDates: string[];
  gameFreezeDates?: string[];
  badges: GameBadge[];
  todaysQuests: Quest[];
  weeklyChallenge: WeeklyChallenge;
  firstSteps: FirstStepItem[];
  recentEvents: Array<{
    id: string;
    type: string;
    xp: number;
    label: string;
    createdAt: string;
    localDate: string;
  }>;
  unseenEventCount: number;
  profile: GameProfile;
  userTimezone: string;
}

export interface DetectionSuggestion {
  patternKey: string;
  kind: 'subscription' | 'recurring';
  merchant: string;
  normalizedMerchant: string;
  category: string;
  cadence: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  occurrenceCount: number;
  confidence: 'High confidence' | 'Likely';
  averageAmount: number;
  monthlyEquivalent: number;
  annualEquivalent: number;
  lastDate: string;
  nextExpectedDate: string;
  amountVariationPercent: number;
}

export interface DetectedPatterns {
  subscriptions: DetectionSuggestion[];
  recurring: DetectionSuggestion[];
}

export interface AppSettings {
  categories?: string[];
  accounts?: string[];
  selectedPeriod?: string;
  userTimezone?: string;
  gameProfile?: GameProfile;
  dismissedPatterns?: string[];
  budgets?: Budget[];
  goals?: Goal[];
  subscriptions?: Subscription[];
  recurring?: RecurringPayment[];
  assetsTotal?: number;
  liabilitiesTotal?: number;
  netWorthConfigured?: boolean;
  freshStart?: boolean;
  driveResetAt?: string | null;
  driveFolderMeta?: {
    name: string;
    id: string;
    url: string;
  };
  driveSyncMeta?: {
    lastSyncedAt: string | null;
    status: string;
    lastCounts: {
      imported: number;
      duplicates: number;
      storedFiles: number;
      review: number;
      errors: string[];
    };
  };
}

export interface AppStatePayload {
  transactions: Transaction[];
  tags: Tag[];
  rules: Rule[];
  settings: AppSettings;
  documents: DocumentMeta[];
  game: GameState;
  detected: DetectedPatterns;
}

export type PeriodKey =
  | 'all-time'
  | 'this-month'
  | 'last-month'
  | 'last-3-months'
  | 'last-6-months'
  | 'this-year';

export type PennyMood =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'celebrate'
  | 'cheer'
  | 'thinking'
  | 'curious'
  | 'sleepy'
  | 'concerned'
  | 'proud'
  | 'peek'
  | 'comfort';
