import React, { useState } from 'react';
import { PieChart, Plus, AlertCircle, CheckCircle2, Sliders, ArrowUpRight } from 'lucide-react';
import { Budget, Transaction, GameState, PeriodKey } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface BudgetsPageProps {
  budgets: Budget[];
  transactions: Transaction[];
  game: GameState;
  onOpenCreateBudget: () => void;
  onEditBudget: (budget: Budget) => void;
}

export const BudgetsPage: React.FC<BudgetsPageProps> = ({
  budgets,
  transactions,
  game,
  onOpenCreateBudget,
  onEditBudget,
}) => {
  // Current month prefix (YYYY-MM)
  const currentMonthPrefix = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = transactions.filter(
    (t) => t.type === 'expense' && t.date.startsWith(currentMonthPrefix)
  );

  // Budget calculations
  const budgetStats = budgets.map((b) => {
    const spent = currentMonthExpenses
      .filter((t) => t.category.toLowerCase() === b.category.toLowerCase())
      .reduce((sum, t) => sum + t.amount, 0);
    const remaining = b.limit - spent;
    const percent = b.limit > 0 ? (spent / b.limit) * 100 : 0;
    const isOver = spent > b.limit;
    const isClose = !isOver && percent >= 80;

    return {
      ...b,
      spent,
      remaining,
      percent: Math.min(100, percent),
      rawPercent: percent,
      isOver,
      isClose,
    };
  });

  const totalBudgetLimit = budgets.filter((b) => b.active).reduce((sum, b) => sum + b.limit, 0);
  const totalSpentInBudgets = budgetStats.filter((b) => b.active).reduce((sum, b) => sum + b.spent, 0);
  const overallHealthPercent = totalBudgetLimit > 0 ? Math.min(100, (totalSpentInBudgets / totalBudgetLimit) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-[#23201C] tracking-tight">Monthly Budgets ⚖️</h1>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            Set spending limits to keep everyday categories on track and earn monthly wins.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateBudget}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black text-white bg-[#7f27a8] hover:bg-[#6b21a8] transition shadow-[0_3px_0_0_#4c1d95] hover:translate-y-[-1px] active:translate-y-[2px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Budget</span>
        </button>
      </div>

      {budgets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-[#E7DECE] text-center flex flex-col items-center justify-center shadow-xs">
          <Penny mood="curious" size={64} showSpeech={false} enabled={game.profile?.showPenny} />
          <h3 className="font-display text-lg font-black text-stone-800 mt-3">No budgets created yet</h3>
          <p className="text-xs text-stone-500 max-w-sm mt-1 mb-5 font-medium">
            Create monthly budget limits for Books, Toys, or Treats to visualize spending and earn +15 XP!
          </p>
          <button
            type="button"
            onClick={onOpenCreateBudget}
            className="px-5 py-2.5 rounded-2xl bg-[#ffd400] text-amber-950 font-black text-xs shadow-[0_3px_0_0_#b45309] hover:bg-yellow-300 transition"
          >
            Create First Budget (+15 XP)
          </button>
        </div>
      ) : (
        <>
          {/* Health Summary Card */}
          <div className="bg-white p-6 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                Monthly Budget Health ({new Date().toLocaleString('default', { month: 'long' })})
              </span>
              <p className="text-2xl font-black text-[#23201C]">
                {formatRupee(totalSpentInBudgets)}{' '}
                <span className="text-sm font-semibold text-gray-400">
                  of {formatRupee(totalBudgetLimit)} limit
                </span>
              </p>
              <p className="text-xs text-gray-500">
                {totalBudgetLimit >= totalSpentInBudgets
                  ? `${formatRupee(totalBudgetLimit - totalSpentInBudgets)} total remaining this month`
                  : `${formatRupee(totalSpentInBudgets - totalBudgetLimit)} over combined limits`}
              </p>
            </div>

            {/* Health Bar */}
            <div className="w-full md:w-72">
              <div className="flex justify-between text-xs font-bold text-gray-700 mb-1.5">
                <span>Total Utilized</span>
                <span>{overallHealthPercent.toFixed(0)}%</span>
              </div>
              <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    overallHealthPercent > 100
                      ? 'bg-orange-500'
                      : overallHealthPercent >= 80
                      ? 'bg-amber-400'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, overallHealthPercent)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Budget Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgetStats.map((b) => (
              <div
                key={b.id}
                className={`bg-white p-5 rounded-3xl border-2 shadow-[0_3px_0_0_#DCD1BF] flex flex-col justify-between transition ${
                  b.isOver
                    ? 'border-orange-300 ring-2 ring-orange-100'
                    : 'border-[#E7DECE] hover:border-violet-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-base text-[#23201C]">{b.category}</span>
                    <button
                      type="button"
                      onClick={() => onEditBudget(b)}
                      className="text-xs font-semibold text-gray-400 hover:text-violet-600 p-1"
                    >
                      <Sliders className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-baseline justify-between mb-3">
                    <span className="text-2xl font-black text-[#23201C]">
                      {formatRupee(b.spent)}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Limit: {formatRupee(b.limit)}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        b.isOver
                          ? 'bg-orange-500'
                          : b.isClose
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${b.percent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500">
                      {b.isOver
                        ? `${formatRupee(Math.abs(b.remaining))} over budget`
                        : `${formatRupee(b.remaining)} remaining`}
                    </span>
                    <span className="font-bold text-gray-700">
                      {b.rawPercent.toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Over-budget or On-track Penny Status strip */}
                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                  {b.isOver ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-orange-700">
                      <Penny mood="concerned" size={26} showSpeech={false} enabled={game.profile?.showPenny} />
                      <span>Over budget this month</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span>On track</span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => onEditBudget(b)}
                    className="text-xs font-bold text-violet-600 hover:underline"
                  >
                    Adjust
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
