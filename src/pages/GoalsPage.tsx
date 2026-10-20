import React from 'react';
import { Target, Plus, Flag, Trophy, Calendar, Sliders } from 'lucide-react';
import { Goal, GameState } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface GoalsPageProps {
  goals: Goal[];
  game: GameState;
  onOpenCreateGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onQuickAddProgress: (goal: Goal, amount: number) => Promise<void>;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  goals,
  game,
  onOpenCreateGoal,
  onEditGoal,
  onQuickAddProgress,
}) => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-black text-[#23201C] tracking-tight">Savings Goals 🎯</h1>
          <p className="text-xs font-bold text-stone-500 mt-0.5">
            Build milestones for toys, bicycles, books, or emergencies and celebrate every step!
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreateGoal}
          className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs font-black text-white bg-[#53b0c9] hover:bg-[#0284c7] transition shadow-[0_3px_0_0_#1e3a8a] hover:translate-y-[-1px] active:translate-y-[2px]"
        >
          <Plus className="w-4 h-4" />
          <span>Create Goal</span>
        </button>
      </div>

      {goals.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border-2 border-dashed border-[#E7DECE] text-center flex flex-col items-center justify-center shadow-xs">
          <Penny mood="curious" size={64} showSpeech={false} enabled={game.profile?.showPenny} />
          <h3 className="text-base font-bold text-gray-800 mt-3">No savings goals yet</h3>
          <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
            Set your first savings goal. Crossing 25%, 50%, 75%, and 100% milestones earns rewards and celebrations!
          </p>
          <button
            type="button"
            onClick={onOpenCreateGoal}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs shadow hover:bg-violet-700 transition"
          >
            Create First Goal (+15 XP)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map((g) => {
            const rawPercent = g.target > 0 ? (g.current / g.target) * 100 : 0;
            const percent = Math.min(100, Math.round(rawPercent));
            const remaining = Math.max(0, g.target - g.current);
            const isCompleted = g.current >= g.target;

            // Mascot pose matching progress (Section 6B.7)
            const goalMood = isCompleted
              ? 'cheer'
              : percent >= 75
              ? 'proud'
              : percent >= 25
              ? 'happy'
              : 'idle';

            return (
              <div
                key={g.id}
                className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-violet-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <h3 className="font-bold text-base text-gray-900 leading-snug">{g.name}</h3>
                      {g.dueDate && (
                        <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> Target: {g.dueDate}
                        </p>
                      )}
                    </div>
                    <Penny mood={goalMood} size={36} showSpeech={false} enabled={game.profile?.showPenny} />
                  </div>

                  {g.note && (
                    <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-100">
                      {g.note}
                    </p>
                  )}

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-2xl font-black text-[#23201C]">
                      {formatRupee(g.current)}
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Target: {formatRupee(g.target)}
                    </span>
                  </div>

                  {/* Progress bar with 25/50/75/100% milestone ticks (Section 14) */}
                  <div className="relative pt-1 mb-4">
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden p-0.5 border border-gray-200">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCompleted
                            ? 'bg-amber-400'
                            : percent >= 75
                            ? 'bg-emerald-500'
                            : 'bg-violet-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>

                    {/* Milestone Tick Marks */}
                    <div className="relative w-full flex justify-between px-1 text-[9px] font-bold text-gray-400 mt-1.5">
                      <span className={percent >= 25 ? 'text-violet-600 font-black' : ''}>25%</span>
                      <span className={percent >= 50 ? 'text-violet-600 font-black' : ''}>50%</span>
                      <span className={percent >= 75 ? 'text-violet-600 font-black' : ''}>75%</span>
                      <span className={percent >= 100 ? 'text-amber-600 font-black flex items-center gap-0.5' : ''}>
                        {percent >= 100 && <Trophy className="w-2.5 h-2.5 inline" />} 100%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                    <span>
                      {isCompleted ? '🎉 Goal Completed!' : `${formatRupee(remaining)} remaining`}
                    </span>
                    <span className="font-bold text-gray-900">{percent}%</span>
                  </div>
                </div>

                {/* Quick Add Progress & Edit */}
                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex gap-1">
                    {[100, 500, 1000].map((addAmt) => (
                      <button
                        key={addAmt}
                        type="button"
                        onClick={() => onQuickAddProgress(g, addAmt)}
                        className="px-2.5 py-1 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-[11px] font-bold transition"
                        title={`Add ${formatRupee(addAmt)} to goal progress`}
                      >
                        +{formatRupee(addAmt)}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditGoal(g)}
                    className="text-xs font-bold text-gray-500 hover:text-violet-600 p-1"
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
