import { db, GameEventRow } from './db.js';
import crypto from 'crypto';

export interface GameBadgeDefinition {
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
  newBadges: GameBadgeDefinition[];
  questsCompleted: string[];
  streak: {
    current: number;
    longest: number;
    extendedToday: boolean;
    freezeUsed?: boolean;
  };
  pendingCelebration: boolean;
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
  gameFreezeDates: string[];
  badges: GameBadgeDefinition[];
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
  profile: {
    showPenny: boolean;
    celebrations: boolean;
    sounds: boolean;
    animationLevel: 'follow' | 'full' | 'reduced';
  };
  userTimezone: string;
}

const LEVEL_TITLES = [
  'Saver Sprout',
  'Budget Buddy',
  'Cash Cadet',
  'Ledger Ranger',
  'Penny Pal',
  'Frugal Falcon',
  'Savings Sage',
  'Money Maestro',
  'Wealth Wizard',
  'Legend of the Ledger',
];

export function getLevelTitle(level: number): string {
  if (level < 1) return LEVEL_TITLES[0];
  if (level >= 10) return LEVEL_TITLES[9];
  return LEVEL_TITLES[level - 1];
}

// Cumulative XP required to reach level L: 50 * (L - 1) * L
export function getXpRequiredForLevel(level: number): number {
  if (level <= 1) return 0;
  return 50 * (level - 1) * level;
}

export function calculateLevelFromXp(totalXp: number): {
  level: number;
  levelTitle: string;
  xpIntoLevel: number;
  xpForNextLevel: number;
} {
  let level = 1;
  while (getXpRequiredForLevel(level + 1) <= totalXp) {
    level++;
  }
  const currentLevelBaseXp = getXpRequiredForLevel(level);
  const nextLevelBaseXp = getXpRequiredForLevel(level + 1);
  const xpIntoLevel = Math.max(0, totalXp - currentLevelBaseXp);
  const xpForNextLevel = nextLevelBaseXp - currentLevelBaseXp;

  return {
    level,
    levelTitle: getLevelTitle(level),
    xpIntoLevel,
    xpForNextLevel,
  };
}

export function getUserLocalDate(timezone?: string): string {
  const tz = timezone || db.getSetting<string>('userTimezone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Los_Angeles');
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date()); // YYYY-MM-DD
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

// Date helpers
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function getIsoWeek(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z');
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export class GameEngine {
  // Authoritative action awarder
  public awardAction(
    type: string,
    baseXp: number,
    refKey: string,
    meta: Record<string, unknown> = {},
    customLocalDate?: string
  ): GameDelta {
    const tz = db.getSetting<string>('userTimezone', 'America/Los_Angeles');
    const localDate = customLocalDate || getUserLocalDate(tz);

    const prevEvents = db.getGameEvents();
    const prevTotalXp = prevEvents.reduce((s, e) => s + e.xp, 0);
    const prevLevelInfo = calculateLevelFromXp(prevTotalXp);
    const prevStreak = this.calculateStreak(prevEvents, localDate);

    // 1. Idempotency check
    if (db.hasGameEventRefKey(refKey)) {
      return {
        xpAwarded: 0,
        totalXp: prevTotalXp,
        level: prevLevelInfo.level,
        levelTitle: prevLevelInfo.levelTitle,
        leveledUp: false,
        newBadges: [],
        questsCompleted: [],
        streak: {
          current: prevStreak.current,
          longest: prevStreak.longest,
          extendedToday: false,
        },
        pendingCelebration: false,
      };
    }

    // 2. Daily caps check
    let effectiveXp = baseXp;
    if (type === 'manual-entry') {
      const todayXp = db.getDailyXpForType('manual-entry', localDate);
      effectiveXp = Math.max(0, Math.min(baseXp, 50 - todayXp));
    } else if (type === 'categorize') {
      const todayXp = db.getDailyXpForType('categorize', localDate);
      effectiveXp = Math.max(0, Math.min(baseXp, 50 - todayXp));
    } else if (type === 'tag') {
      const todayXp = db.getDailyXpForType('tag', localDate);
      effectiveXp = Math.max(0, Math.min(baseXp, 20 - todayXp));
    } else if (type === 'goal-progress') {
      const todayXp = db.getDailyXpForType('goal-progress', localDate);
      effectiveXp = Math.max(0, Math.min(baseXp, 20 - todayXp));
    } else if (type === 'review-inbox-cleared') {
      const todayCount = prevEvents.filter((e) => e.type === 'review-inbox-cleared' && e.localDate === localDate).length;
      if (todayCount > 0) effectiveXp = 0;
    }

    // Insert game event if xp > 0 or even if 0 when it's an action marker
    const eventRow: GameEventRow = {
      id: crypto.randomUUID(),
      type,
      xp: effectiveXp,
      refKey,
      meta: JSON.stringify(meta),
      localDate,
      createdAt: new Date().toISOString(),
    };
    db.insertGameEvent(eventRow);

    // Recompute state after event
    const newEvents = db.getGameEvents();
    const newTotalXp = newEvents.reduce((s, e) => s + e.xp, 0);
    const newLevelInfo = calculateLevelFromXp(newTotalXp);
    const leveledUp = newLevelInfo.level > prevLevelInfo.level;
    const newStreak = this.calculateStreak(newEvents, localDate);

    // Check streak badges
    const newBadges: GameBadgeDefinition[] = [];
    this.checkStreakBadges(newStreak.current, newBadges);
    if (newLevelInfo.level >= 5) this.unlockBadge('level-5', newBadges);
    if (newLevelInfo.level >= 10) this.unlockBadge('level-10', newBadges);

    // Check quest progression
    const questsCompleted = this.checkQuestsProgression(type, localDate, newBadges);

    return {
      xpAwarded: effectiveXp,
      totalXp: newTotalXp,
      level: newLevelInfo.level,
      levelTitle: newLevelInfo.levelTitle,
      leveledUp,
      newBadges,
      questsCompleted,
      streak: {
        current: newStreak.current,
        longest: newStreak.longest,
        extendedToday: newStreak.current > prevStreak.current,
        freezeUsed: newStreak.freezeUsed,
      },
      pendingCelebration: effectiveXp > 0 || leveledUp || newBadges.length > 0 || questsCompleted.length > 0,
    };
  }

  // Streak calculations and auto-freeze
  public calculateStreak(events: GameEventRow[], todayLocalDate: string): {
    current: number;
    longest: number;
    freezeUsed: boolean;
    activeDates: string[];
    freezesHeld: number;
  } {
    const activeDatesSet = new Set<string>();
    for (const e of events) {
      if (e.xp > 0) {
        activeDatesSet.add(e.localDate);
      }
    }
    const sortedDates = Array.from(activeDatesSet).sort();

    // Check freeze usage
    let freezeDates = db.getSetting<string[]>('gameFreezeDates', []);
    let earnedFreezes = 0;
    // Streak calculations:
    // Every 7 days milestone grants 1 freeze, max 2.
    // Let's compute historical streak to count freezes earned:
    let maxStreak = 0;
    let streakCount = 0;
    let prevDate: string | null = null;

    for (const d of sortedDates) {
      if (!prevDate) {
        streakCount = 1;
      } else {
        const nextExpected = addDays(prevDate, 1);
        if (d === nextExpected) {
          streakCount++;
        } else {
          streakCount = 1;
        }
      }
      if (streakCount > maxStreak) {
        maxStreak = streakCount;
      }
      prevDate = d;
    }

    earnedFreezes = Math.floor(maxStreak / 7);
    const availableFreezes = Math.max(0, Math.min(2, earnedFreezes - freezeDates.length));

    // Calculate current streak leading up to today
    let current = 0;
    let checkDate = todayLocalDate;
    let freezeUsedTodayOrYesterday = false;

    // Is today active?
    if (activeDatesSet.has(checkDate)) {
      current++;
      checkDate = addDays(checkDate, -1);
    } else {
      // If today not active yet, is yesterday active?
      const yesterday = addDays(checkDate, -1);
      if (activeDatesSet.has(yesterday)) {
        checkDate = yesterday;
      } else if (availableFreezes > 0 && activeDatesSet.has(addDays(yesterday, -1))) {
        // Can freeze yesterday
        if (!freezeDates.includes(yesterday)) {
          freezeDates.push(yesterday);
          db.setSetting('gameFreezeDates', freezeDates);
          freezeUsedTodayOrYesterday = true;
        }
        checkDate = yesterday;
      } else {
        // Streak is 0
        return {
          current: 0,
          longest: Math.max(maxStreak, db.getSetting<number>('longestStreak', 0)),
          freezeUsed: false,
          activeDates: sortedDates.slice(-14),
          freezesHeld: availableFreezes,
        };
      }
    }

    // Walk backwards
    while (true) {
      if (activeDatesSet.has(checkDate)) {
        current++;
        checkDate = addDays(checkDate, -1);
      } else if (freezeDates.includes(checkDate)) {
        // Date was frozen
        current++;
        checkDate = addDays(checkDate, -1);
      } else if (availableFreezes > freezeDates.length) {
        // We have an available freeze that can bridge 1 missed day
        const dayBefore = addDays(checkDate, -1);
        if (activeDatesSet.has(dayBefore)) {
          freezeDates.push(checkDate);
          db.setSetting('gameFreezeDates', freezeDates);
          freezeUsedTodayOrYesterday = true;
          current++;
          checkDate = addDays(checkDate, -1);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    const savedLongest = db.getSetting<number>('longestStreak', 0);
    const finalLongest = Math.max(savedLongest, maxStreak, current);
    if (finalLongest > savedLongest) {
      db.setSetting('longestStreak', finalLongest);
    }

    return {
      current,
      longest: finalLongest,
      freezeUsed: freezeUsedTodayOrYesterday,
      activeDates: sortedDates.slice(-14),
      freezesHeld: Math.max(0, Math.min(2, earnedFreezes - freezeDates.length)),
    };
  }

  // Badges system (Section 6B.4)
  public getBadgeDefinitions(): GameBadgeDefinition[] {
    const unlockedBadges = db.getSetting<Record<string, string>>('gameBadges', {});

    const badges: Omit<GameBadgeDefinition, 'unlocked' | 'unlockedAt'>[] = [
      { id: 'first-step', title: 'First Step', description: 'Save the first transaction by any method', criterion: 'Save 1 transaction', icon: 'Footprints' },
      { id: 'importer', title: 'Importer', description: 'Complete the first CSV import with at least one new row', criterion: 'Import 1+ CSV rows', icon: 'FileSpreadsheet' },
      { id: 'paper-trail', title: 'Paper Trail', description: 'Attach your first receipt to a transaction', criterion: 'Attach 1 receipt', icon: 'Receipt' },
      { id: 'drive-dropper', title: 'Drive Dropper', description: 'First Drive sync that stores a file', criterion: 'Sync 1 Drive file', icon: 'Cloud' },
      { id: 'tidy-ledger', title: 'Tidy Ledger', description: 'Clear the Needs review inbox', criterion: '0 items in Needs review', icon: 'Sparkles' },
      { id: 'tag-team', title: 'Tag Team', description: 'Apply tags to 10 transactions', criterion: 'Tag 10 transactions', icon: 'Tag' },
      { id: 'net-worth-navigator', title: 'Net Worth Navigator', description: 'Save your net worth totals in Settings', criterion: 'Configure Net Worth', icon: 'Compass' },
      { id: 'budget-builder', title: 'Budget Builder', description: 'Create your first budget limit', criterion: 'Create 1 budget', icon: 'PieChart' },
      { id: 'under-the-line', title: 'Under the Line', description: 'Finish a past month at or under your budget', criterion: 'Month under budget', icon: 'ShieldCheck' },
      { id: 'goal-getter', title: 'Goal Getter', description: 'Create your first savings goal', criterion: 'Create 1 goal', icon: 'Target' },
      { id: 'quarter-mile', title: 'Quarter Mile', description: 'Reach 25% on any savings goal', criterion: 'Reach 25% goal progress', icon: 'Flag' },
      { id: 'finish-line', title: 'Finish Line', description: 'Reach 100% on any savings goal', criterion: 'Reach 100% goal progress', icon: 'Trophy' },
      { id: 'pattern-spotter', title: 'Pattern Spotter', description: 'Keep the first recurring or subscription suggestion', criterion: 'Keep 1 detected suggestion', icon: 'Search' },
      { id: 'rule-maker', title: 'Rule Maker', description: 'Create your first categorization rule', criterion: 'Create 1 rule', icon: 'Sliders' },
      { id: 'streak-3', title: '3-Day Spark', description: 'Reach a streak of 3 active days', criterion: '3-day streak', icon: 'Flame' },
      { id: 'streak-7', title: '7-Day Flame', description: 'Reach a streak of 7 active days', criterion: '7-day streak', icon: 'Flame' },
      { id: 'streak-30', title: '30-Day Blaze', description: 'Reach a streak of 30 active days', criterion: '30-day streak', icon: 'Flame' },
      { id: 'streak-100', title: '100-Day Inferno', description: 'Reach a streak of 100 active days', criterion: '100-day streak', icon: 'Flame' },
      { id: 'level-5', title: 'Level 5', description: 'Reach level 5 (Penny Pal)', criterion: 'Reach Level 5', icon: 'Star' },
      { id: 'level-10', title: 'Level 10', description: 'Reach level 10 (Legend of the Ledger)', criterion: 'Reach Level 10', icon: 'Crown' },
      { id: 'quest-master', title: 'Quest Master', description: 'Complete 25 daily quests', criterion: 'Complete 25 quests', icon: 'Award' },
      { id: 'fresh-start', title: 'Fresh Start', description: 'Used the data wipe to start fresh', criterion: 'Use data wipe', icon: 'RotateCcw' },
    ];

    return badges.map((b) => ({
      ...b,
      unlocked: Boolean(unlockedBadges[b.id]),
      unlockedAt: unlockedBadges[b.id] || null,
    }));
  }

  public unlockBadge(badgeId: string, outNewBadges?: GameBadgeDefinition[]): boolean {
    const unlockedBadges = db.getSetting<Record<string, string>>('gameBadges', {});
    if (unlockedBadges[badgeId]) return false;

    const now = new Date().toISOString();
    unlockedBadges[badgeId] = now;
    db.setSetting('gameBadges', unlockedBadges);

    const all = this.getBadgeDefinitions();
    const found = all.find((b) => b.id === badgeId);
    if (found && outNewBadges) {
      outNewBadges.push(found);
    }
    return true;
  }

  private checkStreakBadges(currentStreak: number, outNewBadges: GameBadgeDefinition[]) {
    if (currentStreak >= 3) this.unlockBadge('streak-3', outNewBadges);
    if (currentStreak >= 7) this.unlockBadge('streak-7', outNewBadges);
    if (currentStreak >= 30) this.unlockBadge('streak-30', outNewBadges);
    if (currentStreak >= 100) this.unlockBadge('streak-100', outNewBadges);
  }

  // Daily Quests and Weekly Challenge (Section 6B.5)
  public getTodaysQuests(localDate: string): Quest[] {
    const transactions = db.getTransactions();
    const budgets = db.getSetting<unknown[]>('budgets', []);
    const goals = db.getSetting<unknown[]>('goals', []);
    const needsReviewCount = transactions.filter((t) => t.category === 'Needs review').length;

    // Deterministic selection seeded by localDate string
    let hash = 0;
    for (let i = 0; i < localDate.length; i++) {
      hash = (hash << 5) - hash + localDate.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    const pool: Array<{ id: string; title: string; description: string; achievable: boolean; actionType: string }> = [
      { id: 'quest-log-tx', title: 'Log a transaction', description: 'Add or import a transaction today', achievable: true, actionType: 'tx-added' },
      { id: 'quest-categorize', title: 'Sort Needs Review', description: 'Categorize a transaction in Needs review', achievable: needsReviewCount > 0, actionType: 'categorize' },
      { id: 'quest-tag', title: 'Add a tag', description: 'Tag any transaction for clearer tracking', achievable: transactions.length > 0, actionType: 'tag' },
      { id: 'quest-receipt', title: 'Attach a receipt', description: 'Link a receipt or proof to a transaction', achievable: true, actionType: 'receipt-attached' },
      { id: 'quest-document', title: 'Upload a document', description: 'Store a statement or bill in your vault', achievable: true, actionType: 'document-upload' },
      { id: 'quest-budget', title: 'Check your budgets', description: 'Review your budget spending health', achievable: budgets.length > 0, actionType: 'budget-reviewed' },
      { id: 'quest-goal', title: 'Update a goal', description: 'Add progress towards one of your savings goals', achievable: goals.length > 0, actionType: 'goal-progress' },
    ];

    const achievablePool = pool.filter((p) => p.achievable);
    const count = Math.min(3, achievablePool.length);

    // Pick count items deterministically
    const selected: Quest[] = [];
    const questState = db.getSetting<Record<string, { completed: boolean; date: string }>>('gameQuestState', {});

    for (let i = 0; i < count; i++) {
      const idx = (seed + i * 3) % achievablePool.length;
      const item = achievablePool.splice(idx, 1)[0];
      const key = `${localDate}:${item.id}`;
      const isCompleted = Boolean(questState[key]?.completed);

      selected.push({
        id: item.id,
        title: item.title,
        description: item.description,
        rewardXp: 10,
        completed: isCompleted,
        progress: isCompleted ? 1 : 0,
        maxProgress: 1,
      });
    }

    return selected;
  }

  public getWeeklyChallenge(localDate: string): WeeklyChallenge {
    const isoWeek = getIsoWeek(localDate);
    const events = db.getGameEvents().filter((e) => getIsoWeek(e.localDate) === isoWeek && e.xp > 0);
    const uniqueDays = new Set(events.map((e) => e.localDate)).size;

    const completed = uniqueDays >= 5;

    // End of week (Sunday)
    const d = new Date(localDate + 'T12:00:00Z');
    const day = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + (7 - day));
    const endsAt = d.toISOString().slice(0, 10);

    return {
      id: `weekly-${isoWeek}`,
      title: 'Active Rhythm',
      description: 'Record financial activity on 5 different days this week',
      rewardXp: 50,
      completed,
      progress: Math.min(5, uniqueDays),
      maxProgress: 5,
      endsAt,
    };
  }

  private checkQuestsProgression(actionType: string, localDate: string, outNewBadges: GameBadgeDefinition[]): string[] {
    const todaysQuests = this.getTodaysQuests(localDate);
    const questState = db.getSetting<Record<string, { completed: boolean; date: string }>>('gameQuestState', {});
    const completedNow: string[] = [];

    for (const q of todaysQuests) {
      const key = `${localDate}:${q.id}`;
      if (questState[key]?.completed) continue;

      let matched = false;
      if (q.id === 'quest-log-tx' && (actionType === 'manual-entry' || actionType === 'csv-import' || actionType === 'drive-sync')) matched = true;
      if (q.id === 'quest-categorize' && actionType === 'categorize') matched = true;
      if (q.id === 'quest-tag' && actionType === 'tag') matched = true;
      if (q.id === 'quest-receipt' && actionType === 'receipt-attached') matched = true;
      if (q.id === 'quest-document' && actionType === 'document-upload') matched = true;
      if (q.id === 'quest-goal' && actionType === 'goal-progress') matched = true;

      if (matched) {
        questState[key] = { completed: true, date: localDate };
        completedNow.push(q.id);

        // Award quest XP
        const questRef = `quest:${localDate}:${q.id}`;
        if (!db.hasGameEventRefKey(questRef)) {
          db.insertGameEvent({
            id: crypto.randomUUID(),
            type: 'quest-complete',
            xp: 10,
            refKey: questRef,
            meta: JSON.stringify({ questId: q.id, title: q.title }),
            localDate,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    db.setSetting('gameQuestState', questState);

    // Check if all today's quests are completed -> +15 bonus!
    const allDone = todaysQuests.length > 0 && todaysQuests.every((q) => questState[`${localDate}:${q.id}`]?.completed || completedNow.includes(q.id));
    if (allDone) {
      const bonusRef = `quest-bonus:${localDate}`;
      if (!db.hasGameEventRefKey(bonusRef)) {
        db.insertGameEvent({
          id: crypto.randomUUID(),
          type: 'quest-bonus',
          xp: 15,
          refKey: bonusRef,
          meta: JSON.stringify({ note: 'Completed all daily quests bonus' }),
          localDate,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Check Quest Master badge (25 completed quests)
    const totalQuestsCompleted = Object.values(questState).filter((s) => s.completed).length;
    if (totalQuestsCompleted >= 25) {
      this.unlockBadge('quest-master', outNewBadges);
    }

    return completedNow;
  }

  // First Steps Checklist (Section 6B.5)
  public getFirstSteps(): FirstStepItem[] {
    const txs = db.getTransactions();
    const netWorthConfigured = db.getSetting<boolean>('netWorthConfigured', false);
    const budgets = db.getSetting<unknown[]>('budgets', []);
    const goals = db.getSetting<unknown[]>('goals', []);
    const docs = db.getDocuments();

    return [
      {
        id: 'step-tx',
        title: 'Add or import first transaction',
        description: 'Record an income or expense to jump-start your ledger',
        completed: txs.length > 0,
        targetTab: 'transactions',
        actionLabel: 'Add Entry',
      },
      {
        id: 'step-net-worth',
        title: 'Set your net worth',
        description: 'Enter your starting assets and liabilities in Settings',
        completed: Boolean(netWorthConfigured),
        targetTab: 'settings',
        actionLabel: 'Configure Net Worth',
      },
      {
        id: 'step-budget',
        title: 'Create a monthly budget',
        description: 'Set a spending limit for groceries, dining, or shopping',
        completed: budgets.length > 0,
        targetTab: 'budgets',
        actionLabel: 'Create Budget',
      },
      {
        id: 'step-goal',
        title: 'Create a savings goal',
        description: 'Plan for an emergency fund, travel, or a big purchase',
        completed: goals.length > 0,
        targetTab: 'goals',
        actionLabel: 'Create Goal',
      },
      {
        id: 'step-document',
        title: 'Add a document or sync Drive',
        description: 'Upload a receipt or connect your Drive financial inbox',
        completed: docs.length > 0,
        targetTab: 'documents',
        actionLabel: 'Upload Document',
      },
    ];
  }

  // Lazy evaluation of past month budgets (Section 6B.1: Budget month win)
  public evaluatePastBudgetWins(localDate: string): void {
    const budgets = db.getSetting<Array<{ id: string; category: string; limit: number; active: boolean }>>('budgets', []);
    if (!budgets || budgets.length === 0) return;

    // Check last month (e.g. if today is 2026-10-19, check 2026-09)
    const [yearStr, monthStr] = localDate.split('-');
    let lastMonthYear = parseInt(yearStr, 10);
    let lastMonthNum = parseInt(monthStr, 10) - 1;
    if (lastMonthNum === 0) {
      lastMonthNum = 12;
      lastMonthYear -= 1;
    }
    const lastMonthPrefix = `${lastMonthYear}-${String(lastMonthNum).padStart(2, '0')}`;

    const transactions = db.getTransactions();
    const lastMonthExpenses = transactions.filter((t) => t.type === 'expense' && t.date.startsWith(lastMonthPrefix));

    for (const b of budgets) {
      if (!b.active) continue;
      const spent = lastMonthExpenses
        .filter((t) => t.category.toLowerCase() === b.category.toLowerCase())
        .reduce((sum, t) => sum + t.amount, 0);

      if (spent <= b.limit && spent > 0) {
        const refKey = `budget-month-win:${b.id}:${lastMonthPrefix}`;
        if (!db.hasGameEventRefKey(refKey)) {
          this.awardAction('budget-month-win', 25, refKey, {
            budgetCategory: b.category,
            month: lastMonthPrefix,
            spent,
            limit: b.limit,
          }, localDate);
          this.unlockBadge('under-the-line');
        }
      }
    }
  }

  // Full state compilation
  public getFullGameState(): GameState {
    const tz = db.getSetting<string>('userTimezone', 'America/Los_Angeles');
    const localDate = getUserLocalDate(tz);

    this.evaluatePastBudgetWins(localDate);

    const events = db.getGameEvents();
    const totalXp = events.reduce((sum, e) => sum + e.xp, 0);
    const levelInfo = calculateLevelFromXp(totalXp);
    const streakInfo = this.calculateStreak(events, localDate);

    const badges = this.getBadgeDefinitions();
    const todaysQuests = this.getTodaysQuests(localDate);
    const weeklyChallenge = this.getWeeklyChallenge(localDate);
    const firstSteps = this.getFirstSteps();

    const seenThrough = db.getSetting<string>('gameSeenThrough', '');
    const unseenEventCount = events.filter((e) => !seenThrough || e.createdAt > seenThrough).length;

    const profile = db.getSetting('gameProfile', {
      showPenny: true,
      celebrations: true,
      sounds: false,
      animationLevel: 'follow' as const,
    });

    const recentEvents = events.slice(0, 20).map((e) => {
      let label = e.type.replace(/-/g, ' ');
      try {
        const m = JSON.parse(e.meta);
        if (m.title) label = m.title;
        else if (m.merchant) label = `Entry: ${m.merchant}`;
        else if (m.category) label = `Categorized: ${m.category}`;
      } catch {
        // use default label
      }
      return {
        id: e.id,
        type: e.type,
        xp: e.xp,
        label,
        createdAt: e.createdAt,
        localDate: e.localDate,
      };
    });

    return {
      totalXp,
      level: levelInfo.level,
      levelTitle: levelInfo.levelTitle,
      xpIntoLevel: levelInfo.xpIntoLevel,
      xpForNextLevel: levelInfo.xpForNextLevel,
      currentStreak: streakInfo.current,
      longestStreak: streakInfo.longest,
      freezes: streakInfo.freezesHeld,
      recentActiveDates: streakInfo.activeDates,
      gameFreezeDates: db.getSetting<string[]>('gameFreezeDates', []),
      badges,
      todaysQuests,
      weeklyChallenge,
      firstSteps,
      recentEvents,
      unseenEventCount,
      profile,
      userTimezone: tz,
    };
  }
}

export const gameEngine = new GameEngine();
