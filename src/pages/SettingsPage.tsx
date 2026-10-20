import React, { useState } from 'react';
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
} from 'lucide-react';
import { AppSettings, GameState, GameProfile } from '../types';
import { Penny } from '../components/Penny';
import { formatRupee } from '../utils/format';

interface SettingsPageProps {
  settings: AppSettings;
  game: GameState;
  onSavePreferences: (prefs: Partial<AppSettings> & Record<string, unknown>) => Promise<void>;
  onOpenResetProgressModal: () => void;
  onOpenDataWipeModal: () => void;
  onRestoreIgnoredSuggestions: () => Promise<void>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  settings,
  game,
  onSavePreferences,
  onOpenResetProgressModal,
  onOpenDataWipeModal,
  onRestoreIgnoredSuggestions,
}) => {
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
