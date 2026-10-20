import React, { useState, useEffect, useRef } from 'react';
import {
  Coins,
  Sparkles,
  Trophy,
  RotateCcw,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  CheckCircle2,
  Target,
  ArrowDown,
  Gift,
} from 'lucide-react';
import { Penny } from './Penny';
import { soundSynth } from './Penny';
import { ConfettiExplosion } from './ConfettiExplosion';
import { formatRupee } from '../utils/format';

interface DigitalCoinJarProps {
  ageGroup?: 'junior' | 'explorer' | 'teen';
  language?: 'english' | 'hinglish' | 'hindi';
}

const STORAGE_KEY = 'kids_academy_coin_jar_v2';

const GOAL_PRESETS = [
  { label: 'Mini Savings (₹500)', value: 500 },
  { label: 'Medium Goal (₹1,000)', value: 1000 },
  { label: 'Mega Goal (₹2,500)', value: 2500 },
  { label: 'Super Treasure (₹5,000)', value: 5000 },
];

const COIN_DENOMINATIONS = [
  { value: 10, label: '₹10', color: 'from-[#ffd400] to-[#f76400]', text: '#7c2d12' },
  { value: 20, label: '₹20', color: 'from-[#53b0c9] to-[#2563eb]', text: '#1e3a8a' },
  { value: 50, label: '₹50', color: 'from-[#e885cf] to-[#c1008f]', text: '#831843' },
  { value: 100, label: '₹100', color: 'from-[#7f27a8] to-[#4c1d95]', text: '#ffffff' },
  { value: 200, label: '₹200', color: 'from-[#f76400] to-[#dc2626]', text: '#ffffff' },
  { value: 500, label: '₹500', color: 'from-[#ffd400] via-[#f59e0b] to-[#b45309]', text: '#451a03' },
];

export const DigitalCoinJar: React.FC<DigitalCoinJarProps> = ({
  ageGroup = 'explorer',
  language = 'english',
}) => {
  // Load saved state from localStorage if available
  const [savings, setSavings] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return typeof parsed.savings === 'number' ? parsed.savings : 350;
        }
      } catch {
        // ignore
      }
    }
    return 350;
  });

  const [targetGoal, setTargetGoal] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return typeof parsed.targetGoal === 'number' ? parsed.targetGoal : 1000;
        }
      } catch {
        // ignore
      }
    }
    return 1000;
  });

  const [milestonesAchieved, setMilestonesAchieved] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return Array.isArray(parsed.milestones) ? parsed.milestones : [];
        }
      } catch {
        // ignore
      }
    }
    return [];
  });

  // Mascot and animation states
  const [pennyMood, setPennyMood] = useState<'idle' | 'happy' | 'celebrate' | 'cheer' | 'proud'>('happy');
  const [pennySpeech, setPennySpeech] = useState<string>('Welcome to your Digital Coin Jar! Drop coins and watch your treasure grow!');
  const [isDropping, setIsDropping] = useState<boolean>(false);
  const [droppedCoinVal, setDroppedCoinVal] = useState<number | null>(null);
  const [triggerConfetti, setTriggerConfetti] = useState<boolean>(false);
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(true);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isOverJar, setIsOverJar] = useState<boolean>(false);
  const [recentAddMessage, setRecentAddMessage] = useState<string | null>(null);

  // Sync to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            savings,
            targetGoal,
            milestones: milestonesAchieved,
          })
        );
      } catch {
        // ignore
      }
    }
  }, [savings, targetGoal, milestonesAchieved]);

  // Voice speech helper
  const speakCelebration = (text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.15; // friendly, upbeat pitch for Penny
      window.speechSynthesis.speak(utterance);
    } catch {
      // ignore
    }
  };

  const percentage = Math.min(100, Math.round((savings / targetGoal) * 100));

  // Milestone triggers (25%, 50%, 75%, 100%)
  const checkMilestone = (newSavings: number, prevSavings: number) => {
    const prevPct = Math.round((prevSavings / targetGoal) * 100);
    const newPct = Math.round((newSavings / targetGoal) * 100);

    const thresholds = [
      {
        pct: 25,
        mood: 'happy' as const,
        en: 'Awesome start! You’ve reached 25% of your savings goal! Keep this momentum!',
        hi: 'शाबाश! आपने अपना 25% बचत लक्ष्य पूरा कर लिया है! ऐसे ही आगे बढ़ते रहें!',
      },
      {
        pct: 50,
        mood: 'cheer' as const,
        en: 'Woohoo! Halfway hero! You are 50% closer to unlocking your dream reward!',
        hi: 'कमाल कर दिया! आप आधा रास्ता तय कर चुके हैं! आपका सपना बस कुछ ही कदम दूर है!',
      },
      {
        pct: 75,
        mood: 'proud' as const,
        en: 'Superstar saver! 75% full! Your patience and discipline are paying off big time!',
        hi: 'अद्भुत! 75% गुल्लक भर चुका है! आपका धैर्य और समझदारी रंग ला रही है!',
      },
      {
        pct: 100,
        mood: 'celebrate' as const,
        en: 'JACKPOT! 100% GOAL ACHIEVED! Your coin jar is overflowing! You are a master saver!',
        hi: 'बधाई हो! 100% लक्ष्य पूरा! आपका कॉइन जार भर चुका है! आप एक सच्चे मनी मास्टर हैं!',
      },
    ];

    for (const t of thresholds) {
      if (prevPct < t.pct && newPct >= t.pct && !milestonesAchieved.includes(t.pct)) {
        setMilestonesAchieved((prev) => [...prev, t.pct]);
        setPennyMood(t.mood);
        const speechText = language === 'hindi' ? t.hi : t.en;
        setPennySpeech(speechText);
        setTriggerConfetti(true);
        setTimeout(() => setTriggerConfetti(false), 2600);

        if (soundEnabled) {
          soundSynth.playReward();
        }
        speakCelebration(speechText);
        return;
      }
    }
  };

  // Add savings
  const handleAddCoins = (amount: number) => {
    setIsDropping(true);
    setDroppedCoinVal(amount);

    if (soundEnabled) {
      soundSynth.playTap();
    }

    const prev = savings;
    const next = savings + amount;
    setSavings(next);
    setRecentAddMessage(`+${formatRupee(amount)} added to jar!`);

    setTimeout(() => {
      setIsDropping(false);
      setDroppedCoinVal(null);
    }, 700);

    setTimeout(() => {
      setRecentAddMessage(null);
    }, 2500);

    checkMilestone(next, prev);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, amount: number) => {
    e.dataTransfer.setData('text/plain', amount.toString());
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    if (!isOverJar) setIsOverJar(true);
  };

  const handleDragLeave = () => {
    setIsOverJar(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsOverJar(false);
    const raw = e.dataTransfer.getData('text/plain');
    const amount = parseInt(raw, 10);
    if (!isNaN(amount) && amount > 0) {
      handleAddCoins(amount);
    }
  };

  // Reset or withdraw
  const handleReset = () => {
    if (confirm('Would you like to empty the jar to spend on your Dream Goal and start a new round?')) {
      setSavings(0);
      setMilestonesAchieved([]);
      setPennyMood('idle');
      setPennySpeech('Fresh new jar ready! Let’s fill it up again token by token!');
      if (soundEnabled) soundSynth.playTap();
    }
  };

  // Generate coin visuals inside jar based on savings amount
  const maxCoins = 40;
  const coinCount = Math.min(maxCoins, Math.max(3, Math.round((savings / targetGoal) * maxCoins)));
  const coinsArray = Array.from({ length: coinCount }, (_, i) => i);

  return (
    <div className="space-y-6">
      {/* Accessibility & Confetti Canvas */}
      <ConfettiExplosion trigger={triggerConfetti} />

      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#ffd400] text-amber-950 flex items-center justify-center shadow-[0_3px_0_0_#b45309] shrink-0">
            <Coins className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-[#ffd400]/25 px-2.5 py-0.5 rounded-full">
                Interactive Savings Simulator
              </span>
              <span className="text-xs text-stone-400">·</span>
              <span className="text-xs font-semibold text-stone-500">Zero Real-Money Risk</span>
            </div>
            <h2 className="text-2xl font-black text-[#23201C]">
              Penny’s Digital Coin Jar 🏺
            </h2>
            <p className="text-xs text-[#6B6457] mt-0.5">
              Drop pocket coins into your transparent jar, watch the gold pile rise, and unlock celebrations!
            </p>
          </div>
        </div>

        {/* Audio Controls & Reset */}
        <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
          <button
            type="button"
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            className={`px-3 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 ${
              voiceEnabled
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-stone-100 text-stone-500 border-stone-200'
            }`}
            title="Toggle Voice Cheer"
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4 text-amber-700" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">Voice {voiceEnabled ? 'ON' : 'OFF'}</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-[#FAF7F2] hover:bg-stone-200 text-stone-700 border border-stone-300 transition flex items-center gap-1.5"
            title="Empty or restart jar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Empty Jar</span>
          </button>
        </div>
      </div>

      {/* Main 2-Zone Grid: Left Stage (Jar & Penny) + Right Control Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT ZONE: Interactive Glass Jar Stage (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] flex flex-col items-center justify-between relative overflow-hidden min-h-[520px]">
          {/* Subtle warm decorative background glow */}
          <div className="absolute -top-12 -left-12 w-48 h-48 rounded-full bg-[#ffd400]/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full bg-[#53b0c9]/20 blur-3xl pointer-events-none" />

          {/* Goal Header inside Stage */}
          <div className="w-full flex items-center justify-between z-10 mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-extrabold uppercase tracking-wide text-stone-600">
                Target Capacity:
              </span>
              <span className="text-xs font-black text-amber-700 font-mono">
                {formatRupee(targetGoal)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full">
                {percentage}% Full
              </span>
              {savings >= targetGoal && (
                <span className="text-xs font-black text-amber-950 bg-[#ffd400] px-2.5 py-1 rounded-full animate-bounce">
                  🏆 Goal Met!
                </span>
              )}
            </div>
          </div>

          {/* THE DIGITAL GLASS COIN JAR */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`relative w-64 md:w-72 flex flex-col items-center transition-transform duration-300 ${
              isOverJar ? 'scale-105' : 'hover:scale-[1.02]'
            }`}
          >
            {/* Coin Drop Entry Indicator */}
            {isOverJar && (
              <div className="absolute -top-10 z-30 flex items-center gap-1.5 text-xs font-black text-amber-600 bg-amber-100 px-3 py-1 rounded-full shadow-md animate-bounce">
                <ArrowDown className="w-4 h-4 animate-bounce" />
                <span>Drop Coin Here!</span>
              </div>
            )}

            {/* Falling Coin Animation */}
            {isDropping && (
              <div className="absolute top-2 z-40 animate-bounce flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-[#ffd400] to-[#f76400] border-2 border-amber-600 shadow-xl text-amber-950 font-black text-xs font-mono">
                +₹{droppedCoinVal}
              </div>
            )}

            {/* Jar Lid (Wood / Brass effect) */}
            <div className="w-40 h-6 bg-gradient-to-r from-amber-700 via-amber-600 to-amber-800 rounded-t-xl border-2 border-amber-900 shadow-md flex items-center justify-center">
              <div className="w-20 h-1 bg-amber-400/40 rounded-full" />
            </div>

            {/* Jar Neck */}
            <div className="w-36 h-4 bg-white/60 border-x-2 border-stone-300 backdrop-blur-xs flex items-center justify-center">
              <div className="w-24 h-1.5 bg-stone-300/60 rounded-full" />
            </div>

            {/* Jar Glass Body */}
            <div
              className={`relative w-64 md:w-72 h-80 rounded-b-[48px] rounded-t-2xl border-4 ${
                isOverJar ? 'border-[#ffd400] ring-4 ring-[#ffd400]/30' : 'border-stone-300'
              } bg-gradient-to-b from-white/70 via-blue-50/30 to-amber-50/40 backdrop-blur-sm shadow-[inset_0_0_20px_rgba(0,0,0,0.06),0_12px_24px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col justify-end p-4 transition-all`}
            >
              {/* Glass Reflection Highlight */}
              <div className="absolute top-0 left-4 w-4 h-full bg-gradient-to-b from-white/80 via-white/20 to-transparent rounded-full pointer-events-none transform -skew-x-12" />
              <div className="absolute top-0 right-5 w-2 h-3/4 bg-white/40 rounded-full pointer-events-none" />

              {/* Milestone Markers along Jar Height */}
              <div className="absolute inset-y-0 right-2 flex flex-col justify-between py-6 pointer-events-none text-[10px] font-mono font-bold text-stone-400">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-amber-500" />
                  <span className={percentage >= 100 ? 'text-amber-700 font-black' : ''}>100%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-stone-300" />
                  <span className={percentage >= 75 ? 'text-amber-700 font-black' : ''}>75%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-stone-300" />
                  <span className={percentage >= 50 ? 'text-amber-700 font-black' : ''}>50%</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-0.5 bg-stone-300" />
                  <span className={percentage >= 25 ? 'text-amber-700 font-black' : ''}>25%</span>
                </div>
              </div>

              {/* Liquid / Golden Savings Fill */}
              <div
                className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-[#ffd400]/40 via-[#f76400]/25 to-amber-300/30 transition-all duration-700 ease-out border-t-2 border-amber-400/80"
                style={{ height: `${Math.max(8, percentage)}%` }}
              >
                {/* Surface Wave Shimmer */}
                <div className="w-full h-1.5 bg-white/60 animate-pulse" />
              </div>

              {/* Stacked Rupee Coins Graphics */}
              <div className="relative z-10 w-full flex flex-wrap-reverse justify-center items-end gap-1.5 max-h-[85%] overflow-hidden py-2">
                {coinsArray.map((idx) => {
                  const rotation = (idx * 27) % 30 - 15;
                  return (
                    <div
                      key={idx}
                      style={{ transform: `rotate(${rotation}deg)` }}
                      className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ffd400] via-[#f59e0b] to-[#b45309] border-2 border-amber-600 shadow-md flex items-center justify-center text-amber-950 font-black text-xs font-mono select-none transition-transform hover:scale-110 cursor-pointer"
                      title="Indian Rupee Coin"
                    >
                      <span className="drop-shadow-xs">₹</span>
                    </div>
                  );
                })}
              </div>

              {/* Jar Bottom Shadow inside glass */}
              <div className="absolute bottom-0 inset-x-0 h-4 bg-amber-900/10 rounded-b-[44px] pointer-events-none" />
            </div>

            {/* Wooden Base Platform */}
            <div className="w-72 md:w-80 h-5 bg-gradient-to-r from-stone-300 via-stone-200 to-stone-300 rounded-full border border-stone-400 shadow-lg mt-1 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
                PIGGY VAULT · INDIA
              </span>
            </div>
          </div>

          {/* Current Saved Display & Recent Message */}
          <div className="mt-4 text-center z-10">
            <div className="text-3xl font-black text-[#23201C] font-mono">
              {formatRupee(savings)}
            </div>
            <p className="text-xs font-bold text-stone-500 mt-0.5">
              of {formatRupee(targetGoal)} goal
            </p>

            {recentAddMessage && (
              <div className="inline-block mt-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black animate-bounce shadow-xs">
                {recentAddMessage}
              </div>
            )}
          </div>

          {/* Penny Mascot Interactive Commentary Box */}
          <div className="w-full mt-6 bg-[#FCFAF6] rounded-2xl p-4 border-2 border-amber-200 flex items-center gap-4 z-10">
            <div className="shrink-0">
              <Penny mood={pennyMood} size={54} showSpeech={false} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-800">
                  Penny’s Cheer
                </span>
                <span className="text-xs text-stone-300">·</span>
                <span className="text-[11px] text-stone-500">
                  {percentage >= 100
                    ? 'Goal Champion 🏆'
                    : percentage >= 50
                    ? 'Super Saver 🌟'
                    : 'Getting Started 🚀'}
                </span>
              </div>
              <p className="text-xs text-[#2E2820] font-medium mt-0.5 leading-snug">
                "{pennySpeech}"
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT ZONE: Control Deck & Coin Spender (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* 1. Coin Tray (Draggable & Clickable) */}
          <div className="bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-[#23201C]">
                  Pocket Coins Tray
                </h3>
              </div>
              <span className="text-[11px] font-bold text-stone-500">
                Drag or tap to drop
              </span>
            </div>
            <p className="text-xs text-[#6B6457] mb-4">
              Click any coin or drag it into the glass jar above to add to your savings!
            </p>

            {/* Grid of Coin Denominations with Palette Colors */}
            <div className="grid grid-cols-3 gap-2.5">
              {COIN_DENOMINATIONS.map((coin) => (
                <button
                  key={coin.value}
                  type="button"
                  draggable
                  onDragStart={(e) => handleDragStart(e, coin.value)}
                  onClick={() => handleAddCoins(coin.value)}
                  className={`p-3 rounded-2xl bg-gradient-to-br ${coin.color} text-white font-black text-sm shadow-[0_3px_0_0_rgba(0,0,0,0.15)] hover:translate-y-[-2px] active:translate-y-[1px] transition cursor-grab active:cursor-grabbing flex flex-col items-center justify-center gap-1 group`}
                >
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-mono text-xs">
                    ₹
                  </div>
                  <span className="font-mono tracking-tight">{coin.label}</span>
                  <span className="text-[9px] opacity-80 uppercase tracking-widest font-sans font-bold">
                    Drop
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Choose Target Goal */}
          <div className="bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-[#7f27a8]" />
                <h3 className="text-base font-extrabold text-[#23201C]">
                  Set Jar Target Goal
                </h3>
              </div>
              <span className="text-xs font-mono font-bold text-purple-700">
                {formatRupee(targetGoal)}
              </span>
            </div>
            <p className="text-xs text-[#6B6457] mb-3">
              Pick what size goal you're aiming for this month:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {GOAL_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => {
                    setTargetGoal(preset.value);
                    if (soundEnabled) soundSynth.playTap();
                  }}
                  className={`p-2.5 rounded-xl text-xs font-bold border transition text-left ${
                    targetGoal === preset.value
                      ? 'bg-[#7f27a8] text-white border-purple-800 shadow-sm'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. Milestone Badges Shelf */}
          <div className="bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-[#23201C]">
                  Milestone Badges
                </h3>
              </div>
              <span className="text-xs font-bold text-stone-500">
                {milestonesAchieved.length} / 4 unlocked
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { pct: 25, title: 'Seed Saver', desc: 'Reached 25%', icon: '🌱' },
                { pct: 50, title: 'Halfway Hero', desc: 'Reached 50%', icon: '⚡' },
                { pct: 75, title: 'Treasure Hunter', desc: 'Reached 75%', icon: '🗺️' },
                { pct: 100, title: 'Jackpot Master', desc: 'Jar 100% Full', icon: '👑' },
              ].map((badge) => {
                const unlocked = milestonesAchieved.includes(badge.pct) || percentage >= badge.pct;
                return (
                  <div
                    key={badge.pct}
                    className={`p-3 rounded-2xl border flex items-center gap-2.5 transition ${
                      unlocked
                        ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs'
                        : 'bg-stone-50 border-stone-200 text-stone-400 opacity-60'
                    }`}
                  >
                    <span className="text-xl">{badge.icon}</span>
                    <div>
                      <h4 className="text-xs font-extrabold">{badge.title}</h4>
                      <p className="text-[10px] text-stone-500">{badge.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
