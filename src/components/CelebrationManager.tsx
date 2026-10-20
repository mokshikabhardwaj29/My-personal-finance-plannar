import React, { useEffect, useRef, useState } from 'react';
import { GameDelta, GameBadge, GameProfile } from '../types';
import { Penny } from './Penny';
import { ConfettiExplosion } from './ConfettiExplosion';
import { X, Award, Star, Flame, Sparkles, ArrowRight } from 'lucide-react';

interface CelebrationManagerProps {
  lastDelta: GameDelta | null;
  profile: GameProfile;
  unseenAwaySummary?: {
    xpEarned: number;
    newBadgesCount: number;
    syncCount: number;
  } | null;
  onClearAwaySummary?: () => void;
  onNavigateToRewards?: () => void;
}

export const CelebrationManager: React.FC<CelebrationManagerProps> = ({
  lastDelta,
  profile,
  unseenAwaySummary,
  onClearAwaySummary,
  onNavigateToRewards,
}) => {
  // Queue states
  const [levelUpData, setLevelUpData] = useState<{ level: number; title: string } | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<GameBadge[]>([]);
  const [activeBadge, setActiveBadge] = useState<GameBadge | null>(null);
  const [questQueue, setQuestQueue] = useState<string[]>([]);
  const [activeQuest, setActiveQuest] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; key: number } | null>(null);

  const reducedMotion = profile.animationLevel === 'reduced';
  const celebrationsAllowed = profile.celebrations && !reducedMotion;

  const [confettiTrigger, setConfettiTrigger] = useState(0);

  // Process new incoming delta
  useEffect(() => {
    if (!lastDelta) return;

    // 1. Level up check
    if (lastDelta.leveledUp) {
      setLevelUpData({ level: lastDelta.level, title: lastDelta.levelTitle });
      if (celebrationsAllowed) {
        setConfettiTrigger((prev) => prev + 1);
      }
    }

    // 2. Badges queue
    if (lastDelta.newBadges && lastDelta.newBadges.length > 0) {
      setBadgeQueue((prev) => [...prev, ...lastDelta.newBadges]);
    }

    // 3. Quests completed queue
    if (lastDelta.questsCompleted && lastDelta.questsCompleted.length > 0) {
      setQuestQueue((prev) => [...prev, ...lastDelta.questsCompleted]);
    }

    // 4. XP toast
    if (lastDelta.xpAwarded > 0) {
      setXpToast({ xp: lastDelta.xpAwarded, key: Date.now() });
    }
  }, [lastDelta, celebrationsAllowed]);

  // Badge queue progression
  useEffect(() => {
    if (!activeBadge && badgeQueue.length > 0 && !levelUpData) {
      const next = badgeQueue[0];
      setActiveBadge(next);
      setBadgeQueue((prev) => prev.slice(1));
      if (celebrationsAllowed) {
        setConfettiTrigger((prev) => prev + 1);
      }
    }
  }, [badgeQueue, activeBadge, levelUpData, celebrationsAllowed]);

  // Quest queue progression
  useEffect(() => {
    if (!activeQuest && questQueue.length > 0 && !levelUpData && !activeBadge) {
      const next = questQueue[0];
      setActiveQuest(next);
      setQuestQueue((prev) => prev.slice(1));
      const t = setTimeout(() => {
        setActiveQuest(null);
      }, 4500);
      return () => clearTimeout(t);
    }
  }, [questQueue, activeQuest, levelUpData, activeBadge]);

  // XP toast auto-dismiss
  useEffect(() => {
    if (xpToast) {
      const t = setTimeout(() => {
        setXpToast(null);
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [xpToast]);

  return (
    <>
      {/* 120-Particle ConfettiExplosion Canvas with Reduced-Motion Compliance */}
      <ConfettiExplosion
        trigger={confettiTrigger}
        particleCount={120}
        forceReducedMotion={reducedMotion}
      />

      {/* Floating XP Toast */}
      {xpToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-6 z-40 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-bounce select-none border border-amber-300"
        >
          <Sparkles className="w-4 h-4" />
          <span>+{xpToast.xp} XP</span>
          <Penny mood="celebrate" size={28} showSpeech={false} enabled={profile.showPenny} />
        </div>
      )}

      {/* Quest Complete Popover */}
      {activeQuest && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-20 right-6 z-40 bg-white border border-emerald-200 rounded-2xl shadow-xl p-4 max-w-sm flex items-center gap-3 animate-fade-in"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Daily Quest Complete!</p>
            <p className="text-sm font-bold text-gray-900 truncate">Earned +10 XP</p>
          </div>
          <Penny mood="happy" size={40} showSpeech={false} enabled={profile.showPenny} />
          <button
            onClick={() => setActiveQuest(null)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Level-Up Modal Overlay */}
      {levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="levelup-title"
            className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-violet-100 relative animate-scale-up"
          >
            <button
              onClick={() => setLevelUpData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
              aria-label="Close celebration"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-4">
              <Penny mood="cheer" size={96} enabled={profile.showPenny} />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wider mb-2">
              <Star className="w-3.5 h-3.5 fill-current" />
              Level Up!
            </div>

            <h2 id="levelup-title" className="text-3xl font-extrabold text-gray-900 mb-1">
              Level {levelUpData.level}
            </h2>
            <p className="text-lg font-semibold text-violet-600 mb-4">{levelUpData.title}</p>
            <p className="text-sm text-gray-600 mb-6">
              You are building consistent, healthy financial habits! Keep logging your entries and watching your dashboard grow.
            </p>

            <button
              onClick={() => {
                setLevelUpData(null);
                if (onNavigateToRewards) onNavigateToRewards();
              }}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
            >
              <span>View Rewards</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Badge Unlock Modal */}
      {activeBadge && !levelUpData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="badge-title"
            className="bg-white rounded-3xl max-w-md w-full p-8 text-center shadow-2xl border border-amber-200 relative animate-scale-up"
          >
            <button
              onClick={() => setActiveBadge(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100"
              aria-label="Close celebration"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex justify-center mb-3">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-amber-900 flex items-center justify-center shadow-lg border-2 border-white">
                <Award className="w-10 h-10" />
              </div>
            </div>

            <div className="flex justify-center mb-2">
              <Penny mood="celebrate" size={54} enabled={profile.showPenny} />
            </div>

            <p className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-1">New Badge Unlocked!</p>
            <h2 id="badge-title" className="text-2xl font-black text-gray-900 mb-2">
              {activeBadge.title}
            </h2>
            <p className="text-sm text-gray-600 mb-6">{activeBadge.description}</p>

            <button
              onClick={() => setActiveBadge(null)}
              className="w-full py-3 px-6 rounded-xl font-semibold bg-amber-500 text-white hover:bg-amber-600 transition shadow"
            >
              Awesome!
            </button>
          </div>
        </div>
      )}

      {/* While You Were Away Card (Section 6B.6) */}
      {unseenAwaySummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="away-title"
            className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-violet-100 relative animate-scale-up text-center"
          >
            <div className="flex justify-center mb-4">
              <Penny mood="celebrate" size={80} enabled={profile.showPenny} />
            </div>

            <h3 id="away-title" className="text-2xl font-black text-gray-900 mb-2">
              While You Were Away
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Your 8:00 AM daily automation checked your Google Drive inbox and synchronized fresh updates!
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6 bg-violet-50 rounded-2xl p-4 border border-violet-100 text-center">
              <div>
                <p className="text-xs text-gray-500">XP Earned</p>
                <p className="text-xl font-black text-violet-700">+{unseenAwaySummary.xpEarned}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Files Stored</p>
                <p className="text-xl font-black text-violet-700">{unseenAwaySummary.syncCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">New Badges</p>
                <p className="text-xl font-black text-violet-700">{unseenAwaySummary.newBadgesCount}</p>
              </div>
            </div>

            <button
              onClick={onClearAwaySummary}
              className="w-full py-3.5 px-6 rounded-xl font-bold bg-violet-600 text-white hover:bg-violet-700 transition shadow"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      )}
    </>
  );
};
