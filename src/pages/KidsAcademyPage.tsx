import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  HelpCircle,
  Trophy,
  Volume2,
  VolumeX,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Flame,
  Star,
  Compass,
  ArrowRight,
  Smile,
  ShieldCheck,
  Coins,
  RefreshCw,
  Target,
} from 'lucide-react';
import { Penny } from '../components/Penny';
import { ConfettiExplosion } from '../components/ConfettiExplosion';
import { formatRupee } from '../utils/format';
import { api } from '../services/api';
import { DigitalCoinJar } from '../components/DigitalCoinJar';
import { DreamPurchaseLesson } from '../components/DreamPurchaseLesson';

interface QuestionItem {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface NeedsWantsItem {
  name: string;
  category: 'need' | 'want';
  icon: string;
  explanation: string;
  cost: number;
}

const NEEDS_WANTS_ITEMS: NeedsWantsItem[] = [
  {
    name: 'School Textbooks & Notebooks',
    category: 'need',
    icon: '📚',
    cost: 350,
    explanation: 'Education helps you learn, grow, and build your future! This is an essential need.',
  },
  {
    name: 'Limited Edition Video Game Skin',
    category: 'want',
    icon: '🎮',
    cost: 499,
    explanation: 'Awesome and fun to look at, but your game works totally fine without it! That makes it a want.',
  },
  {
    name: 'Drinking Water & Healthy Meals',
    category: 'need',
    icon: '🥗',
    cost: 150,
    explanation: 'Your body needs clean fuel to run, think, and play cricket or football!',
  },
  {
    name: 'Fancy Designer Sneakers',
    category: 'want',
    icon: '👟',
    cost: 2500,
    explanation: 'Shoes to protect your feet are a need, but ultra-expensive branded sneakers are a fun want!',
  },
  {
    name: 'Raincoat or Umbrella in Monsoon',
    category: 'need',
    icon: '☔',
    cost: 250,
    explanation: 'Keeps you dry and safe from falling sick during heavy rain!',
  },
  {
    name: 'Mega Tub of Cinema Caramel Popcorn',
    category: 'want',
    icon: '🍿',
    cost: 380,
    explanation: 'Super tasty treat for movie night, but wholesome dinner at home is what your body really needs!',
  },
];

const QUICK_QUESTIONS = [
  {
    label: 'Why can’t RBI print infinite ₹500 notes?',
    query: 'Why can’t the government just print unlimited 500-rupee notes so everyone is rich?',
  },
  {
    label: 'What is Compound Interest?',
    query: 'Can you explain compound interest to me like I am 10 years old?',
  },
  {
    label: 'Needs vs Wants: What’s the secret?',
    query: 'What is the secret difference between Needs and Wants when spending pocket money?',
  },
  {
    label: 'How does UPI / QR code payment work?',
    query: 'How does UPI and phone scanning payment work? Is it real money or magic?',
  },
  {
    label: 'How to save ₹500 pocket money?',
    query: 'How should I divide my monthly ₹500 pocket money to buy a cricket bat or bicycle?',
  },
];

export const KidsAcademyPage: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<
    'coin_jar' | 'dream_goal' | 'ask' | 'game' | 'piggy' | 'story'
  >('coin_jar');
  const [ageGroup, setAgeGroup] = useState<'junior' | 'explorer' | 'teen'>('explorer');
  const [language, setLanguage] = useState<'english' | 'hinglish' | 'hindi'>('english');

  // Ask Penny State
  const [questionInput, setQuestionInput] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [triggerConfetti, setTriggerConfetti] = useState(false);

  // Needs vs Wants Game State
  const [gameAnswers, setGameAnswers] = useState<Record<string, 'need' | 'want'>>({});
  const [gameScore, setGameScore] = useState<number | null>(null);

  // Piggy Bank Simulator State
  const [pocketMoney, setPocketMoney] = useState<number>(500);

  // Story Mode State
  const [storyText, setStoryText] = useState<string | null>(null);
  const [storyChoices, setStoryChoices] = useState<string[]>([]);
  const [storyStep, setStoryStep] = useState(1);
  const [isStoryLoading, setIsStoryLoading] = useState(false);

  // Handle Ask Penny
  const handleAskPenny = async (queryText?: string) => {
    const q = (queryText || questionInput).trim();
    if (!q) return;

    setIsAsking(true);
    setAiAnswer(null);

    // Stop existing speech if any
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await api.kidsLearn({
        prompt: q,
        mode: 'ask',
        ageGroup,
        language,
      });
      setAiAnswer(res.result);
      setTriggerConfetti(true);
      setTimeout(() => setTriggerConfetti(false), 2000);
    } catch {
      setAiAnswer(
        "Oops! Penny had a tiny hiccup connecting to the vault. Remember: Smart savers always keep a little savings aside in ₹, and think before buying!"
      );
    } finally {
      setIsAsking(false);
    }
  };

  // Text-to-Speech
  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    if (!aiAnswer) return;

    // Clean markdown hashes/stars for clear speech
    const cleanSpeech = aiAnswer
      .replace(/[*#_`]/g, '')
      .replace(/₹/g, ' Rupees ');

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.rate = 0.95;
    utterance.pitch = 1.1; // friendly, animated Penny pitch

    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  // Needs vs Wants evaluation
  const handleAnswerGame = (itemName: string, choice: 'need' | 'want') => {
    const updated = { ...gameAnswers, [itemName]: choice };
    setGameAnswers(updated);

    if (Object.keys(updated).length === NEEDS_WANTS_ITEMS.length) {
      // Calculate score
      let score = 0;
      NEEDS_WANTS_ITEMS.forEach((item) => {
        if (updated[item.name] === item.category) score++;
      });
      setGameScore(score);
      if (score >= 5) {
        setTriggerConfetti(true);
        setTimeout(() => setTriggerConfetti(false), 2000);
      }
    }
  };

  const handleResetGame = () => {
    setGameAnswers({});
    setGameScore(null);
  };

  // Interactive Story Mode
  const handleStartStory = async (choice?: string) => {
    setIsStoryLoading(true);
    try {
      const nextStep = choice ? storyStep + 1 : 1;
      setStoryStep(nextStep);

      const res = await api.kidsLearn({
        prompt: 'Interactive Mela Money Quest with ₹500 pocket money',
        mode: 'story',
        ageGroup,
        language,
        storyStep: nextStep,
        storyChoice: choice || 'Arriving with a fresh ₹500 note',
      });

      setStoryText(res.result);

      // Extract choices if formatted or provide default branching
      if (res.result.includes('Option A') || res.result.includes('1.') || res.result.includes('Choice')) {
        setStoryChoices([
          'Invest ₹150 in the DIY Science Kit to learn astronomy',
          'Buy delicious fresh samosas & kulfi (₹100) and share with friends',
          'Put ₹250 into your pocket to deposit in your real bank tomorrow',
        ]);
      } else {
        setStoryChoices([
          'Keep ₹200 safe in your Dream Jar and spend ₹100 on the Ferris Wheel',
          'Buy a lovely handmade gift for Mom or Dad for ₹150',
          'Resist the shiny plastic whistle and save all rupees for a new bicycle',
        ]);
      }
    } catch {
      setStoryText(
        "You step into the colorful Mela with ₹500 in your pocket! A shiny toy stall gleams on the left (₹300), while the giant Ferris wheel spins on the right (₹80). What do you choose?"
      );
      setStoryChoices([
        'Ride the Ferris wheel for ₹80 and enjoy the breathtaking view',
        'Save the entire ₹500 for your dream sports kit',
      ]);
    } finally {
      setIsStoryLoading(false);
    }
  };

  return (
    <div className="space-y-6 antialiased">
      <ConfettiExplosion trigger={triggerConfetti} particleCount={120} />

      {/* Hero Banner: Warm, Crafted, Editorial Look */}
      <div className="bg-[#FAF6EF] rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] relative overflow-hidden">
        {/* Subtle decorative warm shapes */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-200/40 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="relative shrink-0">
              <Penny mood="happy" size={72} showSpeech={false} />
              <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow border-2 border-white">
                AI Tutor
              </div>
            </div>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>Penny’s Junior Academy</span>
                <span className="text-amber-500">•</span>
                <span>बच्‍चों की वित्तीय पाठशाला</span>
              </div>

              <h1 className="text-2xl md:text-3xl font-black text-[#23201C] tracking-tight">
                Fun Money Explorer for Kids & Teens
              </h1>

              <p className="text-sm text-[#5C564C] max-w-xl mt-1 leading-relaxed">
                Learn how rupees work, discover why money doesn’t grow on trees, master the magic of compound interest, and build smart habits with Penny!
              </p>
            </div>
          </div>

          {/* Age & Language Selectors */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0 bg-white/80 p-3 rounded-2xl border border-[#E7DECE]">
            {/* Age Tier */}
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#797163] block mb-1">
                Learner Age
              </label>
              <div className="flex items-center gap-1 text-xs">
                {(
                  [
                    { key: 'junior', label: '6-9 yrs' },
                    { key: 'explorer', label: '10-13 yrs' },
                    { key: 'teen', label: '14-17 yrs' },
                  ] as const
                ).map((tier) => (
                  <button
                    key={tier.key}
                    type="button"
                    onClick={() => setAgeGroup(tier.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      ageGroup === tier.key
                        ? 'bg-amber-500 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {tier.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="mt-1">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#797163] block mb-1">
                Language / भाषा
              </label>
              <div className="flex items-center gap-1 text-xs">
                {(
                  [
                    { key: 'english', label: 'English' },
                    { key: 'hinglish', label: 'Hinglish' },
                    { key: 'hindi', label: 'हिंदी' },
                  ] as const
                ).map((l) => (
                  <button
                    key={l.key}
                    type="button"
                    onClick={() => setLanguage(l.key)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      language === l.key
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feature Navigation Tabs */}
        <div className="mt-6 pt-5 border-t border-[#E7DECE] flex flex-wrap gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveSubTab('coin_jar')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'coin_jar'
                ? 'bg-[#ffd400] text-amber-950 font-black shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <Coins className="w-4 h-4 text-amber-700" />
            <span>Digital Coin Jar 🏺</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('dream_goal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'dream_goal'
                ? 'bg-[#53b0c9] text-white font-black shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Dream Goal Game 🎯</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('ask')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'ask'
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Ask Penny AI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('game')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'game'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Needs vs Wants Game</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('piggy')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'piggy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <Coins className="w-4 h-4" />
            <span>3-Jar Rule (₹)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('story');
              if (!storyText) handleStartStory();
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
              activeSubTab === 'story'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-white/80 text-[#4E483E] hover:bg-white border border-[#E7DECE]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Mela Adventure</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 0. DIGITAL COIN JAR WIDGET */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'coin_jar' && (
        <DigitalCoinJar ageGroup={ageGroup} language={language} />
      )}

      {/* ---------------------------------------------------- */}
      {/* 0.5. DREAM PURCHASE INTERACTIVE LESSON */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'dream_goal' && (
        <DreamPurchaseLesson ageGroup={ageGroup} language={language} />
      )}

      {/* ---------------------------------------------------- */}
      {/* 1. ASK PENNY AI TAB */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'ask' && (
        <div className="space-y-6">
          {/* Quick curiosity chips */}
          <div className="bg-white rounded-3xl p-6 border-2 border-[#E7DECE] shadow-[0_3px_0_0_#DCD1BF]">
            <h3 className="text-sm font-bold text-[#353028] mb-3 flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              <span>Tap a Curious Question to Ask Penny:</span>
            </h3>

            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuestionInput(q.query);
                    handleAskPenny(q.query);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#FAF7F2] hover:bg-amber-50 text-[#3C362D] hover:text-amber-900 border border-[#E7DECE] text-xs font-semibold transition text-left"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Custom Input Box */}
            <div className="mt-5 relative">
              <div className="flex items-center gap-2 bg-[#FAF7F2] rounded-2xl border-2 border-[#E7DECE] p-1.5 focus-within:border-amber-500 transition">
                <input
                  type="text"
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAskPenny();
                  }}
                  placeholder="Ask anything, e.g., 'What is a credit card?' or 'Why do banks charge interest?'"
                  className="flex-1 px-3 py-2 bg-transparent text-sm text-[#23201C] outline-none placeholder:text-stone-400"
                />

                <button
                  type="button"
                  disabled={isAsking || !questionInput.trim()}
                  onClick={() => handleAskPenny()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                >
                  {isAsking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </>
                  ) : (
                    <>
                      <span>Ask</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* AI Response Display Card */}
          {aiAnswer && (
            <div className="bg-[#FCFAF6] rounded-3xl p-6 md:p-8 border-2 border-amber-300 shadow-[0_4px_0_0_#E5D3B8] relative">
              <div className="flex items-center justify-between gap-4 pb-4 border-b border-amber-200">
                <div className="flex items-center gap-3">
                  <Penny mood="proud" size={48} showSpeech={false} />
                  <div>
                    <h3 className="font-extrabold text-[#23201C] text-base">
                      Penny’s Answer
                    </h3>
                    <p className="text-[11px] text-[#786E5E]">
                      Powered by Gemini AI • Tailored for {ageGroup === 'junior' ? '6-9 yrs' : ageGroup === 'explorer' ? '10-13 yrs' : '14-17 yrs'}
                    </p>
                  </div>
                </div>

                {/* Audio Listen Button */}
                <button
                  type="button"
                  onClick={handleToggleSpeak}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border ${
                    isSpeaking
                      ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                      : 'bg-white hover:bg-amber-50 text-amber-900 border-amber-300'
                  }`}
                >
                  {isSpeaking ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Stop Reading</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4 text-amber-600" />
                      <span>Listen to Penny</span>
                    </>
                  )}
                </button>
              </div>

              {/* Formatted Text */}
              <div className="mt-5 text-sm text-[#2E2922] leading-relaxed whitespace-pre-line space-y-3 font-normal">
                {aiAnswer}
              </div>

              {/* Encouragement Footer */}
              <div className="mt-6 pt-4 border-t border-amber-200/80 flex flex-wrap items-center justify-between gap-3 text-xs text-[#716757]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Educational habit builder • No real-money transactions • Safe for young minds</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setTriggerConfetti(true);
                    setTimeout(() => setTriggerConfetti(false), 2000);
                  }}
                  className="font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1 cursor-pointer"
                >
                  <span>Learned something new? Celebrate! 🎉</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 2. NEEDS VS WANTS DETECTIVE GAME */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'game' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold mb-1">
                <span>The Supermarket Detective</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#23201C]">
                Is It a Need (ज़रूरत) or a Want (इच्छा)?
              </h2>
              <p className="text-xs text-[#6B6457] mt-1">
                Review each everyday item. Click whether you consider it an absolute Need or a fun Want!
              </p>
            </div>

            {gameScore !== null && (
              <div className="flex items-center gap-3 bg-emerald-50 px-4 py-2.5 rounded-2xl border border-emerald-200">
                <Trophy className="w-6 h-6 text-amber-500 fill-amber-400" />
                <div>
                  <p className="text-xs font-bold text-emerald-950">
                    Score: {gameScore} / {NEEDS_WANTS_ITEMS.length}
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    {gameScore >= 5 ? '🌟 Master Detective!' : 'Good detective practice!'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleResetGame}
                  className="ml-2 p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-800 transition"
                  title="Try Again"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {NEEDS_WANTS_ITEMS.map((item, idx) => {
              const selected = gameAnswers[item.name];
              const isAnswered = Boolean(selected);
              const isCorrect = selected === item.category;

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                    !isAnswered
                      ? 'bg-[#FAF7F2] border-[#E7DECE]'
                      : isCorrect
                      ? 'bg-emerald-50/60 border-emerald-300'
                      : 'bg-amber-50/60 border-amber-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-3xl">{item.icon}</span>
                      <span className="px-2.5 py-1 rounded-full bg-stone-200/60 text-[#4D463B] text-xs font-bold">
                        {formatRupee(item.cost)}
                      </span>
                    </div>

                    <h4 className="font-bold text-[#23201C] text-sm mb-1">{item.name}</h4>

                    {isAnswered && (
                      <p className="text-xs text-[#524B40] mt-2 leading-relaxed bg-white/80 p-2.5 rounded-xl border border-stone-200">
                        {item.explanation}
                      </p>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAnswerGame(item.name, 'need')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        selected === 'need'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}
                    >
                      <span>🍎 Need</span>
                      {isAnswered && item.category === 'need' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleAnswerGame(item.name, 'want')}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                        selected === 'want'
                          ? 'bg-amber-500 text-white shadow-xs'
                          : 'bg-white hover:bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      <span>🎮 Want</span>
                      {isAnswered && item.category === 'want' && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 flex items-center gap-3">
            <Penny mood="comfort" size={40} showSpeech={false} />
            <p className="text-xs text-amber-900 leading-relaxed">
              <strong>Penny’s Wisdom:</strong> Wants are not bad! Fun toys and treats make life cheerful. The smart trick is taking care of your Needs first so your family never runs out of essentials.
            </p>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 3. 3-JAR PIGGY BANK SIMULATOR (₹) */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'piggy' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-bold mb-1">
                <span>The 3-Jar Pocket Money Rule</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#23201C]">
                Turn Any Pocket Money into a Savings Machine
              </h2>
              <p className="text-xs text-[#6B6457] mt-1">
                See how splitting your money in Indian Rupees (₹) guarantees you always have money for treats and big dreams!
              </p>
            </div>

            {/* Quick Amount Presets */}
            <div className="flex items-center gap-1.5 text-xs font-bold">
              {[200, 500, 1000, 2000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPocketMoney(amt)}
                  className={`px-3 py-1.5 rounded-xl border transition ${
                    pocketMoney === amt
                      ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                      : 'bg-stone-50 hover:bg-stone-100 text-stone-700 border-stone-200'
                  }`}
                >
                  {formatRupee(amt)}
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="bg-[#FAF7F2] p-5 rounded-2xl border border-[#E7DECE]">
            <div className="flex items-center justify-between text-xs font-bold text-[#4B4438] mb-2">
              <span>Your Pocket Money / Gift Money:</span>
              <span className="text-lg font-black text-indigo-700">{formatRupee(pocketMoney)}</span>
            </div>
            <input
              type="range"
              min="100"
              max="5000"
              step="50"
              value={pocketMoney}
              onChange={(e) => setPocketMoney(Number(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* The 3 Jars Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Spend Jar (50%) */}
            <div className="bg-emerald-50/70 border-2 border-emerald-300 rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🟢
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                    50% Split
                  </span>
                </div>

                <h3 className="font-extrabold text-[#23201C] text-base">Spend Jar</h3>
                <p className="text-xs text-emerald-900 mt-1">
                  For your immediate fun: ice cream, stationary, drawing books, small treats with friends.
                </p>

                <div className="mt-4 text-2xl font-black text-emerald-700">
                  {formatRupee(pocketMoney * 0.5)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-emerald-200 text-[11px] text-emerald-800 font-semibold">
                Spend guilt-free because your future is protected!
              </div>
            </div>

            {/* 2. Dream Jar (30%) */}
            <div className="bg-amber-50/70 border-2 border-amber-300 rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🟡
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
                    30% Split
                  </span>
                </div>

                <h3 className="font-extrabold text-[#23201C] text-base">Dream / Goal Jar</h3>
                <p className="text-xs text-amber-900 mt-1">
                  For big goals: a bicycle, sports gear, video games, or gifts for family.
                </p>

                <div className="mt-4 text-2xl font-black text-amber-700">
                  {formatRupee(pocketMoney * 0.3)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200 text-[11px] text-amber-800 font-semibold">
                In 6 months: {formatRupee(pocketMoney * 0.3 * 6)} saved!
              </div>
            </div>

            {/* 3. Give / Joy Jar (20%) */}
            <div className="bg-indigo-50/70 border-2 border-indigo-300 rounded-3xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500 text-white flex items-center justify-center font-black text-lg shadow-sm">
                    🟣
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-800">
                    20% Split
                  </span>
                </div>

                <h3 className="font-extrabold text-[#23201C] text-base">Give & Share Jar</h3>
                <p className="text-xs text-indigo-900 mt-1">
                  For bringing happiness to others: festival sweets, feeding street animals, donating to school causes.
                </p>

                <div className="mt-4 text-2xl font-black text-indigo-700">
                  {formatRupee(pocketMoney * 0.2)}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-indigo-200 text-[11px] text-indigo-800 font-semibold">
                Giving brings the richest joy of all!
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------- */}
      {/* 4. MELA MONEY ADVENTURE STORY */}
      {/* ---------------------------------------------------- */}
      {activeSubTab === 'story' && (
        <div className="bg-white rounded-3xl p-6 md:p-8 border-2 border-[#E7DECE] shadow-[0_4px_0_0_#DCD1BF] space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-100 text-purple-900 text-xs font-bold mb-1">
                <span>Interactive AI Story Quest</span>
              </div>
              <h2 className="text-xl font-extrabold text-[#23201C]">
                The ₹500 Mela Adventure
              </h2>
              <p className="text-xs text-[#6B6457] mt-1">
                You enter the bustling fair with ₹500. Your choices determine how much fun and how much savings you walk home with!
              </p>
            </div>

            <button
              type="button"
              onClick={() => handleStartStory()}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restart Story</span>
            </button>
          </div>

          {/* Story Card */}
          <div className="bg-[#FAF7F4] rounded-3xl p-6 border-2 border-purple-200 min-h-[160px] flex flex-col justify-between">
            {isStoryLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Penny mood="thinking" size={64} showSpeech={false} />
                <p className="text-xs font-bold text-purple-800 mt-4 animate-pulse">
                  Penny is writing the next chapter of your adventure...
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Penny mood="curious" size={44} showSpeech={false} />
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-purple-700">
                      Step {storyStep}
                    </span>
                    <h4 className="font-extrabold text-[#23201C] text-sm">
                      What do you do next?
                    </h4>
                  </div>
                </div>

                <p className="text-sm text-[#2E2820] leading-relaxed whitespace-pre-line font-medium">
                  {storyText ||
                    "Welcome to the vibrant City Fair! The smell of hot jalebis fills the air, colorful stalls stretch as far as you can see, and you have exactly ₹500 in your pocket. A vendor invites you to try the ring-toss game for ₹100, while your best friend wants to ride the giant swing for ₹80."}
                </p>
              </div>
            )}

            {/* Decision Choices */}
            {!isStoryLoading && storyChoices.length > 0 && (
              <div className="mt-6 pt-5 border-t border-purple-200/80 space-y-2.5">
                <p className="text-xs font-black uppercase tracking-wider text-purple-900">
                  Pick your move:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {storyChoices.map((choice, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleStartStory(choice)}
                      className="p-3.5 rounded-2xl bg-white hover:bg-purple-50 text-[#312B22] hover:text-purple-950 border-2 border-purple-200 text-xs font-bold transition text-left flex items-center justify-between group shadow-xs cursor-pointer"
                    >
                      <span>{choice}</span>
                      <ArrowRight className="w-4 h-4 text-purple-400 group-hover:text-purple-700 shrink-0 ml-2" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
