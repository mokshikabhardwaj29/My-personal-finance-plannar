import React from 'react';
import { RotateCw, Plus, Check, EyeOff, Sparkles, AlertCircle, Calendar } from 'lucide-react';
import { RecurringPayment, DetectionSuggestion, GameState } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface RecurringPageProps {
  recurringList: RecurringPayment[];
  suggestions: DetectionSuggestion[];
  game: GameState;
  onOpenAddRecurring: () => void;
  onEditRecurring: (item: RecurringPayment) => void;
  onDeleteRecurring: (id: string) => Promise<void>;
  onKeepSuggestion: (s: DetectionSuggestion) => Promise<void>;
  onIgnoreSuggestion: (patternKey: string) => Promise<void>;
}

export const RecurringPage: React.FC<RecurringPageProps> = ({
  recurringList,
  suggestions,
  game,
  onOpenAddRecurring,
  onEditRecurring,
  onDeleteRecurring,
  onKeepSuggestion,
  onIgnoreSuggestion,
}) => {
  // Combined monthly and annual commitment without double counting
  const confirmedMonthly = recurringList
    .filter((r) => r.active)
    .reduce((sum, r) => {
      if (r.cadence === 'weekly') return sum + (r.amount * 52) / 12;
      if (r.cadence === 'biweekly') return sum + (r.amount * 26) / 12;
      if (r.cadence === 'monthly') return sum + r.amount;
      if (r.cadence === 'quarterly') return sum + r.amount / 3;
      if (r.cadence === 'annual') return sum + r.amount / 12;
      return sum + r.amount;
    }, 0);

  // Suggestions that are not already in confirmed
  const confirmedNames = new Set(recurringList.map((r) => r.name.toLowerCase()));
  const unconfirmedSuggestions = suggestions.filter((s) => !confirmedNames.has(s.merchant.toLowerCase()));

  const suggestionsMonthly = unconfirmedSuggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);

  const totalMonthlyCommitment = confirmedMonthly + suggestionsMonthly;
  const totalAnnualCommitment = totalMonthlyCommitment * 12;

  // Next expected payment
  const activeConfirmed = recurringList.filter((r) => r.active && r.nextDate);
  const nextPayment = activeConfirmed.length > 0
    ? [...activeConfirmed].sort((a, b) => a.nextDate.localeCompare(b.nextDate))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Recurring Payments</h1>
          <p className="text-xs text-gray-500">
            Track utilities, rent, loan repayments, and detected recurring charges.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddRecurring}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recurring Payment</span>
        </button>
      </div>

      {/* Active Detection Banner with Penny (Section 11) */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-violet-50 via-amber-50/40 to-white border border-violet-100 flex items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-4">
          <Penny mood="peek" size={48} showSpeech={false} enabled={game.profile?.showPenny} />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[11px] font-bold uppercase tracking-wider mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Active Detection Engine
            </div>
            <p className="text-xs text-gray-600 max-w-xl">
              Ledgerly analyzes your real expense transactions to identify stable repeating bills across weekly, biweekly, monthly, quarterly, and annual windows.
            </p>
          </div>
        </div>

        <div className="hidden md:block text-right">
          <p className="text-[11px] font-bold text-gray-400 uppercase">Total Detected</p>
          <p className="text-lg font-black text-violet-700">{unconfirmedSuggestions.length} Candidate(s)</p>
        </div>
      </div>

      {/* Commitment Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Est. Monthly Commitment
          </p>
          <p className="text-2xl font-black text-[#23201C]">
            {formatRupee(totalMonthlyCommitment)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {formatRupee(confirmedMonthly)} confirmed + {formatRupee(suggestionsMonthly)} detected
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Est. Annual Commitment
          </p>
          <p className="text-2xl font-black text-[#23201C]">
            {formatRupee(totalAnnualCommitment)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Projected 12-month total</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Next Expected Payment
          </p>
          {nextPayment ? (
            <div>
              <p className="text-lg font-black text-violet-700 truncate">{nextPayment.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatRupee(nextPayment.amount)} due on {nextPayment.nextDate}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-400 mt-1">None scheduled</p>
          )}
        </div>
      </div>

      {/* Detected Suggestions Panel */}
      {unconfirmedSuggestions.length > 0 && (
        <div className="bg-amber-50/50 rounded-3xl p-5 border border-amber-200/80 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">
                Detected Recurring Suggestions ({unconfirmedSuggestions.length})
              </h3>
              <p className="text-xs text-amber-700">
                Identified from multiple occurrences in your expense ledger. Keep to confirm or ignore.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unconfirmedSuggestions.map((s) => (
              <div
                key={s.patternKey}
                className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900 truncate">{s.merchant}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        s.confidence === 'High confidence'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {s.confidence}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {s.cadence} • {s.occurrenceCount} transactions • Next: {s.nextExpectedDate}
                  </p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-lg font-black text-[#23201C]">{formatRupee(s.averageAmount)}</span>
                    <span className="text-[11px] text-gray-400">
                      (~{formatRupee(s.monthlyEquivalent)}/mo)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => onIgnoreSuggestion(s.patternKey)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-500 hover:bg-gray-100 transition"
                  >
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Ignore</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onKeepSuggestion(s)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition shadow"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Keep (+10 XP)</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Recurring Payment List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Confirmed Recurring Payments</h3>

        {recurringList.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
            <Penny mood="curious" size={48} showSpeech={false} enabled={game.profile?.showPenny} />
            <p className="mt-2 font-bold text-gray-700">No confirmed recurring payments yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
              Add your scheduled utility bills or rent to track upcoming obligations.
            </p>
            <button
              type="button"
              onClick={onOpenAddRecurring}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs"
            >
              Add Recurring Payment
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recurringList.map((item) => (
              <div
                key={item.id}
                className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50 px-2 rounded-xl transition"
              >
                <div>
                  <p className="font-bold text-gray-900 text-sm">{item.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {item.category} • {item.cadence} • Next: {item.nextDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-[#23201C]">{formatRupee(item.amount)}</p>
                    <span className={`text-[10px] font-bold ${item.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {item.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditRecurring(item)}
                    className="text-xs font-semibold text-violet-600 hover:underline"
                  >
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
