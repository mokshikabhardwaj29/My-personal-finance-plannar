import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  Key,
  Shield,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Users,
} from 'lucide-react';
import { api } from '../services/api';
import { Penny } from '../components/Penny';

interface AuthPageProps {
  onAuthSuccess: (sessionData: {
    user: any;
    profile: any;
    family: any;
    role: 'owner' | 'parent' | 'child';
  }) => void;
  initialMode?: 'signin' | 'register' | 'forgot';
}

export const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'register' | 'forgot' | 'reset' | 'verify' | 'pin'>(initialMode);
  const [ownershipClaimed, setOwnershipClaimed] = useState<boolean>(true);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [pin, setPin] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Token URL query params
  const [tokenParam, setTokenParam] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    // Check URL parameters for email verification or password reset tokens
    const urlParams = new URLSearchParams(window.location.search);
    const verifyToken = urlParams.get('verifyToken');
    const resetToken = urlParams.get('resetToken');

    if (verifyToken) {
      setMode('verify');
      setTokenParam(verifyToken);
      handleDirectVerify(verifyToken);
    } else if (resetToken) {
      setMode('reset');
      setTokenParam(resetToken);
    }

    // Check ownership status
    api.getClaimStatus().then((res) => {
      setOwnershipClaimed(res.ownershipClaimed);
      if (!res.ownershipClaimed) {
        setMode('register');
      }
    });
  }, []);

  const handleDirectVerify = async (token: string) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.verifyEmail(token);
      setSuccessMessage('Email address verified successfully! You may now sign in.');
      setMode('signin');
      // Clean query params
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.login({ email, password, remember: rememberMe });
      onAuthSuccess({
        user: res.user,
        profile: res.profile,
        family: res.family,
        role: res.role,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long');
      setLoading(false);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      const res = await api.register({
        email,
        password,
        displayName: displayName || email.split('@')[0],
        remember: rememberMe,
      });
      onAuthSuccess({
        user: res.user,
        profile: res.profile,
        family: res.family,
        role: res.role,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);
    try {
      await api.forgotPassword(email);
      setSuccessMessage('If an account exists with this email, a reset link has been dispatched.');
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to request reset');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenParam) {
      setErrorMessage('Missing password reset token');
      return;
    }
    if (password.length < 10) {
      setErrorMessage('Password must be at least 10 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      await api.resetPassword(tokenParam, password);
      setSuccessMessage('Password reset successfully! All old sessions were revoked. Please sign in with your new password.');
      setMode('signin');
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFF9F2] via-[#F8F9FD] to-[#F1F5F9] flex flex-col justify-center items-center p-4 md:p-8 select-none">
      <div className="w-full max-w-4xl bg-white border-2 border-[#E7DECE] rounded-3xl shadow-[0_12px_40px_-10px_rgba(101,88,211,0.12)] overflow-hidden relative z-10 grid grid-cols-1 md:grid-cols-12">
        {/* Left Informational Hero Panel */}
        <div className="md:col-span-5 bg-gradient-to-b from-[#FAF7F2] to-[#F3EEE5] p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r-2 border-[#E7DECE]">
          <div>
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#7f27a8] to-[#9333ea] flex items-center justify-center text-white font-black text-2xl shadow-[0_4px_12px_rgba(127,39,168,0.35)]">
                L
              </div>
              <div>
                <h1 className="font-display text-2xl font-black text-[#23201C] tracking-tight flex items-center gap-1.5">
                  Ledgerly <Sparkles className="w-4 h-4 text-[#ffd400] fill-[#ffd400]" />
                </h1>
                <p className="text-xs font-bold text-[#8c8273]">Private Family Finance</p>
              </div>
            </div>

            {/* Mascot Greeting */}
            <div className="p-4 bg-white/90 rounded-2xl border-2 border-[#E7DECE] shadow-xs mb-6 text-center flex flex-col items-center">
              <div className="relative mb-2">
                <Penny mood="happy" size={68} showSpeech={false} enabled={true} />
              </div>
              <h2 className="font-display font-black text-base text-[#23201C]">
                {!ownershipClaimed
                  ? 'Set Up Your Family Vault'
                  : mode === 'register'
                  ? 'Create Family Account'
                  : 'Welcome Back'}
              </h2>
              <p className="text-xs text-[#5f574d] font-medium mt-1">
                Your data is stored in your family&apos;s private account. Every request is verified server-side.
              </p>
            </div>

            {/* Accurate Architecture & Security Facts */}
            <div className="space-y-2 text-xs text-[#5F574D]">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span>Server-enforced role authorization</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <span>Family data isolation & scoping</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center text-amber-700">
                  <Users className="w-3.5 h-3.5" />
                </div>
                <span>India DPDP Act 2023 parental consent</span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-[#E7DECE]">
            <p className="text-[11px] text-center text-[#8c8273] font-bold">
              Single-tenant family finance &bull; Multi-role accounts
            </p>
          </div>
        </div>

        {/* Right Authentication Form Panel */}
        <div className="md:col-span-7 p-6 md:p-8 flex flex-col justify-between">
          <div>
            {/* Header Tabs: Sign In / Create Account */}
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#E7DECE]">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    mode === 'signin' ? 'bg-[#7f27a8] text-white shadow-xs' : 'text-[#8c8273] hover:text-[#23201C]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                    mode === 'register' ? 'bg-[#7f27a8] text-white shadow-xs' : 'text-[#8c8273] hover:text-[#23201C]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              {!ownershipClaimed && (
                <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 uppercase">
                  Claim Ownership
                </span>
              )}
            </div>

            {/* Error or Success Notice */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}
            {successMessage && (
              <div className="mb-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* 1. SIGN IN MODE */}
            {mode === 'signin' && (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@family.internal"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-[#5F574D]">Password</label>
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] font-bold text-[#7f27a8] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-stone-400 hover:text-stone-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-[#5F574D] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#E7DECE] text-[#7f27a8]"
                    />
                    <span>Remember this session</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#7f27a8] text-white font-black rounded-2xl shadow-[0_3px_0_0_#4c1d95] hover:brightness-105 active:translate-y-[2px] transition cursor-pointer text-xs flex items-center justify-center gap-2"
                >
                  <span>{loading ? 'Authenticating...' : 'Sign In to Family Vault'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 2. CREATE ACCOUNT MODE */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                {!ownershipClaimed && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-[11px] text-amber-900 font-medium">
                    ✨ <strong>Primary Family Vault Claim:</strong> You are the first user to register. You will automatically claim ownership of the existing family vault without losing existing records.
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Vance"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="alex@family.internal"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">
                    Password <span className="text-stone-400 font-normal">(minimum 10 characters)</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 10 characters..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#7f27a8] text-white font-black rounded-2xl shadow-[0_3px_0_0_#4c1d95] hover:brightness-105 active:translate-y-[2px] transition cursor-pointer text-xs flex items-center justify-center gap-2 mt-2"
                >
                  <span>{loading ? 'Creating Account...' : 'Create Family Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            {/* 3. FORGOT PASSWORD MODE */}
            {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Account Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@family.internal"
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <p className="text-[11px] text-[#8c8273]">
                  We will dispatch a single-use password reset link. This link expires in 1 hour and revokes all active sessions upon use.
                </p>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="flex-1 py-2.5 px-4 bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-bold rounded-2xl text-[#23201C]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 bg-[#7f27a8] text-white font-black rounded-2xl shadow-[0_3px_0_0_#4c1d95] text-xs"
                  >
                    {loading ? 'Dispatching...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}

            {/* 4. RESET PASSWORD MODE */}
            {mode === 'reset' && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">New Password (min 10 chars)</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New secure password..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#5F574D] mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password..."
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] text-xs font-medium focus:outline-none focus:border-[#7f27a8]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-[#7f27a8] text-white font-black rounded-2xl shadow-[0_3px_0_0_#4c1d95] text-xs"
                >
                  {loading ? 'Resetting Password...' : 'Reset Password & Revoke Sessions'}
                </button>
              </form>
            )}
          </div>

          {/* Child Safe Login Notice */}
          <div className="pt-4 border-t border-[#E7DECE] text-center">
            <p className="text-[11px] text-[#8c8273]">
              Are you a child? Ask your parent or family owner to create your safe learning profile with parental consent.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
