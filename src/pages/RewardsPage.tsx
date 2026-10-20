import React from 'react';
import {
  Award,
  Star,
  Flame,
  Snowflake,
  CheckCircle2,
  Lock,
  Sparkles,
  Calendar,
  ArrowRight,
  TrendingUp,
  Settings as SettingsIcon,
} from 'lucide-react';
import { GameState, GameBadge } from '../types';
import { Penny } from '../components/Penny';
import { StreakCalendar } from '../components/StreakCalendar';

interface RewardsPageProps {
  game: GameState;
  onNavigateTab: (tab: any) => void;
  onOpenAddEntry: () => void;
}

export const RewardsPage: React.FC<RewardsPageProps> = ({
  game,
  onNavigateTab,
  onOpenAddEntry,
}) => {
  const xpPercent =
    game.xpForNextLevel > 0 ? Math.min(100, Math.round((game.xpIntoLevel / game.xpForNextLevel) * 100)) : 0;



  // Level roadmap thresholds: 50 * (L - 1) * L
  const roadmapLevels = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((lvl) => {
    const req = lvl <= 1 ? 0 : 50 * (lvl - 1) * lvl;
    const isCurrent = lvl === game.level;
    const isReached = lvl <= game.level;
    return {
      lvl,
      title: [
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
      ][lvl - 1],
      xpRequired: req,
      isCurrent,
      isReached,
    };
  });

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* 1. Hero Section (Section 15.1) */}
      <div className="bg-gradient-to-r from-[#7f27a8] via-[#c1008f] to-[#f76400] rounded-3xl p-6 md:p-10 text-white shadow-[0_6px_0_0_#4c1d95] border-2 border-[#ffd400]/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#ffd400]/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <Penny
              mood={game.totalXp === 0 ? 'curious' : game.level >= 5 ? 'proud' : 'cheer'}
              size={96}
              showSpeech={false}
              enabled={game.profile?.showPenny}
            />
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffd400] text-amber-950 text-xs font-black uppercase tracking-wider mb-2 shadow-xs">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>Level {game.level} • {game.levelTitle}</span>
              </div>
              <h1 className="font-display text-4xl md:text-5xl font-black tracking-tight text-white mb-2 drop-shadow-xs">
                {game.totalXp} XP 🏆
              </h1>
              <p className="text-sm text-white/95 max-w-md font-medium">
                {game.totalXp === 0
                  ? "Welcome! You start at 0 XP. Complete your first steps below to begin your habit-building journey."
                  : `${game.xpIntoLevel} XP earned toward Level ${game.level + 1} (${game.xpForNextLevel - game.xpIntoLevel} XP to go).`}
              </p>
            </div>
          </div>

          {/* XP Progress Card */}
          <div className="w-full md:w-72 bg-white/15 backdrop-blur-md p-5 rounded-3xl border-2 border-white/20 text-center shadow-sm">
            <div className="flex justify-between text-xs font-black text-white mb-2">
              <span>Next Level Progress</span>
              <span className="font-mono">{xpPercent}%</span>
            </div>
            <div className="h-4 bg-black/25 rounded-full overflow-hidden p-0.5 border border-white/20 mb-3">
              <div
                className="h-full bg-gradient-to-r from-[#ffd400] to-yellow-300 rounded-full transition-all duration-500 shadow-xs"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
            <p className="text-[11px] text-white/90 font-medium">
              Level {game.level + 1} unlock: <strong className="text-[#ffd400]">{roadmapLevels[game.level]?.title || 'Legend'}</strong>
            </p>
          </div>
        </div>
      </div>

      {/* 2. Streak Panel (Section 15.2) with StreakCalendar component */}
      <StreakCalendar
        recentActiveDates={game.recentActiveDates}
        gameFreezeDates={game.gameFreezeDates || []}
        currentStreak={game.currentStreak}
        longestStreak={game.longestStreak}
        freezesHeld={game.freezes}
        userTimezone={game.userTimezone}
      />

      {/* 3. First Steps Checklist (Section 15.3) */}
      {game.firstSteps && game.firstSteps.length > 0 && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-gray-900">First Steps Checklist</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {game.firstSteps.map((step) => (
              <div
                key={step.id}
                className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                  step.completed
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-gray-50 border-gray-200 text-gray-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs">{step.title}</span>
                    {step.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shrink-0" />
                    )}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{step.description}</p>
                </div>
                <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                  <span className="font-bold text-gray-400">
                    {step.completed ? 'Checked Off' : 'Pending'}
                  </span>
                  {!step.completed && (
                    <button
                      type="button"
                      onClick={() => {
                        if (step.id === 'step-tx') onOpenAddEntry();
                        else onNavigateTab(step.targetTab);
                      }}
                      className="text-violet-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{step.actionLabel}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Today's Quests & Weekly Challenge (Section 15.4 & 15.5) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Today's Quests (2 cols) */}
        <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Today&apos;s Quests</h2>
              <p className="text-xs text-gray-500">Achievable everyday money habits (+10 XP each)</p>
            </div>
            <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
              +15 XP Bonus for All
            </span>
          </div>

          <div className="space-y-3">
            {game.todaysQuests.length > 0 ? (
              game.todaysQuests.map((q) => (
                <div
                  key={q.id}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition ${
                    q.completed
                      ? 'bg-emerald-50/60 border-emerald-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        q.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {q.completed ? <CheckCircle2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">{q.title}</p>
                      <p className="text-[11px] text-gray-500">{q.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-600 shrink-0">+{q.rewardXp} XP</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">No active quests for today.</p>
            )}
          </div>
        </div>

        {/* Weekly Challenge (1 col) */}
        <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 text-[10px] font-bold uppercase tracking-wider mb-2">
              Weekly Challenge
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {game.weeklyChallenge.title}
            </h3>
            <p className="text-xs text-gray-500 mb-4">{game.weeklyChallenge.description}</p>

            <div className="mb-2">
              <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                <span>Progress</span>
                <span>
                  {game.weeklyChallenge.progress} / {game.weeklyChallenge.maxProgress} days
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                <div
                  className="h-full bg-violet-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${(game.weeklyChallenge.progress / game.weeklyChallenge.maxProgress) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>Reward: <strong className="text-amber-600">+{game.weeklyChallenge.rewardXp} XP</strong></span>
            <span>Ends {game.weeklyChallenge.endsAt}</span>
          </div>
        </div>
      </div>

      {/* 6. Badge Shelf (Section 15.6) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Badge Shelf</h2>
            <p className="text-xs text-gray-500">Permanent badges unlocked through genuine habits.</p>
          </div>
          <span className="text-xs font-bold text-gray-500">
            {game.badges.filter((b) => b.unlocked).length} / {game.badges.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {game.badges.map((b) => (
            <div
              key={b.id}
              className={`p-3.5 rounded-2xl border text-center flex flex-col items-center justify-between transition ${
                b.unlocked
                  ? 'bg-amber-50/70 border-amber-300 text-amber-950 shadow-xs'
                  : 'bg-gray-50/70 border-gray-200 text-gray-400 opacity-60'
              }`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-2 shadow-xs ${
                  b.unlocked
                    ? 'bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-900'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {b.unlocked ? <Award className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </div>

              <div className="min-w-0">
                <p className="font-bold text-xs text-gray-900 truncate">{b.title}</p>
                <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{b.criterion}</p>
              </div>

              <span className="text-[9px] font-semibold text-gray-400 mt-2">
                {b.unlocked ? 'Unlocked' : 'Locked'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7. Recent XP Events Ledger (Section 15.7) */}
      <div className="bg-white rounded-3xl p-6 border border-gray-200 shadow-sm space-y-3">
        <h2 className="text-base font-bold text-gray-900">Recent XP Activity</h2>
        {game.recentEvents.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">
            No events recorded yet. Start by logging an entry or setting your net worth!
          </p>
        ) : (
          <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
            {game.recentEvents.map((evt) => (
              <div key={evt.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-gray-800 capitalize">{evt.label}</p>
                  <p className="text-[11px] text-gray-400">
                    {evt.localDate} • {new Date(evt.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <span className="font-black text-amber-600">+{evt.xp} XP</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 8. Level Roadmap (Section 15.8) */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Level Roadmap</h2>
            <p className="text-xs text-gray-500">Cumulative XP milestones across all 10 ranks.</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="text-xs font-bold text-violet-600 hover:underline flex items-center gap-1"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
            <span>Mascot & Motion Settings</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {roadmapLevels.map((lvl) => (
            <div
              key={lvl.lvl}
              className={`p-3.5 rounded-2xl border ${
                lvl.isCurrent
                  ? 'bg-violet-50 border-violet-400 ring-2 ring-violet-200 font-bold'
                  : lvl.isReached
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-white border-gray-100 text-gray-400'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold">Lvl {lvl.lvl}</span>
                <span className="text-[10px] text-gray-500">{lvl.xpRequired} XP</span>
              </div>
              <p className="font-semibold text-gray-900 truncate">{lvl.title}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
