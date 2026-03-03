import Store from 'electron-store';
import type {
  AppState,
  Goal,
  Task,
  Session,
  AppUsageEntry,
  WindowState,
  UserPrefs,
} from '../types';
import { DEFAULT_USER_PREFS } from '../types';

const store = new Store({
  name: 'focusbo',
  defaults: {
    goals: [],
    tasks: [],
    sessions: [],
    appUsage: [],
    currentTaskName: '',
    currentFocusGoalId: '',
    theme: 'dark',
    windowState: 'collapsed',
    userPrefs: DEFAULT_USER_PREFS,
  },
});

export function getAppState(): AppState {
  const raw = store.get('windowState', 'collapsed') as string;
  const windowState: WindowState =
    raw === 'full'
      ? 'options'
      : raw === 'collapsed' || raw === 'options'
        ? raw
        : 'collapsed';
  return {
    goals: store.get('goals', []) as Goal[],
    tasks: store.get('tasks', []) as Task[],
    sessions: store.get('sessions', []) as Session[],
    appUsage: store.get('appUsage', []) as AppUsageEntry[],
    currentTaskName: store.get('currentTaskName', '') as string,
    currentFocusGoalId: store.get('currentFocusGoalId', '') as string,
    theme: store.get('theme', 'dark') as 'dark' | 'light',
    windowState,
    userPrefs: getUserPrefs(),
  };
}

export function setWindowState(state: WindowState): void {
  store.set('windowState', state);
}

export function setTheme(theme: 'dark' | 'light'): void {
  store.set('theme', theme);
}

export function getTheme(): 'dark' | 'light' {
  return store.get('theme', 'dark') as 'dark' | 'light';
}

export function setCurrentTaskName(name: string): void {
  store.set('currentTaskName', name);
}

export function getCurrentTaskName(): string {
  return store.get('currentTaskName', '') as string;
}

export function setCurrentFocusGoalId(id: string): void {
  store.set('currentFocusGoalId', id);
}

export function getCurrentFocusGoalId(): string {
  return store.get('currentFocusGoalId', '') as string;
}

export function getGoals(): Goal[] {
  return store.get('goals', []) as Goal[];
}

export function addGoal(goal: Goal): void {
  const goals = getGoals();
  store.set('goals', [...goals, goal]);
}

export function updateGoal(id: string, updates: Partial<Goal>): void {
  const goals = getGoals().map((g) => (g.id === id ? { ...g, ...updates } : g));
  store.set('goals', goals);
}

export function deleteGoal(id: string): void {
  store.set(
    'goals',
    getGoals().filter((g) => g.id !== id),
  );
}

export function getTasks(): Task[] {
  return store.get('tasks', []) as Task[];
}

export function addTask(task: Task): void {
  const tasks = getTasks();
  store.set('tasks', [...tasks, task]);
}

export function updateTask(id: string, updates: Partial<Task>): void {
  const tasks = getTasks().map((t) => (t.id === id ? { ...t, ...updates } : t));
  store.set('tasks', tasks);
}

export function deleteTask(id: string): void {
  store.set(
    'tasks',
    getTasks().filter((t) => t.id !== id),
  );
}

export function getSessions(): Session[] {
  return store.get('sessions', []) as Session[];
}

export function addSession(session: Session): void {
  const sessions = getSessions();
  store.set('sessions', [...sessions, session]);
}

/* ── App Usage ── */

export function getAppUsage(): AppUsageEntry[] {
  return store.get('appUsage', []) as AppUsageEntry[];
}

export function addAppUsageEntries(entries: AppUsageEntry[]): void {
  if (!entries.length) return;
  const existing = getAppUsage();
  store.set('appUsage', [...existing, ...entries]);
}

export function getAppUsageBySession(sessionId: string): AppUsageEntry[] {
  return getAppUsage().filter((e) => e.sessionId === sessionId);
}

/* ── User Prefs ── */

export function getUserPrefs(): UserPrefs {
  const raw = store.get('userPrefs');
  if (!raw || typeof raw !== 'object') return DEFAULT_USER_PREFS;
  const o = raw as Record<string, unknown>;
  return {
    focusDuration:
      typeof o.focusDuration === 'number'
        ? o.focusDuration
        : DEFAULT_USER_PREFS.focusDuration,
    breakDuration:
      typeof o.breakDuration === 'number'
        ? o.breakDuration
        : DEFAULT_USER_PREFS.breakDuration,
    soundOnComplete:
      typeof o.soundOnComplete === 'boolean'
        ? o.soundOnComplete
        : DEFAULT_USER_PREFS.soundOnComplete,
    notifyOnComplete:
      typeof o.notifyOnComplete === 'boolean'
        ? o.notifyOnComplete
        : DEFAULT_USER_PREFS.notifyOnComplete,
    autoLaunch:
      typeof o.autoLaunch === 'boolean'
        ? o.autoLaunch
        : DEFAULT_USER_PREFS.autoLaunch,
    globalShortcutsEnabled:
      typeof o.globalShortcutsEnabled === 'boolean'
        ? o.globalShortcutsEnabled
        : DEFAULT_USER_PREFS.globalShortcutsEnabled,
    showTrayTimer:
      typeof o.showTrayTimer === 'boolean'
        ? o.showTrayTimer
        : DEFAULT_USER_PREFS.showTrayTimer,
    dailyFocusGoalMinutes:
      typeof o.dailyFocusGoalMinutes === 'number'
        ? o.dailyFocusGoalMinutes
        : DEFAULT_USER_PREFS.dailyFocusGoalMinutes,
    trackAppUsage:
      typeof o.trackAppUsage === 'boolean'
        ? o.trackAppUsage
        : DEFAULT_USER_PREFS.trackAppUsage,
  };
}

export function setUserPrefs(prefs: Partial<UserPrefs>): void {
  const current = getUserPrefs();
  store.set('userPrefs', { ...current, ...prefs });
}
