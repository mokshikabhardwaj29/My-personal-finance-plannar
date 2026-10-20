import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  RotateCw,
  CreditCard,
  PieChart,
  Target,
  Award,
  FolderLock,
  Sliders,
  Settings,
  Flame,
  Star,
  Plus,
  Upload,
  RefreshCw,
  Snowflake,
  Sparkles,
} from 'lucide-react';
import { GameState } from '../types';
import { Penny } from './Penny';

export type TabKey =
  | 'dashboard'
  | 'transactions'
  | 'recurring'
  | 'subscriptions'
  | 'budgets'
  | 'goals'
  | 'rewards'
  | 'kids'
  | 'documents'
  | 'rules'
  | 'settings';

interface NavigationProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  game: GameState;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
  onOpenDriveSync: () => void;
}

const TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}> = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'transactions', label: 'Transactions', icon: Receipt },
  { key: 'kids', label: 'Kids Academy', icon: Sparkles, badge: 'AI' },
  { key: 'recurring', label: 'Recurring', icon: RotateCw },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'budgets', label: 'Budgets', icon: PieChart },
  { key: 'goals', label: 'Goals', icon: Target },
  { key: 'rewards', label: 'Rewards', icon: Award },
  { key: 'documents', label: 'Documents', icon: FolderLock },
  { key: 'rules', label: 'Rules', icon: Sliders },
  { key: 'settings', label: 'Settings', icon: Settings },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  game,
  onOpenAddEntry,
  onOpenImport,
  onOpenDriveSync,
}) => {
  const xpPercent = game.xpForNextLevel > 0 ? Math.min(100, Math.round((game.xpIntoLevel / game.xpForNextLevel) * 100)) : 0;

  return (
    <>
      {/* Desktop Left Sidebar (238px) */}
      <aside className="hidden lg:flex flex-col w-[238px] bg-[#FAF8F5] border-r-2 border-[#E7DECE] shrink-0 h-screen sticky top-0 z-30 select-none">
        {/* Brand header */}
        <div className="h-[76px] flex items-center px-6 gap-3 border-b-2 border-[#E7DECE] bg-white">
          <Penny mood="idle" size={40} showSpeech={false} enabled={game.profile?.showPenny} />
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-[#7f27a8] leading-none flex items-center gap-1">
              Ledgerly <span className="text-xs text-[#f76400]">✨</span>
            </h1>
            <p className="text-[11px] font-bold text-[#8c8273] mt-1 font-body">Kid & Family Finance</p>
          </div>
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95] translate-y-[-1px]'
                    : 'text-[#4A4337] hover:bg-[#ffd400]/25 hover:text-amber-950'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#ffd400]' : 'text-stone-400 group-hover:text-amber-600'}`} />
                <span className="font-body">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isActive ? 'bg-[#ffd400] text-amber-950' : 'bg-[#ffd400]/30 text-amber-900 border border-amber-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
                {tab.key === 'rewards' && game.unseenEventCount > 0 && !tab.badge && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#f76400] ring-2 ring-white animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Mascot Mini Widget at bottom of sidebar */}
        <div className="p-3.5 m-3 bg-gradient-to-br from-[#ffd400]/20 via-[#e885cf]/20 to-[#53b0c9]/25 rounded-3xl border-2 border-[#E7DECE] shadow-xs">
          <div className="flex items-center gap-3">
            <Penny mood="happy" size={42} showSpeech={false} enabled={game.profile?.showPenny} />
            <div className="min-w-0">
              <p className="text-xs font-black text-[#23201C] truncate font-display">Penny Buddy</p>
              <p className="text-[11px] font-bold text-[#7f27a8] truncate">{game.levelTitle}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Global Top Bar (76px high) */}
      <header className="sticky top-0 z-20 h-[76px] bg-white/95 backdrop-blur-md border-b-2 border-[#E7DECE] px-4 md:px-8 flex items-center justify-between gap-4 select-none">
        {/* Mobile brand & icon */}
        <div className="flex items-center gap-2 lg:hidden">
          <Penny mood="happy" size={34} showSpeech={false} enabled={game.profile?.showPenny} />
          <span className="font-display text-xl font-black tracking-tight text-[#7f27a8]">Ledgerly</span>
        </div>

        {/* Left Desktop breadcrumb or title */}
        <div className="hidden lg:block">
          <h2 className="font-display text-xl font-black text-[#23201C] capitalize flex items-center gap-2">
            <span>{currentTab}</span>
            <span className="w-2 h-2 rounded-full bg-[#53b0c9]" />
          </h2>
        </div>

        {/* Right Action buttons and Progress Chip */}
        <div className="flex items-center gap-2 md:gap-3 ml-auto">
          {/* Top Bar Progress Chip */}
          <button
            type="button"
            onClick={() => onSelectTab('rewards')}
            title="Open Rewards and Habit Progress"
            className="group flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#FAF7F2] border-2 border-[#E7DECE] hover:border-amber-400 hover:bg-amber-50/70 transition cursor-pointer shadow-xs"
          >
            {/* Streak indicator */}
            <div className="flex items-center gap-1 text-xs font-black text-amber-700">
              <Flame className="w-4 h-4 fill-[#f76400] text-[#f76400]" />
              <span>{game.currentStreak}</span>
              {game.freezes > 0 && (
                <span title={`${game.freezes} streak freeze held`} className="text-[#53b0c9]">
                  <Snowflake className="w-3.5 h-3.5" />
                </span>
              )}
            </div>

            <div className="w-[1.5px] h-4 bg-stone-300" />

            {/* Level & XP Mini Ring / Bar */}
            <div className="flex items-center gap-1.5">
              <Star className="w-4 h-4 text-[#ffd400] fill-[#ffd400]" />
              <span className="text-xs font-black text-stone-700">Lvl {game.level}</span>

              {/* Progress bar */}
              <div className="hidden sm:block w-14 h-2.5 rounded-full bg-stone-200 overflow-hidden ml-1 border border-stone-300">
                <div
                  className="h-full bg-gradient-to-r from-[#ffd400] to-[#f76400] transition-all duration-500 rounded-full"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </button>

          {/* Drive sync button */}
          <button
            type="button"
            onClick={onOpenDriveSync}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs md:text-sm font-bold text-stone-700 bg-white hover:bg-stone-50 border-2 border-[#E7DECE] shadow-2xs transition"
            title="Google Drive Financial Inbox Sync"
          >
            <RefreshCw className="w-4 h-4 text-[#53b0c9]" />
            <span className="hidden md:inline">Drive</span>
          </button>

          {/* Import statement/documents button */}
          <button
            type="button"
            onClick={onOpenImport}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs md:text-sm font-bold text-stone-700 bg-white hover:bg-stone-50 border-2 border-[#E7DECE] shadow-2xs transition"
          >
            <Upload className="w-4 h-4 text-[#7f27a8]" />
            <span className="hidden md:inline">Import</span>
          </button>

          {/* Add entry primary button */}
          <button
            type="button"
            onClick={onOpenAddEntry}
            className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs md:text-sm font-black bg-[#f76400] hover:bg-[#ea580c] text-white transition shadow-[0_3px_0_0_#9a3412] hover:translate-y-[-1px] active:translate-y-[2px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Entry</span>
          </button>
        </div>
      </header>

      {/* Mobile Horizontally Scrollable Bottom Navigation reaching all 10 tabs */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-[#E7DECE] px-2 py-1.5 flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[64px] py-1 px-1.5 rounded-2xl text-[11px] font-bold transition ${
                isActive ? 'text-[#7f27a8] bg-[#ffd400]/30 shadow-xs' : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'text-[#7f27a8]' : 'text-stone-400'}`} />
              <span className="truncate max-w-[62px]">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
};
