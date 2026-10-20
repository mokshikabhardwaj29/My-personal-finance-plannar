import React from 'react';
import { Flame, Snowflake, CheckCircle2, ShieldCheck, Sparkles } from 'lucide-react';

export interface StreakCalendarProps {
  recentActiveDates: string[];
  gameFreezeDates?: string[];
  currentStreak?: number;
  longestStreak?: number;
  freezesHeld?: number;
  userTimezone?: string;
  className?: string;
}

interface CalendarDay {
  dateStr: string; // YYYY-MM-DD
  dayOfWeek: string; // e.g. "Mon"
  dayNumber: number; // e.g. 19
  isActive: boolean;
  isFrozen: boolean;
  isToday: boolean;
  isFuture: boolean;
}

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  recentActiveDates = [],
  gameFreezeDates = [],
  currentStreak = 0,
  longestStreak = 0,
  freezesHeld = 0,
  userTimezone = 'UTC',
  className = '',
}) => {
  const activeSet = new Set(recentActiveDates);
  const freezeSet = new Set(gameFreezeDates);

  // Compute local date for today
  let todayStr = new Date().toISOString().slice(0, 10);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: userTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    todayStr = formatter.format(new Date());
  } catch {
    todayStr = new Date().toISOString().slice(0, 10);
  }

  // Generate 7-day range ending on today
  const days: CalendarDay[] = [];
  const todayDateObj = new Date(todayStr + 'T12:00:00Z');

  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayDateObj);
    d.setUTCDate(d.getUTCDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const dayNumber = d.getUTCDate();
    const dayOfWeek = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

    const isToday = dateStr === todayStr;
    const isFrozen = freezeSet.has(dateStr);
    const isActive = activeSet.has(dateStr);

    days.push({
      dateStr,
      dayOfWeek,
      dayNumber,
      isActive,
      isFrozen,
      isToday,
      isFuture: false,
    });
  }

  const activeDaysInWeek = days.filter((d) => d.isActive).length;
  const frozenDaysInWeek = days.filter((d) => d.isFrozen).length;

  return (
    <div
      className={`bg-white rounded-3xl p-6 md:p-8 border border-gray-200 shadow-sm space-y-6 select-none ${className}`}
    >
      {/* Calendar Header with Streak Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <Flame className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">7-Day Streak Calendar</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Visual record of your daily habit consistency and streak freezes.
          </p>
        </div>

        {/* Streak Stats Chips */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
            <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
            <span>Current: {currentStreak} day{currentStreak === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 text-gray-700 border border-gray-200">
            <Sparkles className="w-4 h-4 text-violet-500" />
            <span>Longest: {longestStreak} day{longestStreak === 1 ? '' : 's'}</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-800 border border-blue-200">
            <Snowflake className="w-4 h-4 text-blue-500" />
            <span>Freezes: {freezesHeld}/2</span>
          </div>
        </div>
      </div>

      {/* 7-Day Visual Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 md:gap-3">
        {days.map((day) => {
          return (
            <div
              key={day.dateStr}
              title={`${day.dateStr}: ${
                day.isActive
                  ? 'Active day (XP earned)'
                  : day.isFrozen
                  ? 'Streak Freeze used (streak saved)'
                  : 'No activity'
              }${day.isToday ? ' - Today' : ''}`}
              className={`relative flex flex-col items-center justify-between p-3 md:p-4 rounded-2xl border transition-all text-center ${
                day.isActive
                  ? 'bg-gradient-to-b from-amber-50 to-orange-50/50 border-amber-300 ring-1 ring-amber-200 text-amber-950 shadow-xs'
                  : day.isFrozen
                  ? 'bg-gradient-to-b from-blue-50 to-sky-50/50 border-blue-300 ring-1 ring-blue-200 text-blue-950 shadow-xs'
                  : day.isToday
                  ? 'bg-gray-50/80 border-gray-300 ring-2 ring-violet-200 text-gray-700'
                  : 'bg-gray-50/40 border-gray-200 text-gray-400'
              }`}
            >
              {/* Day Label (e.g. Mon, Tue) */}
              <span
                className={`text-[11px] font-bold uppercase tracking-wider ${
                  day.isActive
                    ? 'text-amber-800'
                    : day.isFrozen
                    ? 'text-blue-800'
                    : 'text-gray-400'
                }`}
              >
                {day.dayOfWeek}
              </span>

              {/* Status Icon */}
              <div className="my-2.5 flex items-center justify-center">
                {day.isActive ? (
                  <div className="w-9 h-9 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-sm transform hover:scale-110 transition">
                    <Flame className="w-5 h-5 fill-white text-white" />
                  </div>
                ) : day.isFrozen ? (
                  <div className="w-9 h-9 rounded-full bg-blue-500 text-white flex items-center justify-center shadow-sm transform hover:scale-110 transition">
                    <Snowflake className="w-5 h-5 text-white animate-spin-slow" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                    <div className="w-2.5 h-2.5 rounded-full bg-gray-300" />
                  </div>
                )}
              </div>

              {/* Date Number */}
              <span
                className={`text-xs font-black ${
                  day.isActive
                    ? 'text-amber-900'
                    : day.isFrozen
                    ? 'text-blue-900'
                    : 'text-gray-500'
                }`}
              >
                {day.dayNumber}
              </span>

              {/* Today indicator pill */}
              {day.isToday && (
                <span className="mt-1 px-1.5 py-0.5 rounded-full bg-violet-600 text-white text-[9px] font-black uppercase tracking-tight">
                  Today
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend & Explanatory Footer */}
      <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5 font-medium text-amber-700">
            <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
            <span>Active Day ({activeDaysInWeek}/7)</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium text-blue-700">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
            <span>Streak Freeze ({frozenDaysInWeek} used)</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="w-3 h-3 rounded-full bg-gray-200 inline-block" />
            <span>Inactive</span>
          </div>
        </div>

        <p className="text-[11px] text-gray-400">
          Earn 1 freeze for every 7 active days (max 2 held).
        </p>
      </div>
    </div>
  );
};
