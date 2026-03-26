export type Screen = 'home' | 'history' | 'settings';

export interface FastingSession {
  id: string;
  startTimestamp: number;
  endTimestamp: number;
  goalHours: number;
  completed: boolean;
}

export interface ActiveFast {
  startTimestamp: number;
  goalHours: number;
}

export interface AppSettings {
  goalHours: number;
  notifications: boolean;
  haptic: boolean;
}

export const STORAGE_KEYS = {
  ACTIVE_FAST: 'fasting-timer:active-fast',
  SESSIONS: 'fasting-timer:sessions',
  SETTINGS: 'fasting-timer:settings',
} as const;

export const DEFAULT_SETTINGS: AppSettings = {
  goalHours: 16,
  notifications: true,
  haptic: true,
};
