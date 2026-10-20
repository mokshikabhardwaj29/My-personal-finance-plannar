import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart as PieIcon,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { Transaction, AppSettings, GameState, PeriodKey, Subscription, RecurringPayment } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface DashboardPageProps {
  transactions: Transaction[];
  settings: AppSettings;
  game: GameState;
  selectedPeriod: PeriodKey;
  onSelectPeriod: (period: PeriodKey) => void;
  onNavigateTab: (tab: any) => void;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
  onOpenGoalModal?: () => void;
  onOpenBudgetModal?: () => void;
}

export function filterTransactionsByPeriod(transactions: Transaction[], period: PeriodKey): Transaction[] {
  if (period === 'all-time') return transactions;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed

  return transactions.filter((t) => {
    const [y, m] = t.date.split('-').map(Number);
    const txYear = y;
    const txMonth = m - 1;

    if (period === 'this-month') {
      return txYear === currentYear && txMonth === currentMonth;
    }
    if (period === 'last-month') {
      const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
      const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      return txYear === prevYear && txMonth === prevMonth;
    }
    if (period === 'last-3-months') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      const cutoff = d.toISOString().slice(0, 10);
      return t.date >= cutoff;
    }
    if (period === 'last-6-months') {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 6);
      const cutoff = d.toISOString().slice(0, 10);
      return t.date >= cutoff;
    }
    if (period === 'this-year') {
      return txYear === currentYear;
    }
    return true;
  });
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  transactions,
  settings,
  game,
  selectedPeriod,
  onSelectPeriod,
  onNavigateTab,
  onOpenAddEntry,
  onOpenImport,
}) => {
  const periodTxs = filterTransactionsByPeriod(transactions, selectedPeriod);

  // Financial calculations
  const incomeTxs = periodTxs.filter((t) => t.type === 'income');
  const expenseTxs = periodTxs.filter((t) => t.type === 'expense');

  const totalIncome = incomeTxs.reduce((sum, t) => sum + t.amount, 0);
  const totalSpending = expenseTxs.reduce((sum, t) => sum + t.amount, 0);

  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round(((totalIncome - totalSpending) / totalIncome) * 100)) : 0;

  // Net Worth (assets minus liabilities)
  const netWorthConfigured = Boolean(settings.netWorthConfigured);
  const assets = Number(settings.assetsTotal || 0);
  const liabilities = Number(settings.liabilitiesTotal || 0);
  const netWorth = assets - liabilities;

  // Category breakdown for expenses
  const categoryMap: Record<string, number> = {};
  for (const t of expenseTxs) {
    categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
  }
  const categoryBreakdown = Object.entries(categoryMap)
    .map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: totalSpending > 0 ? (amount / totalSpending) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // Five newest transactions
  const recentTransactions = [...periodTxs].slice(0, 5);

  // Coming up: confirmed recurring and subscriptions
  const confirmedSubs = (settings.subscriptions || []).filter((s: Subscription) => s.active);
  const confirmedRec = (settings.recurring || []).filter((r: RecurringPayment) => r.active);
  const upcomingItems = [
    ...confirmedSubs.map((s) => ({ name: s.name, amount: s.amount, date: s.nextRenewalDate, type: 'Subscription' })),
    ...confirmedRec.map((r) => ({ name: r.name, amount: r.amount, date: r.nextDate, type: 'Recurring Bill' })),
  ].sort((a, b) => a.date.localeCompare(b.date)).slice(0, 4);

  // Needs review count
  const needsReviewCount = transactions.filter((t) => t.category === 'Needs review').length;

  // First steps progress
  const firstSteps = game.firstSteps || [];
  const allFirstStepsCompleted = firstSteps.length > 0 && firstSteps.every((s) => s.completed);

  // Time-aware greeting
  const getGreeting = () => {
    if (transactions.length === 0) {
      return "Welcome to Ledgerly! I'm Penny, your financial companion. Let's build your financial peace of mind step by step.";
    }
    if (needsReviewCount > 0) {
      return `Welcome back! You have ${needsReviewCount} transaction${needsReviewCount > 1 ? 's' : ''} in Needs review. Ready to sort them?`;
    }
    if (game.currentStreak > 0) {
      return `You're on a ${game.currentStreak}-day active streak! Keep your positive financial habits going.`;
    }
    return "All caught up! Your financial accounts and vault are clean and organized.";
  };

  const CATEGORY_COLORS = [
    '#7f27a8', '#ffd400', '#53b0c9', '#f76400', '#c1008f', '#e885cf', '#10b981', '#3b82f6', '#f59e0b'
  ];

  return (
    <div className="space-y-6">
      {/* Top Controls: Persistent Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black text-[#23201C] tracking-tight">Financial Overview 🎈</h1>
          <p className="text-xs font-bold text-[#716859] mt-0.5">Explore your rupee savings, track goals, and build smart habits!</p>
        </div>

        {/* Working Period Selector */}
        <div className="flex items-center gap-1.5 p-1.5 bg-white border-2 border-[#E7DECE] rounded-2xl shadow-xs overflow-x-auto text-xs font-bold">
          {(
            [
              { key: 'all-time', label: 'All Time' },
              { key: 'this-month', label: 'This Month' },
              { key: 'last-month', label: 'Last Month' },
              { key: 'last-3-months', label: 'Last 3 Mos' },
              { key: 'last-6-months', label: 'Last 6 Mos' },
              { key: 'this-year', label: 'This Year' },
            ] as const
          ).map((p) => (
            <button
              key={p.key}
              type="button"
              onClick={() => onSelectPeriod(p.key)}
              className={`px-3.5 py-1.5 rounded-xl font-bold transition shrink-0 ${
                selectedPeriod === p.key
                  ? 'bg-[#7f27a8] text-white shadow-xs'
                  : 'text-[#5C5549] hover:text-amber-950 hover:bg-[#ffd400]/25'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Penny Mascot Greeting Card at Top */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-[#7f27a8] via-[#c1008f] to-[#f76400] text-white shadow-[0_6px_0_0_#4c1d95] border-2 border-[#ffd400]/40 relative overflow-hidden">
        {/* Playful decorative bubbles */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#ffd400]/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-[#53b0c9]/30 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Penny
                mood={transactions.length === 0 ? 'wave' : 'happy'}
                size={70}
                showSpeech={false}
                enabled={game.profile?.showPenny}
              />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffd400] text-amber-950 text-xs font-black mb-1.5 shadow-xs">
                <span>{game.levelTitle}</span>
                <span>•</span>
                <span>Level {game.level}</span>
              </div>
              <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white mb-1 drop-shadow-xs">
                Hello there, Money Explorer! 🚀
              </h2>
              <p className="text-xs md:text-sm text-white/95 max-w-xl leading-relaxed font-medium">
                {getGreeting()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {transactions.length === 0 ? (
              <button
                type="button"
                onClick={onOpenAddEntry}
                className="px-4 py-2.5 rounded-xl bg-amber-400 text-gray-950 font-bold text-xs hover:bg-amber-300 transition shadow"
              >
                Add First Entry
              </button>
            ) : needsReviewCount > 0 ? (
              <button
                type="button"
                onClick={() => onNavigateTab('transactions')}
                className="px-4 py-2.5 rounded-xl bg-violet-500 text-white font-bold text-xs hover:bg-violet-400 transition shadow"
              >
                Sort {needsReviewCount} Items
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('rewards')}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20"
              >
                View Quests & Rewards
              </button>
            )}
          </div>
        </div>

        {/* First Steps Checklist (if not yet all done) */}
        {!allFirstStepsCompleted && firstSteps.length > 0 && (
          <div className="mt-6 pt-5 border-t border-violet-800/60">
            <p className="text-xs font-bold uppercase tracking-wider text-violet-300 mb-3">
              First Steps to Setup Ledgerly
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {firstSteps.map((step) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => {
                    if (step.id === 'step-tx') onOpenAddEntry();
                    else onNavigateTab(step.targetTab);
                  }}
                  className={`p-3 rounded-2xl text-left border transition flex flex-col justify-between ${
                    step.completed
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 text-violet-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-bold truncate">{step.title}</span>
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-[10px] text-violet-300 truncate font-semibold">
                    {step.completed ? 'Completed' : step.actionLabel}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 Summary Cards (Section 7.2) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Net Worth */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col justify-between relative overflow-hidden group hover:border-[#7f27a8] transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#7f27a8] to-[#9333ea]" />
          <div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#766E61] mb-1.5">
              <span className="font-display text-sm text-[#7f27a8]">Net Worth</span>
              <ShieldCheck className="w-4 h-4 text-[#7f27a8]" />
            </div>
            {netWorthConfigured ? (
              <div className="font-display text-2xl font-black text-[#23201C] tracking-tight">
                {formatRupee(netWorth, { showDecimals: true })}
              </div>
            ) : (
              <div>
                <div className="font-display text-xl font-black text-stone-400">Not set</div>
                <p className="text-xs text-stone-500 mt-1">
                  Enter your asset and liability totals in Settings.
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
            {netWorthConfigured ? (
              <span className="text-stone-500 text-[11px] font-bold font-mono">
                Assets: {formatRupee(assets)} | Liab: {formatRupee(liabilities)}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateTab('settings')}
                className="text-[#7f27a8] font-black hover:underline flex items-center gap-1 text-xs"
              >
                <span>Setup Net Worth</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Income */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col justify-between relative overflow-hidden group hover:border-[#53b0c9] transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#53b0c9] to-emerald-400" />
          <div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#766E61] mb-1.5">
              <span className="font-display text-sm text-[#0284c7]">Total Income</span>
              <TrendingUp className="w-4 h-4 text-[#0284c7]" />
            </div>
            <div className="font-display text-2xl font-black text-emerald-600 tracking-tight">
              {formatRupee(totalIncome, { showDecimals: true })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-bold text-stone-500">
            {incomeTxs.length > 0 ? `${incomeTxs.length} credit entry(ies)` : 'No income in period'}
          </div>
        </div>

        {/* 3. Spending */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col justify-between relative overflow-hidden group hover:border-[#f76400] transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#f76400] to-rose-500" />
          <div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#766E61] mb-1.5">
              <span className="font-display text-sm text-[#ea580c]">Spending</span>
              <TrendingDown className="w-4 h-4 text-[#ea580c]" />
            </div>
            <div className="font-display text-2xl font-black text-[#23201C] tracking-tight">
              {formatRupee(totalSpending, { showDecimals: true })}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-bold text-stone-500">
            {expenseTxs.length > 0 ? `${expenseTxs.length} expense entry(ies)` : 'No expenses in period'}
          </div>
        </div>

        {/* 4. Savings Rate */}
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col justify-between relative overflow-hidden group hover:border-[#c1008f] transition">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#c1008f] to-[#e885cf]" />
          <div>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#766E61] mb-1.5">
              <span className="font-display text-sm text-[#c1008f]">Savings Rate</span>
              <PieIcon className="w-4 h-4 text-[#c1008f]" />
            </div>
            <div className="font-display text-2xl font-black text-[#c1008f] tracking-tight">
              {savingsRate}%
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-stone-100 text-xs font-bold text-stone-500">
            {totalIncome > 0
              ? `${formatRupee(totalIncome - totalSpending, { alwaysSign: true, showDecimals: true })} retained`
              : 'Calculated when income > ₹0'}
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Cash Flow & Category breakdown */}
        <div className="lg:col-span-2 space-y-6">
          {/* Cash Flow Chart */}
          <div className="bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-black text-[#23201C]">Cash Flow 📊</h3>
                <p className="text-xs text-stone-500">Income vs. Expense over time</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="flex items-center gap-1.5 text-[#0284c7]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#53b0c9]" /> Income
                </span>
                <span className="flex items-center gap-1.5 text-[#ea580c]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f76400]" /> Expense
                </span>
              </div>
            </div>

            {periodTxs.length === 0 ? (
              <div className="h-48 rounded-2xl bg-[#FAF7F2] border-2 border-dashed border-[#E7DECE] flex flex-col items-center justify-center text-center p-6">
                <Penny mood="curious" size={54} showSpeech={false} enabled={game.profile?.showPenny} />
                <p className="text-xs font-bold text-stone-700 mt-2">
                  Import or add transactions to see cash flow.
                </p>
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={onOpenAddEntry}
                    className="px-4 py-2 rounded-xl bg-[#f76400] text-white font-black text-xs shadow-xs hover:bg-[#ea580c] transition"
                  >
                    + Add Entry
                  </button>
                  <button
                    type="button"
                    onClick={onOpenImport}
                    className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 font-bold text-xs hover:bg-stone-200 transition"
                  >
                    Import CSV
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-56 flex flex-col justify-end pt-4">
                {/* Visual monthly bars */}
                <div className="grid grid-cols-6 gap-3 h-40 items-end px-2">
                  {['M1', 'M2', 'M3', 'M4', 'M5', 'Current'].map((label, idx) => {
                    const isLast = idx === 5;
                    const incHeight = isLast && totalIncome > 0 ? Math.min(100, Math.round((totalIncome / (totalIncome + totalSpending || 1)) * 100)) : 15;
                    const expHeight = isLast && totalSpending > 0 ? Math.min(100, Math.round((totalSpending / (totalIncome + totalSpending || 1)) * 100)) : 10;
                    return (
                      <div key={label} className="flex flex-col items-center h-full justify-end gap-1">
                        <div className="w-full flex items-end justify-center gap-1.5 h-32">
                          <div
                            className="w-4 bg-[#53b0c9] rounded-t-lg transition-all duration-500 shadow-xs"
                            style={{ height: `${incHeight}%` }}
                            title={`Income: ${formatRupee(isLast ? totalIncome : 0)}`}
                          />
                          <div
                            className="w-4 bg-[#f76400] rounded-t-lg transition-all duration-500 shadow-xs"
                            style={{ height: `${expHeight}%` }}
                            title={`Expense: ${formatRupee(isLast ? totalSpending : 0)}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-stone-400">{label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Spending by Category Donut / Breakdown */}
          <div className="bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <h3 className="font-display text-lg font-black text-[#23201C] mb-1">Spending by Category 🎨</h3>
            <p className="text-xs text-stone-500 mb-4">Breakdown of expenses in selected period</p>

            {expenseTxs.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border-2 border-dashed border-[#E7DECE] flex flex-col items-center justify-center">
                <Penny mood="curious" size={48} showSpeech={false} enabled={game.profile?.showPenny} />
                <p className="mt-2 font-bold text-[#353028]">No expenses recorded for this period.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Progress bar stack */}
                <div className="h-4 rounded-full overflow-hidden flex bg-stone-100 p-0.5 border border-stone-200">
                  {categoryBreakdown.map((cat, idx) => (
                    <div
                      key={cat.category}
                      style={{
                        width: `${cat.percentage}%`,
                        backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
                      }}
                      className="h-full rounded-xs transition-all"
                      title={`${cat.category}: ${formatRupee(cat.amount)} (${cat.percentage.toFixed(0)}%)`}
                    />
                  ))}
                </div>

                {/* Accessible Category Legend list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {categoryBreakdown.map((cat, idx) => (
                    <div
                      key={cat.category}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DECE] text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                          style={{ backgroundColor: CATEGORY_COLORS[idx % CATEGORY_COLORS.length] }}
                        />
                        <span className="font-bold text-[#23201C] truncate">{cat.category}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-black text-[#23201C] font-mono">{formatRupee(cat.amount)}</span>
                        <span className="text-stone-400 ml-1.5 font-medium">({cat.percentage.toFixed(0)}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Recent Activity & Coming Up */}
        <div className="space-y-6">
          {/* Recent Activity (5 newest) */}
          <div className="bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-black text-[#23201C]">Recent Activity 📝</h3>
                <p className="text-xs text-stone-500">Latest entries in period</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('transactions')}
                className="text-xs font-black text-[#7f27a8] hover:underline"
              >
                View All →
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border-2 border-dashed border-[#E7DECE] flex flex-col items-center justify-center">
                <Penny mood="curious" size={44} showSpeech={false} enabled={game.profile?.showPenny} />
                <p className="mt-2 font-bold text-stone-700">No transactions recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-2xl bg-[#FAF7F2] hover:bg-amber-50/50 transition border border-[#E7DECE] flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-[#23201C] truncate">{tx.merchant}</p>
                      <p className="text-stone-400 text-[11px] truncate">
                        {tx.date} • {tx.category} • {tx.account}
                      </p>
                    </div>
                    <div className={`font-black text-sm shrink-0 font-mono ${tx.type === 'income' ? 'text-emerald-600' : 'text-[#23201C]'}`}>
                      {formatRupee(tx.amount, { alwaysSign: true })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Coming Up: Confirmed recurring & subscriptions */}
          <div className="bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-lg font-black text-[#23201C]">Coming Up ⏰</h3>
                <p className="text-xs text-stone-500">Upcoming bills & renewals</p>
              </div>
              <button
                type="button"
                onClick={() => onNavigateTab('recurring')}
                className="text-xs font-black text-[#7f27a8] hover:underline"
              >
                Manage →
              </button>
            </div>

            {upcomingItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-500 bg-[#FAF7F2] rounded-2xl border-2 border-dashed border-[#E7DECE]">
                <Clock className="w-6 h-6 text-stone-400 mx-auto mb-1.5" />
                <p className="font-bold text-stone-700">No upcoming bills scheduled.</p>
                <button
                  type="button"
                  onClick={() => onNavigateTab('recurring')}
                  className="mt-2 text-[#7f27a8] font-black hover:underline"
                >
                  Manage Recurring Payments
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {upcomingItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DECE] text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#23201C] truncate">{item.name}</p>
                      <p className="text-[11px] text-stone-500">{item.date} • {item.type}</p>
                    </div>
                    <span className="font-black text-[#23201C] font-mono">{formatRupee(item.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
