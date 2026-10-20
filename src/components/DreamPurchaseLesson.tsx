import React, { useState } from 'react';
import {
  Bike,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  Volume2,
  VolumeX,
  CheckCircle2,
  Clock,
  Target,
  Palette,
  Eye,
  Info,
  Calendar,
  Zap,
} from 'lucide-react';
import { Penny, soundSynth } from './Penny';
import { ConfettiExplosion } from './ConfettiExplosion';
import { formatRupee } from '../utils/format';

interface DreamGoal {
  id: string;
  name: string;
  cost: number;
  icon: string;
  category: string;
  tagline: string;
  benefits: string;
}

const DREAM_GOALS: DreamGoal[] = [
  {
    id: 'bicycle',
    name: 'Atlas Mountain Bicycle',
    cost: 3000,
    icon: '🚲',
    category: 'Outdoor & Health',
    tagline: 'Ride with friends, explore your neighborhood, and stay active!',
    benefits: 'Builds physical stamina and gives you independent adventures for years!',
  },
  {
    id: 'telescope',
    name: 'Stargazer Astronomy Telescope',
    cost: 1800,
    icon: '🔭',
    category: 'Science & Discovery',
    tagline: 'Discover craters on the Moon and the glowing rings of Saturn!',
    benefits: 'Unlocks a lifetime of curiosity and scientific wonder right from your balcony.',
  },
  {
    id: 'art_kit',
    name: 'Master Artist Acrylic & Studio Kit',
    cost: 900,
    icon: '🎨',
    category: 'Creativity & Craft',
    tagline: 'Complete set with wooden easel, acrylic paints, canvas boards, and brushes!',
    benefits: 'Turn your imagination into stunning paintings to decorate your home.',
  },
];

interface DreamPurchaseLessonProps {
  ageGroup?: 'junior' | 'explorer' | 'teen';
  language?: 'english' | 'hinglish' | 'hindi';
}

export const DreamPurchaseLesson: React.FC<DreamPurchaseLessonProps> = ({
  ageGroup = 'explorer',
  language = 'english',
}) => {
  const [selectedGoal, setSelectedGoal] = useState<DreamGoal>(DREAM_GOALS[0]);
  const [currentWeek, setCurrentWeek] = useState<number>(1);
  const [totalSaved, setTotalSaved] = useState<number>(300); // started with small savings
  const [totalSpentFun, setTotalSpentFun] = useState<number>(150);

  // Weekly tokens allocated this round (Allowance = ₹200 per week, 4 tokens of ₹50)
  const WEEKLY_ALLOWANCE = 200;
  const TOKEN_VALUE = 50;
  const TOTAL_TOKENS = 4;

  const [unallocatedTokens, setUnallocatedTokens] = useState<number>(TOTAL_TOKENS);
  const [allocatedToDream, setAllocatedToDream] = useState<number>(2); // 2 tokens (₹100) default
  const [allocatedToFun, setAllocatedToFun] = useState<number>(2); // 2 tokens (₹100) default

  // Mascot and celebration
  const [pennyMood, setPennyMood] = useState<'idle' | 'happy' | 'celebrate' | 'cheer' | 'proud' | 'curious'>('happy');
  const [pennySpeech, setPennySpeech] = useState<string>(
    "Delayed gratification means waiting a little now so you can get something AMAZING later!"
  );
  const [triggerConfetti, setTriggerConfetti] = useState<boolean>(false);
  const [isGoalUnlocked, setIsGoalUnlocked] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [draggedToken, setDraggedToken] = useState<'token' | null>(null);

  // Calculate projections
  const weeklySavingsRate = allocatedToDream * TOKEN_VALUE; // e.g. ₹100 / week
  const remainingCost = Math.max(0, selectedGoal.cost - totalSaved);
  const weeksNeeded =
    weeklySavingsRate > 0
      ? Math.ceil(remainingCost / weeklySavingsRate)
      : Infinity;

  const goalProgressPct = Math.min(100, Math.round((totalSaved / selectedGoal.cost) * 100));

  // Voice speech
  const speakText = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.pitch = 1.15;
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  // Drag-and-drop mechanics
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', 'token');
    e.dataTransfer.effectAllowed = 'move';
    setDraggedToken('token');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnDream = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedToken(null);
    moveToDream();
  };

  const handleDropOnFun = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggedToken(null);
    moveToFun();
  };

  // Movement helpers
  const moveToDream = () => {
    if (allocatedToFun > 0) {
      setAllocatedToFun((prev) => prev - 1);
      setAllocatedToDream((prev) => prev + 1);
      soundSynth.playTap();
      setPennyMood('happy');
      setPennySpeech('Awesome! Allocating ₹50 more to your Dream Vault brings your goal weeks closer!');
    }
  };

  const moveToFun = () => {
    if (allocatedToDream > 0) {
      setAllocatedToDream((prev) => prev - 1);
      setAllocatedToFun((prev) => prev + 1);
      soundSynth.playTap();
      setPennyMood('curious');
      setPennySpeech('Instant treats are sweet, but notice how it delays your dream goal!');
    }
  };

  // Simulate Next Week
  const handleNextWeek = () => {
    const newSaved = totalSaved + allocatedToDream * TOKEN_VALUE;
    const newFun = totalSpentFun + allocatedToFun * TOKEN_VALUE;
    const nextWeek = currentWeek + 1;

    setTotalSaved(newSaved);
    setTotalSpentFun(newFun);
    setCurrentWeek(nextWeek);

    soundSynth.playReward();

    if (newSaved >= selectedGoal.cost && !isGoalUnlocked) {
      setIsGoalUnlocked(true);
      setPennyMood('celebrate');
      const winSpeech = `Hooray! In Week ${nextWeek}, your patience paid off! You saved the full ${formatRupee(
        selectedGoal.cost
      )} for your ${selectedGoal.name}! You are a true savings superstar!`;
      setPennySpeech(winSpeech);
      setTriggerConfetti(true);
      setTimeout(() => setTriggerConfetti(false), 3000);
      speakText(winSpeech);
    } else {
      setPennyMood('cheer');
      const cheerSpeech = `Week ${nextWeek}: You tucked away another ${formatRupee(
        allocatedToDream * TOKEN_VALUE
      )}! Only ${formatRupee(Math.max(0, selectedGoal.cost - newSaved))} to go!`;
      setPennySpeech(cheerSpeech);
    }
  };

  // Reset lesson
  const handleReset = () => {
    setCurrentWeek(1);
    setTotalSaved(300);
    setTotalSpentFun(150);
    setAllocatedToDream(2);
    setAllocatedToFun(2);
    setIsGoalUnlocked(false);
    setPennyMood('happy');
    setPennySpeech('Fresh round! Pick your dream goal and budget your weekly allowance!');
    soundSynth.playTap();
  };

  return (
    <div className="space-y-6">
      {/* Confetti Explosion */}
      <ConfettiExplosion trigger={triggerConfetti} />

      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#53b0c9] text-white flex items-center justify-center shadow-[0_3px_0_0_#1e3a8a] shrink-0 text-2xl">
            🎯
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-blue-900 bg-[#53b0c9]/25 px-2.5 py-0.5 rounded-full">
                Interactive Drag-and-Drop Lesson
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs font-semibold text-stone-500">
                Concept: Delayed Gratification
              </span>
            </div>
            <h2 className="text-2xl font-black text-[#23201C]">
              The "Dream Purchase" Journey 🚀
            </h2>
            <p className="text-xs text-[#6B6457] mt-0.5">
              Learn why setting aside a slice of pocket money every week turns impossible dreams into reality!
            </p>
          </div>
        </div>

        {/* Audio & Restart */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              voiceEnabled
                ? 'bg-blue-100 text-blue-900 border-blue-300'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-blue-700" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF7F2] hover:bg-stone-200 text-stone-700 border border-stone-300 transition flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart Game</span>
          </button>
        </div>
      </div>

      {/* Step 1: Goal Selection Strip */}
      <div className="bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-extrabold text-[#23201C]">
              Step 1: Choose Your Dream Purchase
            </h3>
          </div>
          <span className="text-xs font-bold text-stone-500">
            Selected: <strong className="text-amber-800">{selectedGoal.name}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {DREAM_GOALS.map((goal) => {
            const isSelected = selectedGoal.id === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => {
                  setSelectedGoal(goal);
                  setIsGoalUnlocked(totalSaved >= goal.cost);
                  soundSynth.playTap();
                }}
                className={`p-5 rounded-2xl border-2 text-left transition relative flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-amber-50/70 border-amber-400 shadow-[0_3px_0_0_#d97706]'
                    : 'bg-[#FAF7F2] hover:bg-stone-50 border-stone-200 text-stone-600'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-3xl">{goal.icon}</span>
                    <span className="font-mono font-black text-sm text-stone-900 bg-white px-2.5 py-1 rounded-lg border border-stone-200 shadow-xs">
                      {formatRupee(goal.cost)}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-sm text-[#23201C] group-hover:text-amber-900">
                    {goal.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 mt-1 line-clamp-2">
                    {goal.tagline}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] font-bold">
                  <span className="text-amber-800">{goal.category}</span>
                  {isSelected && (
                    <span className="flex items-center gap-1 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Active Target</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Interactive Drag & Drop Allocation Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* LEFT DROP ZONE: Instant Fun Tray (5 cols) */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnFun}
          className="lg:col-span-4 bg-gradient-to-b from-[#e885cf]/15 to-[#c1008f]/10 rounded-3xl p-6 border-2 border-[#c1008f]/30 shadow-[0_4px_0_0_#c1008f]/20 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-[#c1008f] bg-white/80 px-2.5 py-0.5 rounded-full">
                Drop Zone 1: Instant Fun Tray
              </span>
              <span className="text-2xl">🍦</span>
            </div>
            <h3 className="text-lg font-black text-[#831843]">
              Spend Right Now!
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Gummies, fast food, sticker packs. Fun for 10 minutes, but leaves nothing for your bicycle!
            </p>

            {/* Token Slots Visual */}
            <div className="mt-5 p-4 rounded-2xl bg-white/70 border border-[#e885cf] min-h-[110px] flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: allocatedToFun }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#e885cf] to-[#c1008f] text-white font-black text-xs font-mono border-2 border-pink-700 shadow-md flex flex-col items-center justify-center select-none animate-pulse"
                >
                  <span>₹50</span>
                  <span className="text-[8px] font-sans font-bold">FUN</span>
                </div>
              ))}
              {allocatedToFun === 0 && (
                <span className="text-xs text-stone-400 italic font-medium">
                  No coins for instant treats this week.
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#c1008f]/20 flex items-center justify-between">
            <span className="text-xs font-bold text-[#831843]">
              Allocated: {formatRupee(allocatedToFun * TOKEN_VALUE)}
            </span>
            <button
              type="button"
              disabled={allocatedToDream === 0}
              onClick={moveToFun}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-pink-50 text-[#c1008f] border border-[#c1008f] text-xs font-extrabold disabled:opacity-40 transition shadow-2xs"
            >
              + Move to Fun
            </button>
          </div>
        </div>

        {/* CENTER: Draggable Allowance Coin Tokens (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col items-center justify-between text-center">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffd400]/30 text-amber-950 text-xs font-black mb-2">
              <span>Week {currentWeek} Pocket Allowance</span>
            </div>
            <h3 className="text-xl font-black text-[#23201C]">
              {formatRupee(WEEKLY_ALLOWANCE)} / Week
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Drag tokens left or right, or use the quick buttons below:
            </p>

            {/* Visual draggable token display */}
            <div className="mt-5 flex justify-center gap-2">
              {Array.from({ length: TOTAL_TOKENS }).map((_, idx) => {
                const isDream = idx < allocatedToDream;
                return (
                  <div
                    key={idx}
                    draggable
                    onDragStart={handleDragStart}
                    className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-mono font-black text-xs cursor-grab active:cursor-grabbing transition-transform hover:scale-110 shadow-md ${
                      isDream
                        ? 'bg-gradient-to-br from-[#ffd400] to-[#f76400] border-amber-600 text-amber-950'
                        : 'bg-gradient-to-br from-[#e885cf] to-[#c1008f] border-pink-700 text-white'
                    }`}
                    title="Drag to Dream Safe or Fun Tray"
                  >
                    <span>₹50</span>
                    <span className="text-[8px] uppercase tracking-wider font-sans font-extrabold">
                      {isDream ? 'DREAM' : 'TREAT'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Time Machine Projection Simulator */}
          <div className="w-full mt-6 bg-[#FAF7F2] p-4 rounded-2xl border border-[#E7DECE] text-left space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-extrabold text-stone-700">
              <Clock className="w-4 h-4 text-indigo-600" />
              <span>Time-Machine Projection:</span>
            </div>

            <p className="text-xs text-[#2E2820] font-medium leading-relaxed">
              At this saving rate (<strong>{formatRupee(weeklySavingsRate)}/week</strong>):
            </p>

            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-stone-200">
              <span className="text-xs text-stone-600">Goal Unlocked in:</span>
              <span className="font-mono font-black text-sm text-indigo-700">
                {weeklySavingsRate === 0
                  ? 'Never (₹0 saved)'
                  : weeksNeeded <= 0
                  ? 'Unlocked now!'
                  : `${weeksNeeded} Weeks (${(weeksNeeded / 4.3).toFixed(1)} mos)`}
              </span>
            </div>

            <p className="text-[11px] text-stone-500 italic">
              {allocatedToDream === 4
                ? '⚡ Fast Track! Saving 100% unlocks your goal in minimum time!'
                : allocatedToDream >= 2
                ? '⚖️ Balanced! You enjoy today while keeping your dream alive!'
                : '🐢 Slow pace! Most money is vanishing into instant snacks!'}
            </p>
          </div>

          {/* Simulate Next Week Action Button */}
          <button
            type="button"
            onClick={handleNextWeek}
            className="w-full mt-5 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-black text-sm shadow-[0_4px_0_0_#065f46] hover:translate-y-[-1px] active:translate-y-[2px] transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Simulate Week {currentWeek + 1} ⏩</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* RIGHT DROP ZONE: Dream Purchase Vault (4 cols) */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDropOnDream}
          className="lg:col-span-4 bg-gradient-to-b from-[#ffd400]/20 to-[#f76400]/15 rounded-3xl p-6 border-2 border-amber-400 shadow-[0_4px_0_0_#d97706] flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-white/80 px-2.5 py-0.5 rounded-full">
                Drop Zone 2: Dream Purchase Safe
              </span>
              <span className="text-2xl">{selectedGoal.icon}</span>
            </div>
            <h3 className="text-lg font-black text-[#451a03]">
              Locked for Dream Goal
            </h3>
            <p className="text-xs text-stone-600 mt-1">
              Every ₹50 dropped here stays locked until your {selectedGoal.name} is fully purchased!
            </p>

            {/* Token Slots Visual */}
            <div className="mt-5 p-4 rounded-2xl bg-white/70 border border-amber-300 min-h-[110px] flex flex-wrap items-center justify-center gap-2">
              {Array.from({ length: allocatedToDream }).map((_, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd400] to-[#f76400] text-amber-950 font-black text-xs font-mono border-2 border-amber-600 shadow-md flex flex-col items-center justify-center select-none animate-pulse"
                >
                  <span>₹50</span>
                  <span className="text-[8px] font-sans font-bold">GOAL</span>
                </div>
              ))}
              {allocatedToDream === 0 && (
                <span className="text-xs text-stone-400 italic font-medium">
                  Drop coins here to build your dream!
                </span>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-amber-300/80 flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">
              Allocated: {formatRupee(allocatedToDream * TOKEN_VALUE)}
            </span>
            <button
              type="button"
              disabled={allocatedToFun === 0}
              onClick={moveToDream}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-400 text-xs font-extrabold disabled:opacity-40 transition shadow-2xs"
            >
              + Move to Dream
            </button>
          </div>
        </div>
      </div>

      {/* Step 3: Cumulative Progress & Unlock Ceremony */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-black text-[#23201C]">
                Your Dream Vault Progress
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Current Week: {currentWeek} · Total Saved: <strong className="text-emerald-700">{formatRupee(totalSaved)}</strong> of {formatRupee(selectedGoal.cost)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-bold text-stone-500">Goal Completion</div>
              <div className="text-xl font-black text-amber-600 font-mono">
                {goalProgressPct}%
              </div>
            </div>

            {totalSaved >= selectedGoal.cost && (
              <span className="px-3 py-1.5 rounded-full bg-emerald-500 text-white font-black text-xs animate-bounce shadow-sm">
                🎉 UNLOCKED!
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar with Milestones */}
        <div className="relative w-full h-7 rounded-2xl bg-stone-100 border-2 border-stone-200 overflow-hidden p-0.5">
          <div
            className="h-full rounded-xl bg-gradient-to-r from-[#ffd400] via-[#f76400] to-emerald-500 transition-all duration-700 ease-out flex items-center justify-end pr-2 text-[11px] font-black text-white shadow-xs"
            style={{ width: `${Math.max(5, goalProgressPct)}%` }}
          >
            {goalProgressPct > 12 && <span>{goalProgressPct}%</span>}
          </div>
        </div>

        {/* Comparison Summary Strip */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
            <span className="font-bold text-emerald-900">Total in Dream Vault:</span>
            <span className="font-black text-emerald-700 font-mono">{formatRupee(totalSaved)}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-pink-50 border border-pink-200 flex items-center justify-between">
            <span className="font-bold text-pink-900">Spent on Instant Treats:</span>
            <span className="font-black text-pink-700 font-mono">{formatRupee(totalSpentFun)}</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 flex items-center justify-between">
            <span className="font-bold text-purple-900">Remaining to Goal:</span>
            <span className="font-black text-purple-700 font-mono">
              {formatRupee(Math.max(0, selectedGoal.cost - totalSaved))}
            </span>
          </div>
        </div>

        {/* Mascot Penny Celebration / Coaching Card */}
        <div className="mt-6 bg-[#FCFAF6] rounded-2xl p-5 border-2 border-amber-200 flex items-center gap-4">
          <div className="shrink-0">
            <Penny mood={pennyMood} size={58} showSpeech={false} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                Penny’s Money Lesson
              </span>
              <span className="text-xs text-stone-300">·</span>
              <span className="text-[11px] text-stone-500">Delayed Gratification Masterclass</span>
            </div>
            <p className="text-xs text-[#2E2820] font-medium mt-1 leading-relaxed">
              "{pennySpeech}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
