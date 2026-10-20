import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  User,
  Calendar,
  CheckCircle2,
  Heart,
  Key,
} from 'lucide-react';
import { api } from '../services/api';
import { Penny } from '../components/Penny';

interface OnboardingPageProps {
  initialDisplayName?: string;
  onCompleted: (updatedProfile: any) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({
  initialDisplayName = '',
  onCompleted,
}) => {
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'non-binary' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['budgeting', 'saving']);
  const [quickPin, setQuickPin] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const AVAILABLE_INTERESTS = [
    { id: 'budgeting', label: 'Family Budgeting', icon: '📊' },
    { id: 'saving', label: 'Emergency Savings', icon: '💰' },
    { id: 'kids_education', label: 'Kids Financial Literacy', icon: '🎓' },
    { id: 'goals', label: 'Dream Purchase Goals', icon: '🎯' },
    { id: 'investing', label: 'Long-Term Growth', icon: '🌱' },
    { id: 'digital_jar', label: 'Digital Coin Jar', icon: '🪙' },
  ];

  const toggleInterest = (id: string) => {
    if (selectedInterests.includes(id)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== id));
    } else {
      setSelectedInterests([...selectedInterests, id]);
    }
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDateOfBirth(val);
    if (val) {
      const birthYear = new Date(val).getFullYear();
      const currentYear = new Date().getFullYear();
      if (!isNaN(birthYear) && birthYear > 1900 && birthYear <= currentYear) {
        setAge(currentYear - birthYear);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.completeOnboarding({
        displayName: displayName.trim() || undefined,
        dateOfBirth: dateOfBirth || undefined,
        age: age ? Number(age) : undefined,
        gender, // Optional demographic
        interests: selectedInterests,
        quickPin: quickPin && /^\d{4}$/.test(quickPin) ? quickPin : undefined,
      });
      onCompleted(res.profile);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save onboarding profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F2] via-[#F8F9FD] to-[#F1F5F9] flex flex-col justify-center items-center p-4 md:p-8 select-none">
      <div className="w-full max-w-2xl bg-white border-2 border-[#E7DECE] rounded-3xl shadow-[0_12px_40px_-10px_rgba(101,88,211,0.12)] p-6 md:p-10 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-[#E7DECE]">
          <Penny mood="wave" size={54} showSpeech={false} enabled={true} />
          <div>
            <h1 className="font-display text-xl font-black text-[#23201C] tracking-tight flex items-center gap-1.5">
              Personalize Your Family Vault <Sparkles className="w-4 h-4 text-[#ffd400] fill-[#ffd400]" />
            </h1>
            <p className="text-xs text-[#8c8273]">
              Help Ledgerly tailor your family budgets, learning lessons, and habit goals.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Display Name */}
          <div>
            <label className="block text-xs font-bold text-[#5F574D] mb-1">
              Your Preferred Display Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Vance"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
              />
            </div>
          </div>

          {/* Date of Birth & Age */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5F574D] mb-1">
                Date of Birth <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={handleDobChange}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5F574D] mb-1">
                Age <span className="text-stone-400 font-normal">(optional)</span>
              </label>
              <input
                type="number"
                min={4}
                max={120}
                value={age}
                onChange={(e) => setAge(e.target.value ? Number(e.target.value) : '')}
                placeholder="Years"
                className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
              />
            </div>
          </div>

          {/* Optional Gender (with "prefer not to say" default) */}
          <div>
            <label className="block text-xs font-bold text-[#5F574D] mb-1.5">
              Gender <span className="text-stone-400 font-normal">(strictly optional)</span>
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { id: 'prefer_not_to_say', label: 'Prefer not to say' },
                { id: 'female', label: 'Female' },
                { id: 'male', label: 'Male' },
                { id: 'non-binary', label: 'Non-binary' },
              ].map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGender(g.id as any)}
                  className={`py-2 px-3 rounded-xl border-2 text-xs font-bold transition cursor-pointer text-center ${
                    gender === g.id
                      ? 'border-[#7f27a8] bg-[#7f27a8]/5 text-[#7f27a8]'
                      : 'border-[#E7DECE] bg-[#FAF8F5] text-stone-600 hover:border-stone-300'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {/* Interests Checklist */}
          <div>
            <label className="block text-xs font-bold text-[#5F574D] mb-1.5">
              Financial & Family Learning Interests
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {AVAILABLE_INTERESTS.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={`flex items-center gap-2 p-2.5 rounded-2xl border-2 text-left transition cursor-pointer ${
                      isSelected
                        ? 'border-[#7f27a8] bg-purple-50 text-[#7f27a8]'
                        : 'border-[#E7DECE] bg-[#FAF8F5] text-stone-700 hover:border-stone-300'
                    }`}
                  >
                    <span>{item.icon}</span>
                    <span className="text-xs font-bold truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Optional Quick-Switch PIN on Trusted Device */}
          <div className="p-4 bg-[#FAF8F5] rounded-2xl border border-[#E7DECE]">
            <div className="flex items-center gap-2 mb-1.5">
              <Key className="w-4 h-4 text-[#7f27a8]" />
              <label className="text-xs font-bold text-[#23201C]">
                Optional 4-Digit Device Quick PIN
              </label>
            </div>
            <p className="text-[11px] text-[#8c8273] mb-2">
              Enables fast profile switching on this trusted device after initial sign-in. Never used as a sole credential.
            </p>
            <input
              type="password"
              maxLength={4}
              value={quickPin}
              onChange={(e) => setQuickPin(e.target.value.replace(/\D/g, ''))}
              placeholder="4 numeric digits (e.g. 1234)"
              className="w-48 px-3.5 py-2 rounded-xl bg-white border-2 border-[#E7DECE] text-xs font-mono tracking-widest focus:outline-none focus:border-[#7f27a8]"
            />
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 bg-[#7f27a8] text-white font-black rounded-2xl shadow-[0_4px_0_0_#4c1d95] hover:brightness-105 active:translate-y-[2px] transition cursor-pointer text-xs flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <span>{submitting ? 'Saving Profile...' : 'Complete Onboarding & Enter Vault'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
