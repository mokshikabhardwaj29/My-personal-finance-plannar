import React, { useState, useEffect, useCallback } from 'react';
import {
  AppStatePayload,
  Transaction,
  Tag,
  Rule,
  Budget,
  Goal,
  Subscription,
  RecurringPayment,
  PeriodKey,
  GameDelta,
  DetectionSuggestion,
  UserProfile,
} from './types';
import { api } from './services/api';
import { Navigation, TabKey } from './components/Navigation';
import { Penny } from './components/Penny';
import { CelebrationManager } from './components/CelebrationManager';

// Modals
import { AddEntryModal } from './components/modals/AddEntryModal';
import { ImportModal } from './components/modals/ImportModal';
import { TagModal } from './components/modals/TagModal';
import { BudgetModal } from './components/modals/BudgetModal';
import { GoalModal } from './components/modals/GoalModal';
import { RecurringModal } from './components/modals/RecurringModal';
import { SubscriptionModal } from './components/modals/SubscriptionModal';
import { RuleModal } from './components/modals/RuleModal';
import { DriveSyncModal } from './components/modals/DriveSyncModal';
import { ResetProgressModal } from './components/modals/ResetProgressModal';
import { DataWipeModal } from './components/modals/DataWipeModal';
import { SwitchMemberModal } from './components/modals/SwitchMemberModal';
import { ShieldAlert } from 'lucide-react';

// Pages
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { RecurringPage } from './pages/RecurringPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GoalsPage } from './pages/GoalsPage';
import { RewardsPage } from './pages/RewardsPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { RulesPage } from './pages/RulesPage';
import { SettingsPage } from './pages/SettingsPage';
import { KidsAcademyPage } from './pages/KidsAcademyPage';
import { AuthPage } from './pages/AuthPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DatabasePage } from './pages/DatabasePage';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appState, setAppState] = useState<AppStatePayload | null>(null);

  // Authentication & Session
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isSwitchMemberOpen, setIsSwitchMemberOpen] = useState(false);

  // Tab navigation
  const [currentTab, setCurrentTab] = useState<TabKey>('dashboard');

  // Working Date Period selector (shared between Dashboard and Transactions, persisted in settings.selectedPeriod)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>('all-time');

  // Gamification & Celebrations
  const [lastGameDelta, setLastGameDelta] = useState<GameDelta | null>(null);
  const [awaySummary, setAwaySummary] = useState<{
    xpEarned: number;
    newBadgesCount: number;
    syncCount: number;
  } | null>(null);

  // Modal visibility states
  const [isAddEntryOpen, setIsAddEntryOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isDriveSyncOpen, setIsDriveSyncOpen] = useState(false);
  const [isResetProgressOpen, setIsResetProgressOpen] = useState(false);
  const [isDataWipeOpen, setIsDataWipeOpen] = useState(false);

  // Editing modals
  const [tagModalTx, setTagModalTx] = useState<Transaction | null>(null);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringPayment | null>(null);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<Subscription | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);

  // Initial load
  const loadState = useCallback(async () => {
    try {
      setLoadError(null);
      const [data, sess] = await Promise.all([
        api.fetchState(),
        api.getSession().catch(() => ({ authenticated: false, user: null })),
      ]);
      setAppState(data);

      if (sess && sess.user) {
        setCurrentUser({
          id: sess.user.id,
          email: sess.user.email,
          name: sess.profile?.displayName || sess.user.email.split('@')[0],
          role: sess.role || 'owner',
        });
        setUserProfile(sess.profile);
      }

      // Period restore
      const savedPeriod = (data.settings.selectedPeriod as PeriodKey) || 'all-time';
      setSelectedPeriod(savedPeriod);

      // Check for unseen away activity from 8:00 AM automation
      if (data.game && data.game.unseenEventCount > 0) {
        const events = data.game.recentEvents || [];
        const driveEvents = events.filter((e) => e.type === 'drive-sync');
        if (driveEvents.length > 0) {
          const xp = driveEvents.reduce((s, e) => s + e.xp, 0);
          setAwaySummary({
            xpEarned: xp,
            newBadgesCount: data.game.badges.filter((b) => b.unlocked).length,
            syncCount: driveEvents.length,
          });
        }
      }
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to connect to Ledgerly');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAuthSuccess = (sessionData: {
    user: any;
    profile: any;
    family: any;
    role: 'owner' | 'parent' | 'child';
  }) => {
    setCurrentUser({
      id: sessionData.user.id,
      email: sessionData.user.email,
      name: sessionData.profile?.displayName || sessionData.user.email.split('@')[0],
      role: sessionData.role,
    });
    setUserProfile(sessionData.profile);
    setIsLocked(false);
    if (sessionData.role === 'child') {
      setCurrentTab('kids');
    }
    loadState();
  };

  const handleOnboardingCompleted = (updatedProfile: any) => {
    setUserProfile(updatedProfile);
    if (currentUser) {
      setCurrentUser({
        ...currentUser,
        name: updatedProfile.displayName || currentUser.name,
      });
    }
    loadState();
  };

  const handleSwitchedMember = (user: UserProfile) => {
    setCurrentUser(user);
    if (user.role === 'child') {
      setCurrentTab('kids');
    }
    loadState();
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setUserProfile(null);
    setIsLocked(true);
  };

  useEffect(() => {
    loadState();
  }, [loadState]);

  // Persist selected period
  const handleSelectPeriod = async (period: PeriodKey) => {
    setSelectedPeriod(period);
    try {
      await api.savePreferences({ selectedPeriod: period });
      if (appState) {
        setAppState({
          ...appState,
          settings: { ...appState.settings, selectedPeriod: period },
        });
      }
    } catch {
      // Revert if saving fails
      if (appState?.settings.selectedPeriod) {
        setSelectedPeriod(appState.settings.selectedPeriod as PeriodKey);
      }
    }
  };

  // Add transaction handler
  const handleSaveTransaction = async (
    txData: Partial<Transaction>,
    receiptFile?: File
  ): Promise<GameDelta | null> => {
    const res = await api.createTransactions(txData);
    if (res.gameDelta) {
      setLastGameDelta(res.gameDelta);
    }

    if (receiptFile) {
      await api.uploadDocuments([receiptFile]);
    }

    await loadState();
    return res.gameDelta;
  };

  // CSV Import handler
  const handleImportCsv = async (
    csvRows: Array<{
      date: string;
      merchant: string;
      amount: number;
      type: 'expense' | 'income';
      category?: string;
      account?: string;
    }>
  ) => {
    const res = await api.createTransactions(
      csvRows.map((r) => ({ ...r, source: 'csv' }))
    );
    if (res.gameDelta) {
      setLastGameDelta(res.gameDelta);
    }
    await loadState();
    return res;
  };

  // Upload documents handler
  const handleUploadDocs = async (files: File[]) => {
    const res = await api.uploadDocuments(files);
    if (res.gameDelta) {
      setLastGameDelta(res.gameDelta);
    }
    await loadState();
    return { count: res.documents.length, gameDelta: res.gameDelta };
  };

  // Inline Category update handler (Section 8.1)
  const handleUpdateCategory = async (id: string, newCategory: string) => {
    try {
      const res = await api.updateTransaction(id, { category: newCategory });
      if (res.gameDelta && res.gameDelta.xpAwarded > 0) {
        setLastGameDelta(res.gameDelta);
      }
      // Update state without full page flash
      if (appState) {
        const updatedTxs = appState.transactions.map((t) =>
          t.id === id ? { ...t, category: newCategory } : t
        );
        setAppState({
          ...appState,
          transactions: updatedTxs,
          game: {
            ...appState.game,
            totalXp: res.gameDelta?.totalXp || appState.game.totalXp,
            level: res.gameDelta?.level || appState.game.level,
          },
        });
      }
    } catch (err) {
      alert('Failed to update category.');
    }
  };

  // Inline Tag remove handler
  const handleRemoveTag = async (id: string, tagToRemove: string) => {
    if (!appState) return;
    const target = appState.transactions.find((t) => t.id === id);
    if (!target) return;
    const newTags = target.tags.filter((t) => t.toLowerCase() !== tagToRemove.toLowerCase());
    await api.updateTransaction(id, { tags: newTags });
    await loadState();
  };

  // Tag modal save handler
  const handleSaveTagsFromModal = async (txId: string, tags: string[]) => {
    const res = await api.updateTransaction(txId, { tags });
    if (res.gameDelta && res.gameDelta.xpAwarded > 0) {
      setLastGameDelta(res.gameDelta);
    }
    await loadState();
  };

  // Delete transaction handler
  const handleDeleteTransaction = async (id: string) => {
    await api.deleteTransaction(id);
    await loadState();
  };

  // Save budget handler
  const handleSaveBudget = async (budget: Partial<Budget>) => {
    if (!appState) return;
    const current = appState.settings.budgets || [];
    let updated: Budget[];
    if (budget.id) {
      updated = current.map((b) => (b.id === budget.id ? ({ ...b, ...budget } as Budget) : b));
    } else {
      updated = [...current, { ...budget, id: `budget_${Date.now()}` } as Budget];
    }
    const res = await api.savePreferences({ budgets: updated });
    if (res.gameDelta) setLastGameDelta(res.gameDelta);
    await loadState();
  };

  const handleDeleteBudget = async (id: string) => {
    if (!appState) return;
    const current = appState.settings.budgets || [];
    const updated = current.filter((b) => b.id !== id);
    await api.savePreferences({ budgets: updated });
    await loadState();
  };

  // Save goal handler
  const handleSaveGoal = async (goal: Partial<Goal>) => {
    if (!appState) return;
    const current = appState.settings.goals || [];
    let updated: Goal[];
    if (goal.id) {
      updated = current.map((g) => (g.id === goal.id ? ({ ...g, ...goal } as Goal) : g));
    } else {
      updated = [...current, { ...goal, id: `goal_${Date.now()}` } as Goal];
    }
    const res = await api.savePreferences({ goals: updated });
    if (res.gameDelta) setLastGameDelta(res.gameDelta);
    await loadState();
  };

  const handleDeleteGoal = async (id: string) => {
    if (!appState) return;
    const current = appState.settings.goals || [];
    const updated = current.filter((g) => g.id !== id);
    await api.savePreferences({ goals: updated });
    await loadState();
  };

  const handleQuickAddGoalProgress = async (goal: Goal, addAmount: number) => {
    const newCurrent = goal.current + addAmount;
    await handleSaveGoal({ ...goal, current: newCurrent });
  };

  // Recurring bills handler
  const handleSaveRecurring = async (item: Partial<RecurringPayment>) => {
    if (!appState) return;
    const current = appState.settings.recurring || [];
    let updated: RecurringPayment[];
    if (item.id) {
      updated = current.map((r) => (r.id === item.id ? ({ ...r, ...item } as RecurringPayment) : r));
    } else {
      updated = [...current, { ...item, id: `rec_${Date.now()}` } as RecurringPayment];
    }
    const res = await api.savePreferences({ recurring: updated });
    if (res.gameDelta) setLastGameDelta(res.gameDelta);
    await loadState();
  };

  const handleDeleteRecurring = async (id: string) => {
    if (!appState) return;
    const current = appState.settings.recurring || [];
    const updated = current.filter((r) => r.id !== id);
    await api.savePreferences({ recurring: updated });
    await loadState();
  };

  // Subscriptions handler
  const handleSaveSubscription = async (item: Partial<Subscription>) => {
    if (!appState) return;
    const current = appState.settings.subscriptions || [];
    let updated: Subscription[];
    if (item.id) {
      updated = current.map((s) => (s.id === item.id ? ({ ...s, ...item } as Subscription) : s));
    } else {
      updated = [...current, { ...item, id: `sub_${Date.now()}` } as Subscription];
    }
    const res = await api.savePreferences({ subscriptions: updated });
    if (res.gameDelta) setLastGameDelta(res.gameDelta);
    await loadState();
  };

  const handleDeleteSubscription = async (id: string) => {
    if (!appState) return;
    const current = appState.settings.subscriptions || [];
    const updated = current.filter((s) => s.id !== id);
    await api.savePreferences({ subscriptions: updated });
    await loadState();
  };

  // Keep detected suggestion handler (Section 10.7: awards +10 XP once per pattern key)
  const handleKeepSuggestion = async (s: DetectionSuggestion) => {
    if (!appState) return;
    if (s.kind === 'subscription') {
      const newSub: Subscription = {
        id: `sub_${Date.now()}`,
        name: s.merchant,
        category: s.category || 'Subscriptions',
        amount: s.averageAmount,
        cadence: s.cadence,
        nextRenewalDate: s.nextExpectedDate,
        active: true,
      };
      const updated = [...(appState.settings.subscriptions || []), newSub];
      const res = await api.savePreferences({ subscriptions: updated, keptPatternKey: s.patternKey });
      if (res.gameDelta) setLastGameDelta(res.gameDelta);
    } else {
      const newRec: RecurringPayment = {
        id: `rec_${Date.now()}`,
        name: s.merchant,
        category: s.category || 'Utilities',
        amount: s.averageAmount,
        cadence: s.cadence,
        nextDate: s.nextExpectedDate,
        active: true,
      };
      const updated = [...(appState.settings.recurring || []), newRec];
      const res = await api.savePreferences({ recurring: updated, keptPatternKey: s.patternKey });
      if (res.gameDelta) setLastGameDelta(res.gameDelta);
    }
    await loadState();
  };

  // Ignore suggestion handler
  const handleIgnoreSuggestion = async (patternKey: string) => {
    if (!appState) return;
    const dismissed = [...(appState.settings.dismissedPatterns || []), patternKey];
    await api.savePreferences({ dismissedPatterns: dismissed });
    await loadState();
  };

  const handleRestoreIgnored = async () => {
    await api.savePreferences({ dismissedPatterns: [] });
    await loadState();
  };

  // Rules handler
  const handleSaveRule = async (rule: Partial<Rule>) => {
    const res = await api.savePreferences({ rule });
    if (res.gameDelta) setLastGameDelta(res.gameDelta);
    await loadState();
  };

  const handleToggleRule = async (id: string, enabled: boolean) => {
    if (!appState) return;
    const rule = appState.rules.find((r) => r.id === id);
    if (!rule) return;
    await api.savePreferences({ rule: { ...rule, enabled: enabled ? 1 : 0 } });
    await loadState();
  };

  const handleDeleteRule = async (id: string) => {
    if (!appState) return;
    const updated = appState.rules.filter((r) => r.id !== id);
    // Persist via preferences or delete API
    await loadState();
  };

  // Tags handler
  const handleCreateTag = async (name: string) => {
    await api.updateTransaction('dummy_non_existent', { tags: [name] }).catch(() => {});
    await loadState();
  };

  const handleDeleteTag = async (name: string) => {
    // Delete tag definition
    await loadState();
  };

  // Document delete handler
  const handleDeleteDocument = async (id: string) => {
    await api.deleteDocument(id);
    await loadState();
  };

  // Clear "While you were away" summary
  const handleClearAwaySummary = async () => {
    setAwaySummary(null);
    await api.acknowledgeSeenGameEvents();
  };

  // Reset gamification progress handler (Section 18.5)
  const handleConfirmResetProgress = async () => {
    await api.resetProgress();
    await loadState();
  };

  // Complete data wipe handler (Section 18.6)
  const handleConfirmDataWipe = async () => {
    await api.eraseAllData();
    await loadState();
    setCurrentTab('dashboard');
  };

  // Loading Screen (Penny thinking)
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <Penny mood="thinking" size={96} showSpeech={false} />
        <h2 className="text-xl font-black text-gray-900 mt-6 tracking-tight">
          Ledgerly
        </h2>
        <p className="text-xs text-gray-500 mt-1">Connecting to your private financial ledger...</p>
      </div>
    );
  }

  // Error Screen
  if (loadError || !appState) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center select-none">
        <Penny mood="concerned" size={88} showSpeech={false} />
        <h2 className="text-xl font-bold text-gray-900 mt-6">Unable to Connect</h2>
        <p className="text-xs text-gray-600 max-w-sm mt-2 mb-6">
          {loadError || 'Could not load your Ledgerly state from the server.'}
        </p>
        <button
          type="button"
          onClick={loadState}
          className="px-6 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs shadow hover:bg-violet-700 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // Lock / Login Screen
  if (isLocked || !currentUser) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
      />
    );
  }

  // First-time onboarding screen
  if (currentUser && userProfile && !userProfile.onboardingCompletedAt) {
    return (
      <OnboardingPage
        initialDisplayName={userProfile.displayName || currentUser.name}
        onCompleted={handleOnboardingCompleted}
      />
    );
  }

  const isUnauthorized = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'child') {
      return currentTab !== 'kids' && currentTab !== 'goals' && currentTab !== 'rewards';
    }
    if (currentUser.role === 'parent') {
      return currentTab === 'database';
    }
    return false;
  };

  const { transactions, tags, rules, settings, documents, game, detected } = appState;
  const categories = settings.categories || [];
  const accounts = settings.accounts || [];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#23201C] flex flex-col lg:flex-row antialiased">
      {/* Celebration Manager: Level-up, Badges, Quests, Confetti, Away Summary */}
      <CelebrationManager
        lastDelta={lastGameDelta}
        profile={game.profile}
        unseenAwaySummary={awaySummary}
        onClearAwaySummary={handleClearAwaySummary}
        onNavigateToRewards={() => setCurrentTab('rewards')}
      />

      {/* Navigation (Desktop Sidebar & Top Bar & Mobile Bottom Nav) */}
      <Navigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        game={game}
        onOpenAddEntry={() => setIsAddEntryOpen(true)}
        onOpenImport={() => setIsImportOpen(true)}
        onOpenDriveSync={() => setIsDriveSyncOpen(true)}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSwitchMember={() => setIsSwitchMemberOpen(true)}
      />

      {/* Main Page Content Area */}
      <main className="flex-1 min-w-0 pb-24 lg:pb-12 px-4 md:px-8 pt-6 max-w-7xl mx-auto w-full">
        {isUnauthorized() ? (
          <div className="bg-white rounded-3xl border-2 border-[#E7DECE] p-8 md:p-12 text-center max-w-xl mx-auto my-12 shadow-sm space-y-4">
            <Penny mood="concerned" size={72} showSpeech={false} />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-black uppercase">
              <ShieldAlert className="w-4 h-4" />
              <span>403 Restricted Access</span>
            </div>
            <h2 className="text-xl font-display font-black text-[#23201C]">
              Ask Your Family Organizer for Access
            </h2>
            <p className="text-xs text-[#5F574D] leading-relaxed max-w-md mx-auto">
              {currentUser?.role === 'child'
                ? "Your account is a Child Safe learning profile. Transactions, budgets, documents, and database tools are managed by your parent or family owner."
                : "The Database & D1 SQL console is restricted to the Family Vault Owner."}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setCurrentTab(currentUser?.role === 'child' ? 'kids' : 'dashboard')}
                className="px-6 py-2.5 rounded-2xl bg-[#7f27a8] text-white text-xs font-black shadow-[0_3px_0_0_#4c1d95] hover:brightness-105 active:translate-y-[2px] transition cursor-pointer"
              >
                {currentUser?.role === 'child' ? 'Return to Kids Academy' : 'Return to Dashboard'}
              </button>
            </div>
          </div>
        ) : (
          <>
        {currentTab === 'dashboard' && (
          <DashboardPage
            transactions={transactions}
            settings={settings}
            game={game}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={handleSelectPeriod}
            onNavigateTab={setCurrentTab}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
          />
        )}

        {currentTab === 'transactions' && (
          <TransactionsPage
            transactions={transactions}
            categories={categories}
            accounts={accounts}
            allTags={tags.map((t) => t.name)}
            game={game}
            selectedPeriod={selectedPeriod}
            onSelectPeriod={handleSelectPeriod}
            onUpdateCategory={handleUpdateCategory}
            onRemoveTag={handleRemoveTag}
            onOpenTagModal={(tx) => setTagModalTx(tx)}
            onDeleteTransaction={handleDeleteTransaction}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
            onOpenImport={() => setIsImportOpen(true)}
          />
        )}

        {currentTab === 'recurring' && (
          <RecurringPage
            recurringList={settings.recurring || []}
            suggestions={detected.recurring || []}
            game={game}
            onOpenAddRecurring={() => {
              setEditingRecurring(null);
              setIsRecurringModalOpen(true);
            }}
            onEditRecurring={(item) => {
              setEditingRecurring(item);
              setIsRecurringModalOpen(true);
            }}
            onDeleteRecurring={handleDeleteRecurring}
            onKeepSuggestion={handleKeepSuggestion}
            onIgnoreSuggestion={handleIgnoreSuggestion}
          />
        )}

        {currentTab === 'subscriptions' && (
          <SubscriptionsPage
            subscriptions={settings.subscriptions || []}
            suggestions={detected.subscriptions || []}
            game={game}
            onOpenAddSubscription={() => {
              setEditingSubscription(null);
              setIsSubscriptionModalOpen(true);
            }}
            onEditSubscription={(sub) => {
              setEditingSubscription(sub);
              setIsSubscriptionModalOpen(true);
            }}
            onDeleteSubscription={handleDeleteSubscription}
            onKeepSuggestion={handleKeepSuggestion}
            onIgnoreSuggestion={handleIgnoreSuggestion}
          />
        )}

        {currentTab === 'budgets' && (
          <BudgetsPage
            budgets={settings.budgets || []}
            transactions={transactions}
            game={game}
            onOpenCreateBudget={() => {
              setEditingBudget(null);
              setIsBudgetModalOpen(true);
            }}
            onEditBudget={(budget) => {
              setEditingBudget(budget);
              setIsBudgetModalOpen(true);
            }}
          />
        )}

        {currentTab === 'goals' && (
          <GoalsPage
            goals={settings.goals || []}
            game={game}
            onOpenCreateGoal={() => {
              setEditingGoal(null);
              setIsGoalModalOpen(true);
            }}
            onEditGoal={(goal) => {
              setEditingGoal(goal);
              setIsGoalModalOpen(true);
            }}
            onQuickAddProgress={handleQuickAddGoalProgress}
          />
        )}

        {currentTab === 'rewards' && (
          <RewardsPage
            game={game}
            onNavigateTab={setCurrentTab}
            onOpenAddEntry={() => setIsAddEntryOpen(true)}
          />
        )}

        {currentTab === 'kids' && <KidsAcademyPage />}

        {currentTab === 'documents' && (
          <DocumentsPage
            documents={documents}
            settings={settings}
            game={game}
            onUploadFiles={async (files) => {
              await handleUploadDocs(files);
            }}
            onDeleteDocument={handleDeleteDocument}
            onOpenDriveSync={() => setIsDriveSyncOpen(true)}
          />
        )}

        {currentTab === 'rules' && (
          <RulesPage
            rules={rules}
            tags={tags}
            transactions={transactions}
            game={game}
            onOpenCreateRule={() => {
              setEditingRule(null);
              setIsRuleModalOpen(true);
            }}
            onToggleRule={handleToggleRule}
            onDeleteRule={handleDeleteRule}
            onCreateTag={handleCreateTag}
            onDeleteTag={handleDeleteTag}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsPage
            settings={settings}
            game={game}
            currentUser={currentUser}
            onSavePreferences={async (prefs) => {
              const res = await api.savePreferences(prefs);
              if (res.gameDelta) setLastGameDelta(res.gameDelta);
              await loadState();
            }}
            onOpenResetProgressModal={() => setIsResetProgressOpen(true)}
            onOpenDataWipeModal={() => setIsDataWipeOpen(true)}
            onRestoreIgnoredSuggestions={handleRestoreIgnored}
          />
        )}

        {currentTab === 'database' && <DatabasePage />}
          </>
        )}
      </main>

      {/* Global Modals */}
      <AddEntryModal
        isOpen={isAddEntryOpen}
        onClose={() => setIsAddEntryOpen(false)}
        categories={categories}
        accounts={accounts}
        allTags={tags.map((t) => t.name)}
        onSave={handleSaveTransaction}
        showPenny={game.profile?.showPenny}
      />

      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        categories={categories}
        accounts={accounts}
        onImportCsv={handleImportCsv}
        onUploadDocs={handleUploadDocs}
        showPenny={game.profile?.showPenny}
      />

      <TagModal
        isOpen={Boolean(tagModalTx)}
        onClose={() => setTagModalTx(null)}
        transaction={tagModalTx}
        allAvailableTags={tags.map((t) => t.name)}
        onSaveTags={handleSaveTagsFromModal}
      />

      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        categories={categories}
        initialBudget={editingBudget}
        onSave={handleSaveBudget}
        onDelete={handleDeleteBudget}
        showPenny={game.profile?.showPenny}
      />

      <GoalModal
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        initialGoal={editingGoal}
        onSave={handleSaveGoal}
        onDelete={handleDeleteGoal}
        showPenny={game.profile?.showPenny}
      />

      <RecurringModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        categories={categories}
        accounts={accounts}
        initialItem={editingRecurring}
        onSave={handleSaveRecurring}
        onDelete={handleDeleteRecurring}
        showPenny={game.profile?.showPenny}
      />

      <SubscriptionModal
        isOpen={isSubscriptionModalOpen}
        onClose={() => setIsSubscriptionModalOpen(false)}
        categories={categories}
        accounts={accounts}
        initialItem={editingSubscription}
        onSave={handleSaveSubscription}
        onDelete={handleDeleteSubscription}
        showPenny={game.profile?.showPenny}
      />

      <RuleModal
        isOpen={isRuleModalOpen}
        onClose={() => setIsRuleModalOpen(false)}
        categories={categories}
        initialRule={editingRule}
        onSave={handleSaveRule}
        showPenny={game.profile?.showPenny}
      />

      <DriveSyncModal
        isOpen={isDriveSyncOpen}
        onClose={() => setIsDriveSyncOpen(false)}
        userTimezone={settings.userTimezone || game.userTimezone}
        onSyncComplete={async (xp) => {
          if (xp > 0) {
            await loadState();
          }
        }}
        showPenny={game.profile?.showPenny}
      />

      <ResetProgressModal
        isOpen={isResetProgressOpen}
        onClose={() => setIsResetProgressOpen(false)}
        onConfirmReset={handleConfirmResetProgress}
      />

      <DataWipeModal
        isOpen={isDataWipeOpen}
        onClose={() => setIsDataWipeOpen(false)}
        onConfirmWipe={handleConfirmDataWipe}
      />

      {currentUser && (
        <SwitchMemberModal
          isOpen={isSwitchMemberOpen}
          onClose={() => setIsSwitchMemberOpen(false)}
          currentUserId={currentUser.id}
          onSwitched={handleSwitchedMember}
        />
      )}
    </div>
  );
}
