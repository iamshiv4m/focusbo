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
};
