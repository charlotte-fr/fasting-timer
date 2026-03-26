import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Timer,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Menu,
  Bell,
  StopCircle,
  PlayCircle,
  Flag,
  Bolt,
  TrendingUp,
  TimerOff,
  Download,
  Trash2,
  Smartphone,
  ChevronRight,
} from 'lucide-react';
import {
  Screen,
  FastingSession,
  ActiveFast,
  AppSettings,
  STORAGE_KEYS,
  DEFAULT_SETTINGS,
} from './types';

// --- localStorage helpers ---

function loadActiveFast(): ActiveFast | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.ACTIVE_FAST);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveActiveFast(fast: ActiveFast | null) {
  if (fast) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_FAST, JSON.stringify(fast));
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_FAST);
  }
}

function loadSessions(): FastingSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveSessions(sessions: FastingSession[]) {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
}

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
}

// --- Formatting helpers ---

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, '0')}m`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function formatDateLabel(ts: number): string {
  const d = new Date(ts);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  if (d.toDateString() === today.toDateString()) return `Today, ${dateStr}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${dateStr}`;
  return dateStr;
}

// --- Analytics helpers ---

function getWeeklyData(sessions: FastingSession[]): { day: string; hours: number }[] {
  const result = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const dayEnd = dayStart + 86400000;
    const hours = sessions
      .filter((s) => s.startTimestamp >= dayStart && s.startTimestamp < dayEnd)
      .reduce((sum, s) => sum + (s.endTimestamp - s.startTimestamp) / 3600000, 0);
    result.push({
      day: date.toLocaleDateString([], { weekday: 'short' }).charAt(0),
      hours: Math.round(hours * 10) / 10,
    });
  }
  return result;
}

function computeStreak(sessions: FastingSession[]): number {
  const completedDays = new Set(
    sessions.filter((s) => s.completed).map((s) => new Date(s.startTimestamp).toDateString())
  );
  let streak = 0;
  const d = new Date();
  while (completedDays.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function computeTotalHours(sessions: FastingSession[]): number {
  return Math.round(
    sessions.reduce((sum, s) => sum + (s.endTimestamp - s.startTimestamp) / 3600000, 0)
  );
}

function computeWeekTrend(sessions: FastingSession[]): number | null {
  const now = new Date();
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 6);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  const lastWeekEnd = new Date(thisWeekStart);

  const thisWeekHours = sessions
    .filter((s) => s.startTimestamp >= thisWeekStart.getTime())
    .reduce((sum, s) => sum + (s.endTimestamp - s.startTimestamp) / 3600000, 0);

  const lastWeekHours = sessions
    .filter(
      (s) => s.startTimestamp >= lastWeekStart.getTime() && s.startTimestamp < lastWeekEnd.getTime()
    )
    .reduce((sum, s) => sum + (s.endTimestamp - s.startTimestamp) / 3600000, 0);

  if (lastWeekHours === 0) return null;
  return Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100);
}

// --- Components ---

const TopNav = () => (
  <nav className="fixed top-0 w-full z-50 bg-surface-container/80 backdrop-blur-xl flex items-center justify-between px-6 h-16 shadow-[0_20px_40px_rgba(6,14,32,0.4)]">
    <div className="flex items-center gap-4">
      <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-colors active:scale-95 duration-200">
        <Menu className="text-primary w-6 h-6" />
      </button>
      <h1 className="text-xl font-bold text-primary tracking-tight">Fasting Timer</h1>
    </div>
    <div className="flex items-center gap-3">
      <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-bright transition-colors">
        <Bell className="text-primary w-6 h-6" />
      </button>
      <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10 bg-primary-container flex items-center justify-center">
        <span className="text-xs font-bold text-surface">FT</span>
      </div>
    </div>
  </nav>
);

const BottomNav = ({
  activeScreen,
  setScreen,
}: {
  activeScreen: Screen;
  setScreen: (s: Screen) => void;
}) => {
  const navItems = [
    { id: 'home', label: 'Home', icon: Timer },
    { id: 'history', label: 'History', icon: HistoryIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ] as const;

  return (
    <nav className="fixed bottom-6 left-0 right-0 z-50 flex justify-around items-center h-16 px-2 bg-surface-container/80 backdrop-blur-2xl mx-auto w-[90%] max-w-md rounded-full shadow-[0_32px_64px_rgba(6,14,32,0.6)]">
      {navItems.map((item) => {
        const isActive = activeScreen === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setScreen(item.id)}
            className={`flex flex-col items-center justify-center transition-all duration-300 px-6 py-2 rounded-full ${
              isActive
                ? 'bg-gradient-to-br from-primary-container to-primary text-surface scale-110'
                : 'text-on-surface-variant hover:text-secondary'
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-medium tracking-wide uppercase mt-0.5">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

// --- Screens ---

interface HomeScreenProps {
  activeFast: ActiveFast | null;
  setActiveFast: (fast: ActiveFast | null) => void;
  sessions: FastingSession[];
  setSessions: React.Dispatch<React.SetStateAction<FastingSession[]>>;
  goalHours: number;
}

const HomeScreen = ({ activeFast, setActiveFast, sessions, setSessions, goalHours }: HomeScreenProps) => {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeFast) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeFast]);

  const elapsedMs = activeFast ? now - activeFast.startTimestamp : 0;
  const goalMs = (activeFast?.goalHours ?? goalHours) * 60 * 60 * 1000;
  const progress = activeFast ? Math.min((elapsedMs / goalMs) * 100, 100) : 0;

  function handleStartFast() {
    setActiveFast({ startTimestamp: Date.now(), goalHours });
    setNow(Date.now());
  }

  function handleStopFast() {
    if (!activeFast) return;
    const endTimestamp = Date.now();
    const elapsedHours = (endTimestamp - activeFast.startTimestamp) / 3600000;
    const newSession: FastingSession = {
      id: crypto.randomUUID(),
      startTimestamp: activeFast.startTimestamp,
      endTimestamp,
      goalHours: activeFast.goalHours,
      completed: elapsedHours >= activeFast.goalHours,
    };
    setSessions((prev) => [newSession, ...prev]);
    setActiveFast(null);
  }

  const projectedEnd = activeFast ? activeFast.startTimestamp + goalMs : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-12"
    >
      <section className="flex flex-col items-center">
        <div className="relative w-72 h-72 md:w-80 md:h-80 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/5 blur-3xl"></div>
          <svg className="w-full h-full -rotate-90">
            <circle
              className="text-surface-container-highest stroke-current"
              cx="50%"
              cy="50%"
              r="45%"
              fill="transparent"
              strokeWidth="8"
            />
            <motion.circle
              className="text-primary stroke-current"
              cx="50%"
              cy="50%"
              r="45%"
              fill="transparent"
              strokeWidth="12"
              strokeLinecap="round"
              initial={{ strokeDasharray: '283 283', strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 283 - (283 * progress) / 100 }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{ strokeDasharray: '283' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] text-secondary uppercase tracking-[0.2em] font-semibold mb-2">
              {activeFast ? 'Current Fast' : 'Ready to Fast'}
            </span>
            <h2 className="text-5xl font-extrabold text-on-surface tracking-tighter mb-1">
              {activeFast ? formatDuration(elapsedMs) : '0h 00m'}
            </h2>
            <p className="text-on-surface-variant font-medium">
              Goal: {(activeFast?.goalHours ?? goalHours)}h 00m
            </p>
          </div>
        </div>

        <div className="mt-10 w-full flex justify-center">
          {activeFast ? (
            <button
              onClick={handleStopFast}
              className="bg-gradient-to-br from-primary-container to-primary text-surface px-12 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3"
            >
              <StopCircle className="w-6 h-6" />
              Stop Fast
            </button>
          ) : (
            <button
              onClick={handleStartFast}
              className="bg-gradient-to-br from-primary-container to-primary text-surface px-12 py-4 rounded-full font-bold text-lg shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3"
            >
              <PlayCircle className="w-6 h-6" />
              Start Fast
            </button>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container p-6 rounded-xl flex flex-col gap-2 group hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-2 text-primary">
            <PlayCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">Fast Started</span>
          </div>
          <span className="text-2xl font-bold text-on-surface mt-1">
            {activeFast ? formatTime(activeFast.startTimestamp) : '--'}
          </span>
          <span className="text-xs text-on-surface-variant">
            {activeFast ? formatDateLabel(activeFast.startTimestamp) : 'No active fast'}
          </span>
        </div>
        <div className="bg-surface-container p-6 rounded-xl flex flex-col gap-2 group hover:bg-surface-container-high transition-colors">
          <div className="flex items-center gap-2 text-tertiary">
            <Flag className="w-5 h-5" />
            <span className="text-sm font-semibold">Projected End</span>
          </div>
          <span className="text-2xl font-bold text-on-surface mt-1">
            {activeFast ? formatTime(projectedEnd) : '--'}
          </span>
          <span className="text-xs text-on-surface-variant">
            {activeFast ? formatDateLabel(projectedEnd) : 'No active fast'}
          </span>
        </div>
      </section>
    </motion.div>
  );
};

interface HistoryScreenProps {
  sessions: FastingSession[];
}

const HistoryScreen = ({ sessions }: HistoryScreenProps) => {
  const weeklyData = getWeeklyData(sessions);
  const maxHours = Math.max(...weeklyData.map((d) => d.hours), 1);
  const streak = computeStreak(sessions);
  const totalHours = computeTotalHours(sessions);
  const trend = computeWeekTrend(sessions);

  const thisWeekAvg =
    weeklyData.reduce((sum, d) => sum + d.hours, 0) /
    Math.max(weeklyData.filter((d) => d.hours > 0).length, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <section className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <span className="text-secondary text-xs tracking-widest uppercase">Analytics</span>
            <h2 className="text-primary text-2xl font-bold tracking-tight">Weekly Rhythm</h2>
          </div>
          <div className="text-on-surface-variant text-sm font-medium">Last 7 Days</div>
        </div>

        <div className="bg-surface-container rounded-xl p-6 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-all duration-700"></div>
          <div className="flex items-end justify-between h-40 gap-2 mb-4">
            {weeklyData.map((d, i) => {
              const heightPct = maxHours > 0 ? (d.hours / maxHours) * 100 : 0;
              const isToday = i === 6;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-surface-container-highest rounded-full h-full relative overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${Math.max(heightPct, d.hours > 0 ? 5 : 0)}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                      className="absolute bottom-0 w-full bg-gradient-to-t from-primary-container to-primary rounded-full"
                    />
                  </div>
                  <span
                    className={`text-[10px] font-medium ${isToday ? 'text-primary font-bold' : 'text-on-surface-variant'}`}
                  >
                    {d.day}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              {trend !== null ? (
                <>
                  <TrendingUp className="text-tertiary w-4 h-4" />
                  <span className="text-xs text-on-surface-variant">
                    {trend >= 0 ? `${trend}% more` : `${Math.abs(trend)}% less`} than last week
                  </span>
                </>
              ) : (
                <span className="text-xs text-on-surface-variant">Start fasting to see trends</span>
              )}
            </div>
            <span className="text-xs font-bold text-on-surface">
              Avg: {thisWeekAvg.toFixed(1)}h
            </span>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4">
        <div className="bg-surface-container-low rounded-xl p-5 flex flex-col justify-between group hover:bg-surface-container transition-all duration-300">
          <Bolt className="text-secondary w-6 h-6 mb-4" />
          <div>
            <h3 className="text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
              Longest Streak
            </h3>
            <div className="text-2xl font-bold text-on-surface">
              {streak} <span className="text-sm font-normal text-on-surface-variant">days</span>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-low rounded-xl p-5 flex flex-col justify-between group hover:bg-surface-container transition-all duration-300">
          <Timer className="text-tertiary w-6 h-6 mb-4" />
          <div>
            <h3 className="text-on-surface-variant text-[10px] uppercase tracking-wider mb-1">
              Total Hours
            </h3>
            <div className="text-2xl font-bold text-on-surface">
              {totalHours} <span className="text-sm font-normal text-on-surface-variant">hrs</span>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-primary text-xl font-bold tracking-tight">Past Sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="bg-surface-container rounded-xl p-8 text-center">
            <TimerOff className="w-10 h-10 text-on-surface-variant mx-auto mb-3" />
            <p className="text-on-surface-variant text-sm">
              No sessions yet. Start your first fast!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const duration = session.endTimestamp - session.startTimestamp;
              return (
                <div
                  key={session.id}
                  className="bg-surface-container rounded-xl p-4 flex items-center justify-between group hover:translate-x-1 transition-transform cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-surface-bright flex items-center justify-center">
                      {session.completed ? (
                        <Timer className="text-primary w-6 h-6" />
                      ) : (
                        <TimerOff className="text-on-surface-variant w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <p className="text-on-surface font-bold">{formatDuration(duration)}</p>
                      <p className="text-on-surface-variant text-xs">
                        {formatDateLabel(session.startTimestamp)}, {formatTime(session.startTimestamp)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              );
            })}
          </div>
        )}
      </section>
    </motion.div>
  );
};

interface SettingsScreenProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  sessions: FastingSession[];
  setSessions: React.Dispatch<React.SetStateAction<FastingSession[]>>;
  setActiveFast: (fast: ActiveFast | null) => void;
}

const SettingsScreen = ({
  settings,
  setSettings,
  sessions,
  setSessions,
  setActiveFast,
}: SettingsScreenProps) => {
  function handleExport() {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fasting-timer-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClearData() {
    if (!window.confirm('Are you sure? This will permanently delete all your fasting data.'))
      return;
    setSessions([]);
    setActiveFast(null);
    setSettings(DEFAULT_SETTINGS);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <section className="mb-10">
        <span className="text-secondary text-sm tracking-[0.2em] uppercase mb-2 block">
          Account Preferences
        </span>
        <h2 className="text-4xl font-bold text-on-surface tracking-tight">Settings</h2>
      </section>

      <div className="bg-surface-container rounded-xl p-8 shadow-[0_32px_64px_rgba(6,14,32,0.6)]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-primary text-lg font-semibold">Daily Fasting Goal</h3>
            <p className="text-on-surface-variant text-sm mt-1">Adjust your target duration</p>
          </div>
          <div className="bg-primary-container/30 px-4 py-2 rounded-full border border-primary/10">
            <span className="text-primary font-bold text-xl">{settings.goalHours}h</span>
          </div>
        </div>
        <div className="relative pt-2">
          <input
            type="range"
            min="8"
            max="24"
            value={settings.goalHours}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, goalHours: parseInt(e.target.value) }))
            }
            className="w-full h-2 bg-surface-variant rounded-full appearance-none cursor-pointer accent-primary"
          />
          <div className="flex justify-between mt-4 text-[10px] font-medium text-on-surface-variant/60 tracking-widest uppercase">
            <span>8 Hours</span>
            <span>16 Hours</span>
            <span>24 Hours</span>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2 px-2">
          <Bolt className="text-secondary w-5 h-5" />
          <span className="text-on-surface-variant font-medium text-sm">System & Feedback</span>
        </div>
        <div className="bg-surface-container-low rounded-xl overflow-hidden">
          <div
            className="flex items-center justify-between p-5 hover:bg-surface-bright transition-colors cursor-pointer group"
            onClick={() =>
              setSettings((prev) => ({ ...prev, notifications: !prev.notifications }))
            }
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <p className="text-on-surface font-medium">Push Notifications</p>
                <p className="text-on-surface-variant text-xs">Stay on track with reminders</p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full relative p-1 flex items-center transition-colors ${settings.notifications ? 'bg-primary-container' : 'bg-surface-container-highest'}`}
            >
              <motion.div
                animate={{ x: settings.notifications ? 24 : 0 }}
                className="w-4 h-4 bg-primary rounded-full shadow-lg"
              />
            </div>
          </div>
          <div
            className="flex items-center justify-between p-5 hover:bg-surface-bright transition-colors cursor-pointer group"
            onClick={() => setSettings((prev) => ({ ...prev, haptic: !prev.haptic }))}
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <p className="text-on-surface font-medium">Haptic Feedback</p>
                <p className="text-on-surface-variant text-xs">Tactile sensations for actions</p>
              </div>
            </div>
            <div
              className={`w-12 h-6 rounded-full relative p-1 flex items-center transition-colors ${settings.haptic ? 'bg-primary-container' : 'bg-surface-container-highest'}`}
            >
              <motion.div
                animate={{ x: settings.haptic ? 24 : 0 }}
                className="w-4 h-4 bg-primary rounded-full shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-3 mb-2 px-2">
          <SettingsIcon className="text-secondary w-5 h-5" />
          <span className="text-on-surface-variant font-medium text-sm">Data & Privacy</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleExport}
            className="flex items-center justify-between p-6 bg-surface-container rounded-xl hover:bg-surface-bright transition-all active:scale-95 text-left border border-white/5"
          >
            <div className="space-y-1">
              <p className="text-on-surface font-semibold">Export Data</p>
              <p className="text-on-surface-variant text-xs">Download your history (JSON)</p>
            </div>
            <Download className="text-primary w-6 h-6" />
          </button>
          <button
            onClick={handleClearData}
            className="flex items-center justify-between p-6 bg-surface-container rounded-xl hover:bg-red-900/20 transition-all active:scale-95 text-left border border-red-500/10"
          >
            <div className="space-y-1">
              <p className="text-red-400 font-semibold">Clear All Data</p>
              <p className="text-on-surface-variant text-xs">Permanently delete your profile</p>
            </div>
            <Trash2 className="text-red-400 w-6 h-6" />
          </button>
        </div>
      </section>
    </motion.div>
  );
};

// --- Main App ---

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('home');
  const [activeFast, setActiveFast] = useState<ActiveFast | null>(() => loadActiveFast());
  const [sessions, setSessions] = useState<FastingSession[]>(() => loadSessions());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  useEffect(() => saveActiveFast(activeFast), [activeFast]);
  useEffect(() => saveSessions(sessions), [sessions]);
  useEffect(() => saveSettings(settings), [settings]);

  return (
    <div className="min-h-screen pb-32">
      <TopNav />

      <main className="pt-24 px-6 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {activeScreen === 'home' && (
            <HomeScreen
              key="home"
              activeFast={activeFast}
              setActiveFast={setActiveFast}
              sessions={sessions}
              setSessions={setSessions}
              goalHours={settings.goalHours}
            />
          )}
          {activeScreen === 'history' && (
            <HistoryScreen key="history" sessions={sessions} />
          )}
          {activeScreen === 'settings' && (
            <SettingsScreen
              key="settings"
              settings={settings}
              setSettings={setSettings}
              sessions={sessions}
              setSessions={setSessions}
              setActiveFast={setActiveFast}
            />
          )}
        </AnimatePresence>
      </main>

      <BottomNav activeScreen={activeScreen} setScreen={setActiveScreen} />
    </div>
  );
}
