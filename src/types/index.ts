export interface Goal {
  id: string;
  name: string;
  createdAt: number;
}

export interface Note {
  id: string;
  content: string;
  createdAt: number;
}

export type Priority = 'p0' | 'p1' | 'p2' | 'p3' | 'none';

export interface Task {
  id: string;
  goalId?: string;
  name: string;
  notes: Note[];
  priority?: Priority;
  completedAt?: number;
  dueDate?: number;
}

export interface Session {
  id: string;
  taskId?: string;
  goalId?: string;
  taskName?: string;
  startTime: number;
  endTime: number;
  duration: number;
  type: 'focus' | 'break';
  completed?: boolean; // true = ran to completion, false = stopped early; undefined = legacy (treat as completed)
  mood?: 'great' | 'okay' | 'rough';
  reflection?: string;
}

export interface AppUsageEntry {
  id: string;
  appName: string;
  startTime: number;
  endTime: number;
  duration: number; // seconds
  sessionId?: string; // links to focus session
}

export interface UserPrefs {
  focusDuration: number;
  breakDuration: number;
  soundOnComplete: boolean;
  notifyOnComplete: boolean;
  autoLaunch: boolean;
  globalShortcutsEnabled: boolean;
  showTrayTimer: boolean;
  dailyFocusGoalMinutes: number; // daily target in minutes (0 = disabled)
  trackAppUsage: boolean; // track which apps are used during focus
}

export const DEFAULT_USER_PREFS: UserPrefs = {
  focusDuration: 25 * 60,
  breakDuration: 5 * 60,
  soundOnComplete: false,
  notifyOnComplete: true,
  autoLaunch: false,
  globalShortcutsEnabled: true,
  showTrayTimer: true,
  dailyFocusGoalMinutes: 120,
  trackAppUsage: true,
};

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerStateUpdate {
  status: TimerStatus;
  remaining: number;
  mode: 'focus' | 'break';
  taskName: string;
}

export interface LiveTimerState {
  isActive: boolean;
  status: 'idle' | 'running' | 'paused' | 'break';
  taskName: string;
  goalId?: string;
  goalName?: string;
  elapsed: number;
  breakElapsed: number;
  startedAt?: number;
  breaks: number;
  mode: 'focus' | 'break';
}

export const DEFAULT_LIVE_TIMER: LiveTimerState = {
  isActive: false,
  status: 'idle',
  taskName: '',
  elapsed: 0,
  breakElapsed: 0,
  breaks: 0,
  mode: 'focus',
};

export type WindowState = 'collapsed' | 'options';

export interface AppState {
  goals: Goal[];
  tasks: Task[];
  sessions: Session[];
  appUsage: AppUsageEntry[];
  currentTaskName: string;
  currentFocusGoalId: string;
  theme: 'dark' | 'light';
  windowState: WindowState;
  userPrefs: UserPrefs;
  liveTimer: LiveTimerState;
  hasCompletedOnboarding: boolean;
}

export const DEFAULT_APP_STATE: AppState = {
  goals: [],
  tasks: [],
  sessions: [],
  appUsage: [],
  currentTaskName: '',
  currentFocusGoalId: '',
  theme: 'dark',
  windowState: 'collapsed',
  userPrefs: DEFAULT_USER_PREFS,
  liveTimer: DEFAULT_LIVE_TIMER,
  hasCompletedOnboarding: false,
};
