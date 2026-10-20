import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  RotateCcw,
  AlertTriangle,
  Folder,
  Sliders,
  Sparkles,
  Volume2,
  Eye,
  Check,
  Plus,
  Trash2,
  Save,
  Clock,
  ExternalLink,
  Users,
  Lock,
  Key,
  CheckCircle2,
  AlertCircle,
  Shield,
  UserPlus,
} from 'lucide-react';
import { AppSettings, GameState, GameProfile, UserProfile } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';
import { api } from '../services/api';

interface SettingsPageProps {
  settings: AppSettings;
  game: GameState;
  onSavePreferences: (prefs: Partial<AppSettings> & Record<string, unknown>) => Promise<void>;
  onOpenResetProgressModal: () => void;
  onOpenDataWipeModal: () => void;
  onRestoreIgnoredSuggestions: () => Promise<void>;
  currentUser?: UserProfile | null;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  game,
  onSavePreferences,
  onOpenResetProgressModal,
  onOpenDataWipeModal,
  onRestoreIgnoredSuggestions,
  currentUser,
}) => {
  // Family & DPDP Consent Management state
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);
  const [loadingFamily, setLoadingFamily] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<number | ''>(10);
  const [childDob, setChildDob] = useState('');
  const [childPin, setChildPin] = useState('');
  const [parentConsent, setParentConsent] = useState(false);
  const [addingChild, setAddingChild] = useState(false);

  // Invite member state (owner only)
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'parent' | 'child'>('parent');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  // Audit log state
  const [showAudit, setShowAudit] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  const [familyNotice, setFamilyNotice] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState<string | null>(null);

  const loadFamily = async () => {
    setLoadingFamily(true);
    try {
      const data = await api.getFamilyMembers();
      if (data && data.members) {
        setFamilyMembers(data.members);
      }
    } catch {
      // Ignore if unauthenticated
    } finally {
      setLoadingFamily(false);
    }
  };

  useEffect(() => {
    loadFamily();
  }, []);
  // Net worth state
  const [assets, setAssets] = useState<string>(
    settings.assetsTotal !== undefined ? String(settings.assetsTotal) : '0'
  );
  const [liabilities, setLiabilities] = useState<string>(
    settings.liabilitiesTotal !== undefined ? String(settings.liabilitiesTotal) : '0'
  );
  const [savingNetWorth, setSavingNetWorth] = useState(false);
  const [netWorthSavedMsg, setNetWorthSavedMsg] = useState(false);

  // Categories & Accounts state
  const [categories, setCategories] = useState<string[]>(settings.categories || []);
  const [newCatInput, setNewCatInput] = useState('');
  const [accounts, setAccounts] = useState<string[]>(settings.accounts || []);
  const [newAccInput, setNewAccInput] = useState('');

  // Mascot and motion settings
  const [gameProfile, setGameProfile] = useState<GameProfile>(
    settings.gameProfile || game.profile || {
      showPenny: true,
      celebrations: true,
      sounds: false,
      animationLevel: 'follow',
    }
  );
  const [userTimezone, setUserTimezone] = useState<string>(
    settings.userTimezone || game.userTimezone || 'America/Los_Angeles'
  );

  // Live net worth preview
  const parsedAssets = parseFloat(assets) || 0;
  const parsedLiabilities = parseFloat(liabilities) || 0;
  const liveNetWorth = parsedAssets - parsedLiabilities;

  const handleSaveNetWorth = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingNetWorth(true);
    setNetWorthSavedMsg(false);
    try {
      await onSavePreferences({
        assetsTotal: parsedAssets,
        liabilitiesTotal: parsedLiabilities,
      });
      setNetWorthSavedMsg(true);
      setTimeout(() => setNetWorthSavedMsg(false), 3000);
    } finally {
      setSavingNetWorth(false);
    }
  };

  const handleAddCategory = async () => {
    const clean = newCatInput.trim();
    if (!clean) return;
    if (categories.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      alert('A category with this name already exists.');
      return;
    }
    const updated = [...categories, clean];
    setCategories(updated);
    setNewCatInput('');
    await onSavePreferences({ categories: updated });
  };

  const handleRemoveCategory = async (cat: string) => {
    if (categories.length <= 1) {
      alert('You must have at least one category.');
      return;
    }
    if (confirm(`Remove category "${cat}" from future selectors? (Historical entries keep this label)`)) {
      const updated = categories.filter((c) => c !== cat);
      setCategories(updated);
      await onSavePreferences({ categories: updated });
    }
  };

  const handleAddAccount = async () => {
    const clean = newAccInput.trim();
    if (!clean) return;
    if (accounts.some((a) => a.toLowerCase() === clean.toLowerCase())) {
      alert('An account with this name already exists.');
      return;
    }
    const updated = [...accounts, clean];
    setAccounts(updated);
    setNewAccInput('');
    await onSavePreferences({ accounts: updated });
  };

  const handleRemoveAccount = async (acc: string) => {
    if (accounts.length <= 1) {
      alert('You must have at least one account.');
      return;
    }
    if (confirm(`Remove account "${acc}" from future pickers? (Historical entries keep this label)`)) {
      const updated = accounts.filter((a) => a !== acc);
      setAccounts(updated);
      await onSavePreferences({ accounts: updated });
    }
  };

  const handleToggleProfile = async (key: keyof GameProfile, value: any) => {
    const updated = { ...gameProfile, [key]: value };
    setGameProfile(updated);
    await onSavePreferences({ gameProfile: updated });
  };

  const handleTimezoneChange = async (newTz: string) => {
    setUserTimezone(newTz);
    await onSavePreferences({ userTimezone: newTz });
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentConsent) {
      setFamilyError('Verifiable parental consent is mandatory under India DPDP Act 2023.');
      return;
    }
    if (!/^\d{4}$/.test(childPin)) {
      setFamilyError('Please enter a 4-digit numeric PIN for child sign-in.');
      return;
    }

    setAddingChild(true);
    setFamilyError(null);
    setFamilyNotice(null);

    try {
      const res = await api.createChild({
        displayName: childName.trim() || 'Kid Explorer',
        age: Number(childAge) || 10,
        dateOfBirth: childDob || undefined,
        quickPin: childPin,
        parentalConsentGranted: true,
      });

      setFamilyNotice(`Child account created for ${res.childProfile.displayName}!`);
      setChildName('');
      setChildPin('');
      setChildDob('');
      setParentConsent(false);
      setShowAddChild(false);
      await loadFamily();
    } catch (err: unknown) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to create child account');
    } finally {
      setAddingChild(false);
    }
  };

  const handleRevokeConsent = async (childId: string, name: string) => {
    if (!window.confirm(`Revoke DPDP consent and permanently delete the account and records for ${name}?`)) {
      return;
    }

    try {
      await api.deleteChild(childId);
      setFamilyNotice(`Consent revoked and records erased for ${name}.`);
      await loadFamily();
    } catch (err: unknown) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to revoke consent');
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviting(true);
    setFamilyError(null);
    setFamilyNotice(null);

    try {
      await api.inviteMember({
        email: inviteEmail,
        role: inviteRole,
        displayName: inviteName || undefined,
      });
      setFamilyNotice(`Invited ${inviteEmail} as ${inviteRole}!`);
      setInviteEmail('');
      setInviteName('');
      setShowInvite(false);
      await loadFamily();
    } catch (err: unknown) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to invite member');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, name: string) => {
    if (!window.confirm(`Remove ${name} from this family vault?`)) {
      return;
    }

    try {
      await api.removeMember(userId);
      setFamilyNotice(`Removed ${name} from family.`);
      await loadFamily();
    } catch (err: unknown) {
      setFamilyError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleViewAudit = async () => {
    const nextState = !showAudit;
    setShowAudit(nextState);
    if (nextState) {
      setLoadingAudit(true);
      try {
        const res = await api.getFamilyAuditLogs();
        setAuditLogs(res.logs || []);
      } catch {
        // ignore
      } finally {
        setLoadingAudit(false);
      }
    }
  };

  const dismissedCount = (settings.dismissedPatterns || []).length;
  const driveFolder = settings.driveFolderMeta || {
    name: 'Ledgerly Financial Inbox',
    url: 'https://drive.google.com/drive/folders/drive_folder_ledgerly_financial_inbox',
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Settings</h1>
        <p className="text-xs text-gray-500">
          Configure Net Worth, accounts, categories, automated sync, and mascot preferences.
        </p>
      </div>

      {/* 1. Net Worth Setup (Section 18.1) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-violet-600" />
          <h2 className="text-lg font-bold text-gray-900">Net Worth Setup</h2>
        </div>
        <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
          Net Worth is your <strong>total assets minus total liabilities</strong>. It does not automatically equal monthly cash flow (income minus spending); you define your starting balance here and update it over time (+20 XP for first save).
        </p>

        <form onSubmit={handleSaveNetWorth} className="space-y-4 max-w-xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Total Assets (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={assets}
                onChange={(e) => setAssets(e.target.value)}
                className="w-full text-base font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
                placeholder="e.g. 250000"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">Bank accounts, investments, savings</span>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1">
                Total Liabilities (₹)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={liabilities}
                onChange={(e) => setLiabilities(e.target.value)}
                className="w-full text-base font-bold px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-violet-500 outline-none"
                placeholder="e.g. 50000"
              />
              <span className="text-[10px] text-gray-400 mt-0.5 block">Loans, credit cards, mortgages</span>
            </div>
          </div>

          {/* Live Preview */}
          <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-violet-900">Calculated Net Worth Preview</p>
              <p className="text-[11px] text-violet-600">Assets ({formatRupee(parsedAssets)}) − Liabilities ({formatRupee(parsedLiabilities)})</p>
            </div>
            <span className="text-xl font-black text-violet-950">
              {formatRupee(liveNetWorth, { showDecimals: true })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingNetWorth}
              className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold text-xs hover:bg-violet-700 transition shadow disabled:opacity-50"
            >
              {savingNetWorth ? 'Saving...' : 'Save Net Worth'}
            </button>
            {netWorthSavedMsg && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <Check className="w-4 h-4" /> Saved successfully!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 2. Managed Categories and Accounts (Section 18.2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Managed Categories */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Managed Categories</h2>
          <p className="text-xs text-gray-500">Categories available in entry forms and filters.</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category name"
              value={newCatInput}
              onChange={(e) => setNewCatInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="px-3 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs"
            >
              Add
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
            {categories.map((c) => (
              <div key={c} className="py-2 flex items-center justify-between">
                <span className="font-semibold text-gray-800">{c}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCategory(c)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded"
                  title="Remove category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Managed Accounts */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-bold text-gray-900">Managed Accounts</h2>
          <p className="text-xs text-gray-500">Account labels for organizing credit, checking, and cash.</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New account name"
              value={newAccInput}
              onChange={(e) => setNewAccInput(e.target.value)}
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-300 outline-none"
            />
            <button
              type="button"
              onClick={handleAddAccount}
              className="px-3 py-2 rounded-xl bg-violet-600 text-white font-bold text-xs"
            >
              Add
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
            {accounts.map((acc) => (
              <div key={acc} className="py-2 flex items-center justify-between">
                <span className="font-semibold text-gray-800">{acc}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(acc)}
                  className="text-gray-400 hover:text-red-600 p-1 rounded"
                  title="Remove account"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Automatic Detection Settings (Section 18.3) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <h2 className="text-base font-bold text-gray-900">Automatic Recurring & Subscription Detection</h2>
        <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
          The detection engine analyzes repeating merchant patterns in your real transactions. Patterns matching streaming services, utilities, and stable intervals are surfaced as candidates on the Recurring and Subscriptions tabs so you never miss a renewal.
        </p>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
          <div>
            <p className="font-bold text-gray-800">Ignored Suggestions: {dismissedCount}</p>
            <p className="text-gray-500">Dismissed patterns are hidden from recurring recommendation panels.</p>
          </div>
          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={onRestoreIgnoredSuggestions}
              className="px-3.5 py-1.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition"
            >
              Restore Ignored Suggestions
            </button>
          )}
        </div>
      </div>

      {/* 4. Google Drive Sync Settings (Section 18.4) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Folder className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-bold text-gray-900">Google Drive Financial Inbox</h2>
        </div>
        <p className="text-xs text-gray-500 max-w-2xl leading-relaxed">
          Add receipts, statement CSVs, invoices, or expense sheets to your dedicated Drive folder: <strong className="text-gray-900">{driveFolder.name}</strong>. It will be checked automatically every day at 8:00 AM.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-200">
          <div>
            <span className="text-gray-400 block font-semibold">Folder Name</span>
            <span className="font-bold text-gray-800">{driveFolder.name}</span>
          </div>
          <div>
            <span className="text-gray-400 block font-semibold">Schedule & Cadence</span>
            <span className="font-bold text-gray-800">8:00 AM Daily ({userTimezone})</span>
          </div>
        </div>
      </div>

      {/* 5. Penny & Motion Settings (Section 18.5) */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <Penny mood="idle" size={40} showSpeech={false} enabled={gameProfile.showPenny} />
          <div>
            <h2 className="text-base font-bold text-gray-900">Penny & Motion Preferences</h2>
            <p className="text-xs text-gray-500">Customize mascot presence, celebration animations, and sounds.</p>
          </div>
        </div>

        <div className="divide-y divide-gray-100 text-xs">
          {/* Show Penny Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Show Penny the Mascot</p>
              <p className="text-gray-500">When disabled, Penny is replaced by a minimal static icon.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleProfile('showPenny', !gameProfile.showPenny)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                gameProfile.showPenny ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition-transform ${
                  gameProfile.showPenny ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Celebrations Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Celebrations & Confetti</p>
              <p className="text-gray-500">Confetti particle bursts on level-ups and milestones.</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleProfile('celebrations', !gameProfile.celebrations)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                gameProfile.celebrations ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition-transform ${
                  gameProfile.celebrations ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Sounds Toggle */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Sound Effects (Web Audio)</p>
              <p className="text-gray-500">Soft synthesized chimes on tap and reward moments (default off).</p>
            </div>
            <button
              type="button"
              onClick={() => handleToggleProfile('sounds', !gameProfile.sounds)}
              className={`w-12 h-6 rounded-full transition-colors relative ${
                gameProfile.sounds ? 'bg-violet-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`w-5 h-5 rounded-full bg-white block shadow-sm transform transition-transform ${
                  gameProfile.sounds ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Animation Level */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">Animation Level</p>
              <p className="text-gray-500">Control motion intensity and reduced-motion behavior.</p>
            </div>
            <select
              value={gameProfile.animationLevel}
              onChange={(e) => handleToggleProfile('animationLevel', e.target.value as any)}
              className="text-xs font-semibold p-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="follow">Follow Device Setting</option>
              <option value="full">Full Animations</option>
              <option value="reduced">Reduced Motion (Fades only)</option>
            </select>
          </div>

          {/* Timezone */}
          <div className="py-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-gray-900">User Timezone</p>
              <p className="text-gray-500">Used for streaks, daily quests, and 8:00 AM automation timing.</p>
            </div>
            <input
              type="text"
              value={userTimezone}
              onChange={(e) => handleTimezoneChange(e.target.value)}
              className="text-xs font-semibold p-2 border border-gray-300 rounded-lg w-48"
              placeholder="e.g. America/Los_Angeles"
            />
          </div>
        </div>

        {/* Reset Progress Button */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-800">Reset Gamification Progress</p>
            <p className="text-[11px] text-gray-500">
              Clear XP, streaks, levels, and badges to start game progress from scratch without touching financial records.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenResetProgressModal}
            className="px-4 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition"
          >
            Reset Progress
          </button>
        </div>
      </div>

      {/* 5. Family Vault & India DPDP Act 2023 Consent Management */}
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-purple-600" />
            <div>
              <h2 className="text-lg font-bold text-gray-900">Family Members & India DPDP Act 2023 Consent</h2>
              <p className="text-xs text-gray-500">
                Manage family member roles (Owner, Parent, Child) and verifiable parental consents under Section 9.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {currentUser?.role === 'owner' && (
              <button
                type="button"
                onClick={() => {
                  setShowInvite(!showInvite);
                  setShowAddChild(false);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition flex items-center gap-1.5"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </button>
            )}

            {(currentUser?.role === 'owner' || currentUser?.role === 'parent') && (
              <button
                type="button"
                onClick={() => {
                  setShowAddChild(!showAddChild);
                  setShowInvite(false);
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Add Child Account</span>
              </button>
            )}
          </div>
        </div>

        {familyNotice && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{familyNotice}</span>
          </div>
        )}

        {familyError && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{familyError}</span>
          </div>
        )}

        {/* Add Child Form with Mandatory Verifiable Parental Consent */}
        {showAddChild && (
          <form onSubmit={handleAddChild} className="p-5 rounded-2xl bg-[#FAF8F5] border-2 border-[#E7DECE] space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-[#23201C] uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Create Minor Child Account (India DPDP Act 2023 Compliant)
              </h3>
              <button
                type="button"
                onClick={() => setShowAddChild(false)}
                className="text-xs font-bold text-stone-400 hover:text-stone-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Child Display Name</label>
                <input
                  type="text"
                  required
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="e.g. Maya Vance"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Age (Years)</label>
                <input
                  type="number"
                  min="3"
                  max="17"
                  required
                  value={childAge}
                  onChange={(e) => setChildAge(e.target.value ? Number(e.target.value) : '')}
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                />
                <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Under 18: Minor Account</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">4-Digit Quick Unlock PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  required
                  value={childPin}
                  onChange={(e) => setChildPin(e.target.value)}
                  placeholder="4 digits (e.g. 1234)"
                  className="w-full text-xs font-black tracking-widest px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                />
              </div>
            </div>

            {/* Verifiable Parental Consent Checkbox */}
            <div className="p-3.5 rounded-xl bg-white border border-amber-300 space-y-2">
              <label className="flex items-start gap-2.5 text-xs font-bold text-stone-800 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={parentConsent}
                  onChange={(e) => setParentConsent(e.target.checked)}
                  className="mt-0.5 rounded border-stone-400 text-purple-600 focus:ring-purple-500"
                />
                <span className="leading-relaxed">
                  I hereby verify that I am the lawful parent / legal guardian of this child. I provide verifiable consent under Section 9 of the India Digital Personal Data Protection (DPDP) Act, 2023 for Ledgerly to process this child&apos;s data strictly for non-commercial financial education and savings goals, with no behavioral profiling or targeted advertising.
                </span>
              </label>
              <p className="text-[10px] text-stone-500 ml-6">
                Your parent user ID, IP address, and timestamp will be cryptographically logged in the verifiable consents audit registry. You may revoke consent at any time.
              </p>
            </div>

            <button
              type="submit"
              disabled={addingChild || !parentConsent}
              className="py-2.5 px-4 bg-emerald-600 disabled:bg-stone-300 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{addingChild ? 'Creating...' : 'Grant Consent & Create Child Account'}</span>
            </button>
          </form>
        )}

        {/* Invite Member Form for Owner */}
        {showInvite && currentUser?.role === 'owner' && (
          <form onSubmit={handleInviteMember} className="p-5 rounded-2xl bg-purple-50/50 border border-purple-200 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-purple-900 uppercase tracking-wider">
                Invite New Family Member
              </h3>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-xs font-bold text-stone-400 hover:text-stone-700"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="parent2@family.internal"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Display Name (Optional)</label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Jordan"
                  className="w-full text-xs font-medium px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'parent' | 'child')}
                  className="w-full text-xs font-bold px-3 py-2 rounded-xl bg-white border border-stone-300 focus:outline-none focus:border-purple-600"
                >
                  <option value="parent">Parent Admin</option>
                  <option value="child">Child Safe</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={inviting}
              className="py-2.5 px-4 bg-purple-700 text-white font-bold rounded-xl text-xs hover:bg-purple-800 transition cursor-pointer"
            >
              {inviting ? 'Inviting...' : 'Send Family Invitation'}
            </button>
          </form>
        )}

        {/* Family Members Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-stone-500 font-bold uppercase text-[10px]">
                <th className="py-2.5 px-3">Member</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Status / DPDP Consent</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {familyMembers.map((m) => {
                const isCurrent = currentUser?.id === m.userId;
                const roleBadge =
                  m.role === 'owner'
                    ? 'bg-purple-100 text-purple-800 border-purple-200'
                    : m.role === 'parent'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : 'bg-amber-100 text-amber-800 border-amber-200';

                return (
                  <tr key={m.userId} className="hover:bg-stone-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center font-bold text-xs text-stone-700 shrink-0">
                          {m.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-[#23201C] flex items-center gap-1.5">
                            <span>{m.displayName}</span>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase text-stone-400 bg-stone-100 px-1.5 py-0.2 rounded-full">
                                You
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-stone-500">{m.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase border ${roleBadge}`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {m.role === 'child' ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <ShieldCheck className="w-3 h-3" />
                            <span>DPDP Consent Active (Sec 9)</span>
                          </span>
                          {m.age && <span className="text-[10px] text-stone-400">Age {m.age}</span>}
                        </div>
                      ) : (
                        <span className="text-[11px] text-stone-600 font-medium">Verified Guardian</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {m.role === 'child' ? (
                        <button
                          type="button"
                          onClick={() => handleRevokeConsent(m.userId, m.displayName)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                        >
                          Revoke Consent & Delete
                        </button>
                      ) : !isCurrent && currentUser?.role === 'owner' ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.userId, m.displayName)}
                          className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-stone-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Security Audit Log View (Owner only) */}
        {currentUser?.role === 'owner' && (
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-800">Family Security Audit Log</p>
                <p className="text-[11px] text-gray-500">
                  Inspect logins, role changes, and parental consent events recorded to the immutable audit ledger.
                </p>
              </div>
              <button
                type="button"
                onClick={handleViewAudit}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 transition"
              >
                {showAudit ? 'Hide Audit Log' : 'View Audit Log'}
              </button>
            </div>

            {showAudit && (
              <div className="mt-4 p-4 rounded-2xl bg-stone-900 text-stone-200 text-xs font-mono max-h-60 overflow-y-auto space-y-1.5">
                {loadingAudit ? (
                  <p className="text-stone-400">Loading audit records...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-stone-400">No security violations or audit events logged yet.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-start gap-2 border-b border-stone-800 pb-1">
                      <span className="text-purple-400">[{log.createdAt.slice(0, 19)}]</span>
                      <span className="text-amber-400 font-bold uppercase">{log.action}</span>
                      <span className="text-stone-400">target={log.target || 'none'}</span>
                      <span className="text-stone-500">ip={log.ip || 'internal'}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Danger Zone (Section 18.6) */}
      <div className="bg-white rounded-3xl border border-red-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-5 h-5" />
          <h2 className="text-base font-bold">Danger Zone</h2>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          Permanently delete all financial transactions, uploaded documents, categorization rules, tags, and gamification progress. Your original Google Drive files will remain completely untouched.
        </p>
        <button
          type="button"
          onClick={onOpenDataWipeModal}
          className="px-5 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition shadow"
        >
          Erase All Ledgerly Data
        </button>
      </div>
    </div>
  );
};
