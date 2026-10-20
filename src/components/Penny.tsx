import React, { useState, useEffect, useRef } from 'react';
import { PennyMood } from '../types';

interface PennyProps {
  mood?: PennyMood;
  size?: number; // width & height in px
  speech?: string;
  showSpeech?: boolean;
  onTap?: () => void;
  className?: string;
  disableSpeechDismiss?: boolean;
  enabled?: boolean; // if false (from settings.gameProfile.showPenny), shows static icon
  soundEnabled?: boolean;
  reducedMotion?: boolean;
}

// Synthesized sound effects using Web Audio API (0 audio files)
class SoundSynth {
  private ctx: AudioContext | null = null;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  playTap() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.1); // A5
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch {
      // ignore audio errors
    }
  }

  playReward() {
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const gain = this.ctx!.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.08);
        gain.gain.setValueAtTime(0.06, now + i * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.2);
        osc.connect(gain);
        gain.connect(this.ctx!.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.2);
      });
    } catch {
      // ignore audio errors
    }
  }
}

export const soundSynth = new SoundSynth();

const ROTATING_PENNY_LINES = [
  "Every small step builds your financial peace of mind!",
  "Taking a look today? Consistency is where real progress happens.",
  "Your financial records are private, organized, and right where you need them.",
  "Sorted ledgers make life feel lighter!",
  "Nice rhythm today! Step by step, habit by habit.",
  "I'm keeping an eye on your receipts and statements in the vault.",
  "Checking in regularly keeps surprises at zero.",
];

export const Penny: React.FC<PennyProps> = ({
  mood = 'idle',
  size = 72,
  speech,
  showSpeech = true,
  onTap,
  className = '',
  disableSpeechDismiss = false,
  enabled = true,
  soundEnabled = false,
  reducedMotion = false,
}) => {
  const [internalMood, setInternalMood] = useState<PennyMood>(mood);
  const [activeSpeech, setActiveSpeech] = useState<string | undefined>(speech);
  const [speechVisible, setSpeechVisible] = useState<boolean>(Boolean(speech && showSpeech));
  const [lastLineIndex, setLastLineIndex] = useState<number>(-1);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync external mood changes
  useEffect(() => {
    setInternalMood(mood);
  }, [mood]);

  // Sync speech prop
  useEffect(() => {
    if (speech) {
      setActiveSpeech(speech);
      setSpeechVisible(true);
    }
  }, [speech]);

  // Inactivity / sleep detection (Section 6.2: sleepy after 90s inactivity or late night)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    const resetInactivity = () => {
      clearTimeout(timer);
      if (internalMood === 'sleepy' && mood === 'idle') {
        setInternalMood('idle');
      }
      timer = setTimeout(() => {
        if (mood === 'idle') {
          setInternalMood('sleepy');
        }
      }, 90000); // 90 seconds
    };

    window.addEventListener('mousemove', resetInactivity);
    window.addEventListener('keydown', resetInactivity);
    resetInactivity();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetInactivity);
      window.removeEventListener('keydown', resetInactivity);
    };
  }, [mood, internalMood]);

  // Auto dismiss speech after 6 seconds unless disabled
  useEffect(() => {
    if (speechVisible && !disableSpeechDismiss) {
      const dismissTimer = setTimeout(() => {
        setSpeechVisible(false);
      }, 6000);
      return () => clearTimeout(dismissTimer);
    }
  }, [speechVisible, disableSpeechDismiss, activeSpeech]);

  // Eyes track cursor in 'peek' mood
  useEffect(() => {
    if (internalMood !== 'peek') return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = Math.max(-4, Math.min(4, (e.clientX - centerX) / 40));
      const dy = Math.max(-3, Math.min(3, (e.clientY - centerY) / 40));
      setCursorPos({ x: dx, y: dy });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [internalMood]);

  const handlePennyClick = () => {
    if (soundEnabled) {
      soundSynth.playTap();
    }

    // Trigger bounce & happy reaction
    setInternalMood('happy');
    setTimeout(() => {
      setInternalMood(mood);
    }, 1200);

    // Pick a new rotating line (never the same line twice)
    let nextIdx = Math.floor(Math.random() * ROTATING_PENNY_LINES.length);
    if (nextIdx === lastLineIndex) {
      nextIdx = (nextIdx + 1) % ROTATING_PENNY_LINES.length;
    }
    setLastLineIndex(nextIdx);
    setActiveSpeech(ROTATING_PENNY_LINES[nextIdx]);
    setSpeechVisible(true);

    if (onTap) onTap();
  };

  // If Penny is toggled off in settings, render static icon badge with speech
  if (!enabled) {
    return (
      <div className={`inline-flex items-center gap-3 ${className}`}>
        <div
          className="w-10 h-10 rounded-full bg-violet-100 border border-violet-200 flex items-center justify-center text-violet-700 shadow-sm"
          title="Ledgerly Companion"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" />
            <path d="M12 7v10M9 9h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        {speechVisible && activeSpeech && (
          <div
            aria-live="polite"
            className="bg-white border border-violet-100 rounded-xl px-3.5 py-2 text-sm text-gray-800 shadow-sm max-w-sm"
          >
            {activeSpeech}
          </div>
        )}
      </div>
    );
  }

  // Animation CSS styles based on mood and reduced motion
  const getMotionClass = () => {
    if (reducedMotion) return 'transition-opacity duration-300';
    switch (internalMood) {
      case 'idle':
        return 'animate-penny-breathe';
      case 'wave':
        return 'animate-penny-hop';
      case 'happy':
        return 'animate-penny-bounce';
      case 'celebrate':
        return 'animate-penny-celebrate';
      case 'cheer':
        return 'animate-penny-spin';
      case 'thinking':
        return 'animate-penny-wobble';
      case 'curious':
        return 'animate-penny-tilt';
      case 'sleepy':
        return 'animate-penny-sleep opacity-85';
      case 'concerned':
        return 'animate-penny-shake';
      case 'proud':
        return 'animate-penny-glow';
      case 'peek':
        return 'animate-penny-peek';
      case 'comfort':
        return 'animate-penny-comfort';
      default:
        return 'animate-penny-breathe';
    }
  };

  // Leaf sprout animation
  const getLeafTransform = () => {
    if (reducedMotion) return '';
    switch (internalMood) {
      case 'curious':
        return 'rotate-12 translate-x-1';
      case 'concerned':
      case 'comfort':
        return 'rotate-[-8deg] translate-y-0.5';
      case 'thinking':
        return 'rotate-[-14deg]';
      case 'celebrate':
      case 'cheer':
        return 'scale-110 -translate-y-1';
      default:
        return '';
    }
  };

  // Eye pupil offset
  const getEyeOffset = () => {
    if (internalMood === 'peek') {
      return { x: cursorPos.x, y: cursorPos.y };
    }
    if (internalMood === 'thinking') {
      return { x: -2, y: -2 };
    }
    if (internalMood === 'curious') {
      return { x: 2, y: 1 };
    }
    return { x: 0, y: 0 };
  };

  const eyeOffset = getEyeOffset();

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center gap-3 select-none ${className}`}
    >
      {/* Mascot Coin Sprite */}
      <button
        type="button"
        onClick={handlePennyClick}
        aria-label={`Penny the mascot, feeling ${internalMood}. Tap to interact.`}
        className={`relative group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-full ${getMotionClass()}`}
        style={{ width: size, height: size }}
      >
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md overflow-visible"
          aria-hidden="true"
        >
          <defs>
            {/* Plump coin gradient: violet with warm golden rim */}
            <linearGradient id="pennyBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#7E72E7" />
              <stop offset="50%" stopColor="#6558D3" />
              <stop offset="100%" stopColor="#4E42B8" />
            </linearGradient>

            <linearGradient id="pennyRimGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#F9D479" />
              <stop offset="60%" stopColor="#F5B83D" />
              <stop offset="100%" stopColor="#D49419" />
            </linearGradient>

            <radialGradient id="pennyHighlight" cx="35%" cy="30%" r="50%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="pennyLeafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ADE80" />
              <stop offset="100%" stopColor="#16A34A" />
            </linearGradient>
          </defs>

          {/* Golden glow behind Penny in cheer/proud mood */}
          {(internalMood === 'cheer' || internalMood === 'proud') && (
            <circle
              cx="50"
              cy="54"
              r="46"
              fill="none"
              stroke="#F5B83D"
              strokeWidth="4"
              opacity="0.6"
              className="animate-ping"
            />
          )}

          {/* Stubby Feet */}
          <ellipse cx="38" cy="88" rx="8" ry="5" fill="#4E42B8" />
          <ellipse cx="62" cy="88" rx="8" ry="5" fill="#4E42B8" />

          {/* Outer Coin Rim */}
          <circle cx="50" cy="52" r="38" fill="url(#pennyRimGrad)" stroke="#C68510" strokeWidth="1.5" />

          {/* Inner Coin Body */}
          <circle cx="50" cy="52" r="34" fill="url(#pennyBodyGrad)" />

          {/* Inner Rim Groove */}
          <circle cx="50" cy="52" r="31" fill="none" stroke="#8A7EF0" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />

          {/* Soft 3D Sphere Highlight */}
          <circle cx="50" cy="52" r="34" fill="url(#pennyHighlight)" />

          {/* Rosy Cheeks */}
          <ellipse cx="32" cy="57" rx="4.5" ry="3" fill="#F472B6" opacity="0.65" />
          <ellipse cx="68" cy="57" rx="4.5" ry="3" fill="#F472B6" opacity="0.65" />

          {/* Leaf Sprout on top */}
          <g
            className={`transition-transform duration-300 origin-[50px_18px] ${getLeafTransform()}`}
          >
            {/* Sprout stem */}
            <path
              d="M50 18 Q50 12 51 9"
              fill="none"
              stroke="#15803D"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Main leaf */}
            <path
              d="M51 9 C43 6 44 0 54 2 C58 8 54 9 51 9 Z"
              fill="url(#pennyLeafGrad)"
              stroke="#15803D"
              strokeWidth="1"
            />
            {/* Tiny companion bud */}
            <path
              d="M51 11 C55 10 59 13 56 16 C53 16 52 13 51 11 Z"
              fill="url(#pennyLeafGrad)"
              stroke="#15803D"
              strokeWidth="0.8"
            />
          </g>

          {/* Eyes Layer */}
          {internalMood === 'happy' || internalMood === 'cheer' || internalMood === 'celebrate' ? (
            // Curved smiling happy eyes
            <g stroke="#FFFFFF" strokeWidth="3.2" strokeLinecap="round" fill="none">
              <path d="M33 48 Q40 42 45 48" />
              <path d="M55 48 Q60 42 67 48" />
            </g>
          ) : internalMood === 'sleepy' ? (
            // Sleepy half-closed eyes
            <g stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" fill="none">
              <path d="M33 51 Q40 54 45 51" />
              <path d="M55 51 Q60 54 67 51" />
              {/* Drifting Z marks */}
              <text x="68" y="32" fill="#E2E8F0" fontSize="11" fontWeight="bold" className="animate-pulse">
                z
              </text>
              <text x="76" y="22" fill="#E2E8F0" fontSize="8" fontWeight="bold" className="animate-pulse">
                z
              </text>
            </g>
          ) : (
            // Expressive round eyes with pupils & specular catches
            <g>
              {/* Left Eye */}
              <ellipse cx="38" cy="49" rx="5.5" ry="6.5" fill="#FFFFFF" />
              <circle
                cx={38 + eyeOffset.x}
                cy={49 + eyeOffset.y}
                r="3.5"
                fill="#1E1B4B"
              />
              <circle cx={36.5 + eyeOffset.x} cy={47 + eyeOffset.y} r="1.3" fill="#FFFFFF" />

              {/* Right Eye */}
              <ellipse cx="62" cy="49" rx="5.5" ry="6.5" fill="#FFFFFF" />
              <circle
                cx={62 + eyeOffset.x}
                cy={49 + eyeOffset.y}
                r="3.5"
                fill="#1E1B4B"
              />
              <circle cx={60.5 + eyeOffset.x} cy={47 + eyeOffset.y} r="1.3" fill="#FFFFFF" />
            </g>
          )}

          {/* Eyebrows */}
          {internalMood === 'concerned' && (
            <g stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round">
              <path d="M34 40 L42 43" />
              <path d="M66 40 L58 43" />
            </g>
          )}
          {internalMood === 'curious' && (
            <g stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round">
              <path d="M34 41 L42 39" />
              <path d="M58 43 L66 41" />
            </g>
          )}
          {internalMood === 'proud' && (
            <g stroke="#F8FAFC" strokeWidth="2" strokeLinecap="round">
              <path d="M34 41 L42 43" />
              <path d="M58 43 L66 41" />
            </g>
          )}

          {/* Mouth */}
          {internalMood === 'concerned' ? (
            <path
              d="M44 63 Q50 58 56 63"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          ) : internalMood === 'thinking' ? (
            <ellipse cx="50" cy="62" rx="2.5" ry="3.5" fill="#FFFFFF" />
          ) : internalMood === 'comfort' ? (
            <path
              d="M45 61 Q50 64 55 61"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          ) : (
            // Cheerful open smile
            <path
              d="M42 59 Q50 67 58 59"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2.8"
              strokeLinecap="round"
            />
          )}

          {/* Stubby Arms */}
          {internalMood === 'wave' ? (
            <g>
              <ellipse cx="20" cy="52" rx="4.5" ry="6" fill="#4E42B8" />
              <ellipse
                cx="80"
                cy="38"
                rx="5"
                ry="7"
                fill="#4E42B8"
                className="origin-[75px_45px] animate-penny-wave-arm"
              />
            </g>
          ) : internalMood === 'celebrate' || internalMood === 'cheer' ? (
            <g>
              <ellipse cx="18" cy="38" rx="5" ry="7" fill="#4E42B8" />
              <ellipse cx="82" cy="38" rx="5" ry="7" fill="#4E42B8" />
            </g>
          ) : (
            <g>
              <ellipse cx="20" cy="54" rx="4.5" ry="6" fill="#4E42B8" />
              <ellipse cx="80" cy="54" rx="4.5" ry="6" fill="#4E42B8" />
            </g>
          )}

          {/* Sparkles for celebrate mood */}
          {(internalMood === 'celebrate' || internalMood === 'cheer') && (
            <g fill="#F5B83D">
              <polygon points="14,20 16,15 21,14 16,13 14,8 12,13 7,14 12,15" />
              <polygon points="86,22 88,18 92,17 88,16 86,12 84,16 80,17 84,18" />
            </g>
          )}
        </svg>
      </button>

      {/* Speech Bubble */}
      {speechVisible && activeSpeech && (
        <div
          role="status"
          aria-live="polite"
          onClick={() => setSpeechVisible(false)}
          className="relative z-10 max-w-xs md:max-w-md bg-white text-gray-800 text-sm md:text-base font-medium px-4 py-2.5 rounded-2xl border border-violet-100 shadow-md cursor-pointer hover:border-violet-300 transition-all group"
        >
          {/* Bubble tail pointing toward Penny */}
          <div className="absolute top-1/2 -left-2 -translate-y-1/2 w-0 h-0 border-y-8 border-y-transparent border-r-8 border-r-white group-hover:border-r-white drop-shadow-sm" />
          <p className="leading-snug">{activeSpeech}</p>
        </div>
      )}
    </div>
  );
};
