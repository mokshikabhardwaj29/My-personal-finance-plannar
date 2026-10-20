import React, { useState, useEffect } from 'react';
import {
  Users,
  Lock,
  Key,
  ShieldCheck,
  X,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import { Penny } from '../Penny';
import { UserProfile } from '../../types';

interface SwitchMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
  onSwitched: (user: UserProfile) => void;
}

export const SwitchMemberModal: React.FC<SwitchMemberModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
  onSwitched,
}) => {
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<any | null>(null);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setPassword('');
      setError(null);
      setSuccess(null);
      api
        .getFamilyMembers()
        .then((data) => {
          if (data && data.members) {
            setMembers(data.members);
            const other = data.members.find((m: any) => m.userId !== currentUserId) || data.members[0];
            setSelectedMember(other);
          }
        })
        .catch((err) => {
          setError(err.message || 'Failed to load family members');
        });
    }
  }, [isOpen, currentUserId]);

  if (!isOpen) return null;

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    setError(null);
    setSubmitting(true);

    try {
      if (usePassword) {
        // Unlock with email and password
        const res = await api.login({
          email: selectedMember.email,
          password,
        });
        setSuccess(`Unlocked as ${res.profile?.displayName || res.user.email}!`);
        setTimeout(() => {
          onSwitched({
            id: res.user.id,
            email: res.user.email,
            name: res.profile?.displayName || res.user.email.split('@')[0],
            role: res.role,
          });
          onClose();
        }, 350);
      } else {
        if (!/^\d{4}$/.test(pin)) {
          setError('Please enter a 4-digit numeric PIN.');
          setSubmitting(false);
          return;
        }

        const res = await api.pinUnlock({
          userId: selectedMember.userId,
          pin,
        });

        setSuccess(`Unlocked as ${res.profile?.displayName || res.user.email}!`);
        setTimeout(() => {
          onSwitched({
            id: res.user.id,
            email: res.user.email,
            name: res.profile?.displayName || res.user.email.split('@')[0],
            role: res.role,
          });
          onClose();
        }, 350);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeypadPress = (digit: string) => {
    if (pin.length < 4) {
      setPin((prev) => prev + digit);
    }
  };

  const handleKeypadBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="w-full max-w-md bg-white border-2 border-[#E7DECE] rounded-3xl shadow-[0_12px_40px_-10px_rgba(101,88,211,0.2)] p-6 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#E7DECE]">
          <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-[#23201C] flex items-center gap-1.5">
              Switch Family Member <Sparkles className="w-4 h-4 text-[#ffd400] fill-[#ffd400]" />
            </h2>
            <p className="text-xs text-[#8c8273]">
              Quickly switch sessions on this shared device using your salted 4-digit PIN.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Family Members Picker */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#5F574D] mb-2">Select Member to Unlock</label>
          <div className="grid grid-cols-2 gap-2">
            {members.map((m) => {
              const isSelected = selectedMember?.userId === m.userId;
              const isCurrent = currentUserId === m.userId;
              const roleBadgeColor =
                m.role === 'owner'
                  ? 'bg-purple-100 text-purple-800 border-purple-200'
                  : m.role === 'parent'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200';

              return (
                <button
                  key={m.userId}
                  type="button"
                  onClick={() => {
                    setSelectedMember(m);
                    setPin('');
                    setPassword('');
                    setError(null);
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#7f27a8] bg-purple-50/50 shadow-xs ring-2 ring-purple-100'
                      : 'border-[#E7DECE] bg-[#FAF8F5] hover:bg-stone-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-display font-black text-xs text-[#23201C] truncate">
                      {m.displayName}
                    </span>
                    {isCurrent && (
                      <span className="text-[9px] font-black uppercase text-stone-400">Current</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${roleBadgeColor}`}
                    >
                      {m.role}
                    </span>
                    {m.role === 'child' && (
                      <span className="text-[10px] font-bold text-stone-500">Age {m.age || 10}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN / Password Form */}
        {selectedMember && (
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#5F574D]">
                {usePassword ? 'Enter Account Password' : 'Enter 4-Digit Quick PIN'}
              </span>
              <button
                type="button"
                onClick={() => setUsePassword(!usePassword)}
                className="text-[11px] font-bold text-[#7f27a8] hover:underline"
              >
                {usePassword ? 'Use 4-Digit PIN instead' : 'Use Password instead'}
              </button>
            </div>

            {usePassword ? (
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter account password..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                />
              </div>
            ) : (
              <div>
                {/* 4-digit PIN Visual Indicator */}
                <div className="flex justify-center gap-3 my-3">
                  {[0, 1, 2, 3].map((index) => {
                    const filled = pin.length > index;
                    return (
                      <div
                        key={index}
                        className={`w-11 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all border-2 ${
                          filled
                            ? 'bg-[#7f27a8] text-white border-[#7f27a8] shadow-xs'
                            : 'bg-[#FAF8F5] border-[#E7DECE] text-stone-300'
                        }`}
                      >
                        {filled ? '•' : ''}
                      </div>
                    );
                  })}
                </div>

                {/* Keypad */}
                <div className="grid grid-cols-3 gap-2 mt-4 max-w-xs mx-auto">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleKeypadPress(digit)}
                      className="py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#FAF7F2] border-2 border-[#E7DECE] text-sm font-black text-[#23201C] transition active:translate-y-0.5 cursor-pointer"
                    >
                      {digit}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setPin('')}
                    className="py-3 rounded-2xl bg-[#FAF8F5] hover:bg-rose-50 border-2 border-[#E7DECE] text-xs font-bold text-stone-500 transition cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKeypadPress('0')}
                    className="py-3 rounded-2xl bg-[#FAF8F5] hover:bg-[#FAF7F2] border-2 border-[#E7DECE] text-sm font-black text-[#23201C] transition active:translate-y-0.5 cursor-pointer"
                  >
                    0
                  </button>
                  <button
                    type="button"
                    onClick={handleKeypadBackspace}
                    className="py-3 rounded-2xl bg-[#FAF8F5] hover:bg-stone-100 border-2 border-[#E7DECE] text-xs font-bold text-stone-500 transition cursor-pointer"
                  >
                    ⌫
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || (!usePassword && pin.length !== 4) || (usePassword && !password)}
              className="w-full py-3 px-4 bg-[#7f27a8] disabled:bg-stone-300 text-white font-black rounded-2xl shadow-[0_3px_0_0_#4c1d95] hover:brightness-105 active:translate-y-[2px] transition cursor-pointer text-xs flex items-center justify-center gap-2 mt-4"
            >
              <Key className="w-4 h-4" />
              <span>{submitting ? 'Verifying...' : `Unlock as ${selectedMember.displayName}`}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
