import React from 'react';
import { CreditCard, Plus, Check, EyeOff, Sparkles, Calendar } from 'lucide-react';
import { Subscription, DetectionSuggestion, GameState } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface SubscriptionsPageProps {
  subscriptions: Subscription[];
  suggestions: DetectionSuggestion[];
  game: GameState;
  onOpenAddSubscription: () => void;
  onEditSubscription: (sub: Subscription) => void;
  onDeleteSubscription: (id: string) => Promise<void>;
  onKeepSuggestion: (s: DetectionSuggestion) => Promise<void>;
  onIgnoreSuggestion: (patternKey: string) => Promise<void>;
}

export const SubscriptionsPage: React.FC<SubscriptionsPageProps> = ({
  subscriptions,
  suggestions,
  game,
  onOpenAddSubscription,
  onEditSubscription,
  onDeleteSubscription,
  onKeepSuggestion,
  onIgnoreSuggestion,
}) => {
  const confirmedMonthly = subscriptions
    .filter((s) => s.active)
    .reduce((sum, s) => {
      if (s.cadence === 'annual') return sum + s.amount / 12;
      if (s.cadence === 'quarterly') return sum + s.amount / 3;
      if (s.cadence === 'weekly') return sum + (s.amount * 52) / 12;
      return sum + s.amount;
    }, 0);

  const confirmedNames = new Set(subscriptions.map((s) => s.name.toLowerCase()));
  const unconfirmedSuggestions = suggestions.filter((s) => !confirmedNames.has(s.merchant.toLowerCase()));

  const suggestionsMonthly = unconfirmedSuggestions.reduce((sum, s) => sum + s.monthlyEquivalent, 0);

  const totalMonthly = confirmedMonthly + suggestionsMonthly;
  const totalAnnual = totalMonthly * 12;

  const activeConfirmed = subscriptions.filter((s) => s.active && s.nextRenewalDate);
  const nextRenewal = activeConfirmed.length > 0
    ? [...activeConfirmed].sort((a, b) => a.nextRenewalDate.localeCompare(b.nextRenewalDate))[0]
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Subscriptions</h1>
          <p className="text-xs text-gray-500">
            Track streaming, software, digital services, and memberships.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenAddSubscription}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Subscription</span>
        </button>
      </div>

      {/* Totals Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Monthly Subscriptions Total
          </p>
          <p className="text-2xl font-black text-[#23201C]">
            {formatRupee(totalMonthly)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">
            {formatRupee(confirmedMonthly)} confirmed + {formatRupee(suggestionsMonthly)} detected
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Annual Cost
          </p>
          <p className="text-2xl font-black text-[#23201C]">
            {formatRupee(totalAnnual)}
          </p>
          <p className="text-[11px] text-gray-400 mt-1">Projected yearly subscription spend</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
            Next Renewal
          </p>
          {nextRenewal ? (
            <div>
              <p className="text-lg font-black text-violet-700 truncate">{nextRenewal.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {formatRupee(nextRenewal.amount)} on {nextRenewal.nextRenewalDate}
              </p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-400 mt-1">None scheduled</p>
          )}
        </div>
      </div>

      {/* Detected Subscription Suggestions */}
      {unconfirmedSuggestions.length > 0 && (
        <div className="bg-violet-50/50 rounded-3xl p-5 border border-violet-200 shadow-sm space-y-3">
          <div>
            <h3 className="text-sm font-black text-violet-900 uppercase tracking-wider">
              Detected Subscription Suggestions ({unconfirmedSuggestions.length})
            </h3>
            <p className="text-xs text-violet-700">
              Discovered automatically from service hints and recurring expense cadences.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {unconfirmedSuggestions.map((s) => (
              <div
                key={s.patternKey}
                className="bg-white p-4 rounded-2xl border border-violet-100 shadow-xs flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-gray-900 truncate">{s.merchant}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      {s.cadence}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Next renewal est: {s.nextExpectedDate}
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
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white transition shadow"
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

      {/* Confirmed Subscriptions List */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h3 className="text-base font-bold text-gray-900">Confirmed Subscriptions</h3>

        {subscriptions.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center">
            <Penny mood="curious" size={48} showSpeech={false} enabled={game.profile?.showPenny} />
            <p className="mt-2 font-bold text-gray-700">No confirmed subscriptions yet.</p>
            <p className="text-[11px] text-gray-400 mt-0.5 mb-3">
              Add your streaming, app, or gym subscriptions to stay ahead of renewals.
            </p>
            <button
              type="button"
              onClick={onOpenAddSubscription}
              className="px-4 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs"
            >
              Add Subscription
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {subscriptions.map((sub) => (
              <div
                key={sub.id}
                className="py-3.5 flex items-center justify-between gap-3 text-xs hover:bg-gray-50 px-2 rounded-xl transition"
              >
                <div>
                  <p className="font-bold text-gray-900 text-sm">{sub.name}</p>
                  <p className="text-[11px] text-gray-400">
                    {sub.category} • {sub.cadence} • Next renewal: {sub.nextRenewalDate}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-black text-[#23201C]">{formatRupee(sub.amount)}</p>
                    <span className={`text-[10px] font-bold ${sub.active ? 'text-emerald-600' : 'text-gray-400'}`}>
                      {sub.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditSubscription(sub)}
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
