import React, { useState } from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  WalletCards,
  Calculator,
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
  Database,
  Lock,
  LogOut,
  UserCheck,
  Users,
  ChevronDown,
  Shield,
} from 'lucide-react';
import { GameState, UserProfile } from '../types';
import { Penny } from './Penny';

export type TabKey =
  | 'dashboard'
  | 'planner'
  | 'calendar'
  | 'interest'
  | 'transactions'
  | 'recurring'
  | 'subscriptions'
  | 'budgets'
  | 'goals'
  | 'rewards'
  | 'kids'
  | 'documents'
  | 'rules'
  | 'database'
  | 'settings';

interface NavigationProps {
  currentTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  game: GameState;
  onOpenAddEntry: () => void;
  onOpenImport: () => void;
  onOpenDriveSync: () => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
  onOpenSwitchMember?: () => void;
}

const ALL_TABS: Array<{
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  allowedRoles: Array<'owner' | 'parent' | 'child'>;
}> = [
  { key: 'dashboard', label: 'Home', icon: LayoutDashboard, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'planner', label: 'Pocket Planner', icon: WalletCards, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'calendar', label: 'Spending Calendar', icon: CalendarDays, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'interest', label: 'Simple Interest', icon: Calculator, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'transactions', label: 'Transactions', icon: Receipt, allowedRoles: ['owner', 'parent'] },
  { key: 'kids', label: 'Learn & Ask Penny', icon: Sparkles, badge: 'AI', allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'goals', label: 'Goals', icon: Target, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'rewards', label: 'Rewards', icon: Award, allowedRoles: ['owner', 'parent', 'child'] },
  { key: 'recurring', label: 'Recurring', icon: RotateCw, allowedRoles: ['owner', 'parent'] },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard, allowedRoles: ['owner', 'parent'] },
  { key: 'budgets', label: 'Budgets', icon: PieChart, allowedRoles: ['owner', 'parent'] },
  { key: 'documents', label: 'Documents', icon: FolderLock, allowedRoles: ['owner', 'parent'] },
  { key: 'rules', label: 'Rules', icon: Sliders, allowedRoles: ['owner', 'parent'] },
  { key: 'database', label: 'Databases & D1', icon: Database, badge: 'D1', allowedRoles: ['owner'] },
  { key: 'settings', label: 'Settings', icon: Settings, allowedRoles: ['owner', 'parent'] },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  game,
  onOpenAddEntry,
  onOpenImport,
  onOpenDriveSync,
  currentUser,
  onLogout,
  onOpenSwitchMember,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userRole = (currentUser?.role || 'owner') as 'owner' | 'parent' | 'child';

  // Filter tabs according to server-enforced role permissions
  const tabs = ALL_TABS.filter((tab) => tab.allowedRoles.includes(userRole));

  const xpPercent =
    game.xpForNextLevel > 0
      ? Math.min(100, Math.round((game.xpIntoLevel / game.xpForNextLevel) * 100))
      : 0;

  const roleBadgeStyle =
    userRole === 'owner'
      ? 'bg-purple-100 text-purple-800 border-purple-200'
      : userRole === 'parent'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

  const roleLabel =
    userRole === 'owner' ? 'Family Owner' : userRole === 'parent' ? 'Parent' : 'Learner';

  return (
    <>
      {/* Desktop Left Sidebar (238px) */}
      <aside className="hidden lg:flex flex-col w-[238px] bg-[#FAF8F5] border-r-2 border-[#E7DECE] shrink-0 h-screen sticky top-0 z-30 select-none">
        {/* Brand header */}
        <div className="h-[76px] flex items-center px-6 gap-3 border-b-2 border-[#E7DECE] bg-white">
          <Penny mood="idle" size={40} showSpeech={false} enabled={game.profile?.showPenny} />
          <div>
            <h1 className="font-display text-2xl font-black tracking-tight text-[#7f27a8] leading-none flex items-center gap-1">
              NotePay <span className="text-xs text-[#f76400]">✨</span>
            </h1>
            <p className="text-[11px] font-bold text-[#8c8273] mt-1 font-body">Learn Money. Plan Smarter.</p>
          </div>
        </div>

        {/* Navigation Tabs List */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onSelectTab(tab.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#7f27a8] text-white shadow-[0_3px_0_0_#4c1d95] translate-y-[-1px]'
                    : 'text-[#4A4337] hover:bg-[#ffd400]/25 hover:text-amber-950'
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? 'text-[#ffd400]' : 'text-stone-400 group-hover:text-amber-600'
                  }`}
                />
                <span className="font-body truncate">{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                      isActive
                        ? 'bg-[#ffd400] text-amber-950'
                        : tab.key === 'database'
                        ? 'bg-purple-100 text-purple-800 border border-purple-200'
                        : 'bg-[#ffd400]/30 text-amber-900 border border-amber-300'
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

        {/* User Account / Role Widget at bottom of sidebar */}
        <div className="p-3 m-3 bg-white rounded-3xl border-2 border-[#E7DECE] shadow-xs space-y-2 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700 font-bold shrink-0">
                <UserCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-[#23201C] truncate font-display">
                  {currentUser?.name || 'Account'}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span
                    className={`text-[9px] font-black px-1.5 py-0.2 rounded-full uppercase border ${roleBadgeStyle}`}
                  >
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {onOpenSwitchMember && (
                <button
                  type="button"
                  onClick={onOpenSwitchMember}
                  title="Switch Family Member"
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
                >
                  <Users className="w-4 h-4" />
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign Out"
                  className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-400 hover:text-rose-600 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mascot Mini Widget at bottom of sidebar */}
        <div className="p-3 m-3 mt-0 bg-gradient-to-br from-[#ffd400]/20 via-[#e885cf]/20 to-[#53b0c9]/25 rounded-3xl border-2 border-[#E7DECE] shadow-xs">
          <div className="flex items-center gap-3">
            <Penny mood="happy" size={38} showSpeech={false} enabled={game.profile?.showPenny} />
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
            <span>{currentTab === 'database' ? 'Databases & D1' : currentTab}</span>
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

          {/* Quick Database Explorer Top-Bar button: Strictly Owner only */}
          {userRole === 'owner' && (
            <button
              type="button"
              onClick={() => onSelectTab('database')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs md:text-sm font-bold border-2 transition cursor-pointer ${
                currentTab === 'database'
                  ? 'bg-[#7f27a8] text-white border-[#7f27a8] shadow-xs'
                  : 'text-stone-700 bg-white hover:bg-stone-50 border-[#E7DECE]'
              }`}
              title="Cloudflare D1 Database Explorer"
            >
              <Database className="w-4 h-4 text-purple-600" />
              <span>Database</span>
            </button>
          )}

          {/* Drive sync button: Owner and Parent only */}
          {userRole !== 'child' && (
            <button
              type="button"
              onClick={onOpenDriveSync}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs md:text-sm font-bold text-stone-700 bg-white hover:bg-stone-50 border-2 border-[#E7DECE] shadow-2xs transition cursor-pointer"
              title="Google Drive Financial Inbox Sync"
            >
              <RefreshCw className="w-4 h-4 text-[#53b0c9]" />
              <span className="hidden md:inline">Drive</span>
            </button>
          )}

          {/* Import statement/documents button: Owner and Parent only */}
          {userRole !== 'child' && (
            <button
              type="button"
              onClick={onOpenImport}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs md:text-sm font-bold text-stone-700 bg-white hover:bg-stone-50 border-2 border-[#E7DECE] shadow-2xs transition cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#7f27a8]" />
              <span className="hidden md:inline">Import</span>
            </button>
          )}

          {/* Add entry primary button: Owner and Parent only */}
          {userRole !== 'child' && (
            <button
              type="button"
              onClick={onOpenAddEntry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl text-xs md:text-sm font-black bg-[#f76400] hover:bg-[#ea580c] text-white transition shadow-[0_3px_0_0_#9a3412] hover:translate-y-[-1px] active:translate-y-[2px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Entry</span>
            </button>
          )}

          {/* Profile & Role Badge Menu Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#FAF8F5] hover:bg-stone-100 border-2 border-[#E7DECE] transition cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                {(currentUser?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <span className="hidden sm:inline text-xs font-black text-[#23201C] truncate max-w-[100px]">
                {currentUser?.name || 'User'}
              </span>
              <span
                className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase border shrink-0 ${roleBadgeStyle}`}
              >
                {roleLabel}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
            </button>

            {isUserMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white border-2 border-[#E7DECE] rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] p-2 z-50 text-left select-none animate-in fade-in slide-in-from-top-2 duration-150"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3 py-2 border-b border-[#E7DECE] mb-1">
                  <p className="text-xs font-black text-[#23201C] truncate">{currentUser?.name}</p>
                  <p className="text-[10px] text-stone-500 truncate">{currentUser?.email}</p>
                  <span
                    className={`inline-block mt-1 text-[9px] font-black px-2 py-0.5 rounded-full uppercase border ${roleBadgeStyle}`}
                  >
                    Role: {roleLabel}
                  </span>
                </div>

                {onOpenSwitchMember && (
                  <button
                    type="button"
                    onClick={onOpenSwitchMember}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-purple-50 hover:text-purple-900 transition cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-purple-600" />
                    <span>Switch Family Member</span>
                  </button>
                )}

                {userRole !== 'child' && (
                  <button
                    type="button"
                    onClick={() => onSelectTab('settings')}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-stone-500" />
                    <span>Family & Settings</span>
                  </button>
                )}

                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer border-t border-[#E7DECE] mt-1 pt-2"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Horizontally Scrollable Bottom Navigation */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t-2 border-[#E7DECE] px-2 py-1.5 flex items-center overflow-x-auto no-scrollbar scroll-smooth gap-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelectTab(tab.key)}
              className={`shrink-0 flex flex-col items-center justify-center min-w-[64px] py-1 px-1.5 rounded-2xl text-[11px] font-bold transition cursor-pointer ${
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
