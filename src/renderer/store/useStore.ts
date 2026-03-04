import { useState, useEffect, useCallback } from 'react';
import type {
  AppState,
  Goal,
  Task,
  Session,
  AppUsageEntry,
  UserPrefs,
  TimerStateUpdate,
  LiveTimerState,
} from '../../types';

const invoke = window.electron?.ipcRenderer?.invoke;

export function useStore() {
  const [state, setState] = useState<AppState | null>(null);

  const refresh = useCallback(async () => {
    if (!invoke) return;
    const data = await invoke('store:get-state');
    setState(data);
  }, []);

  const setWindowState = useCallback(async (ws: 'collapsed' | 'options') => {
    if (!invoke) return ws;
    const newState = await invoke('window:set-state', ws);
    setState((prev) => (prev ? { ...prev, windowState: newState } : prev));
    return newState;
  }, []);

  const openSecondary = useCallback(async (route: string) => {
    if (!invoke) return;
    await invoke('window:open-secondary', route);
  }, []);

  const closeSecondary = useCallback(async () => {
    if (!invoke) return;
    await invoke('window:close-secondary');
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setTheme = useCallback(async (theme: 'dark' | 'light') => {
    if (!invoke) return;
    const data = await invoke('store:set-theme', theme);
    setState(data);
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!invoke) return;
    const data = await invoke('onboarding:complete');
    setState(data);
  }, []);

  const setCurrentTaskName = useCallback(
    async (name: string) => {
      if (!invoke) return;
      await invoke('store:set-current-task-name', name);
      refresh();
    },
    [refresh],
  );

  const setCurrentFocusGoalId = useCallback(
    async (id: string) => {
      if (!invoke) return;
      await invoke('store:set-current-focus-goal-id', id);
      refresh();
    },
    [refresh],
  );

  const addGoal = useCallback(
    async (goal: Goal) => {
      if (!invoke) return;
      await invoke('store:add-goal', goal);
      refresh();
    },
    [refresh],
  );

  const updateGoal = useCallback(
    async (id: string, updates: Partial<Goal>) => {
      if (!invoke) return;
      await invoke('store:update-goal', id, updates);
      refresh();
    },
    [refresh],
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      if (!invoke) return;
      await invoke('store:delete-goal', id);
      refresh();
    },
    [refresh],
  );

  const addTask = useCallback(
    async (task: Task) => {
      if (!invoke) return;
      await invoke('store:add-task', task);
      refresh();
    },
    [refresh],
  );

  const updateTask = useCallback(
    async (id: string, updates: Partial<Task>) => {
      if (!invoke) return;
      await invoke('store:update-task', id, updates);
      refresh();
    },
    [refresh],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      if (!invoke) return;
      await invoke('store:delete-task', id);
      refresh();
    },
    [refresh],
  );

  const addSession = useCallback(
    async (session: Session) => {
      if (!invoke) return;
      await invoke('store:add-session', session);
      refresh();
    },
    [refresh],
  );

  const setUserPrefs = useCallback(async (prefs: Partial<UserPrefs>) => {
    if (!invoke) return;
    const data = await invoke('store:set-user-prefs', prefs);
    setState(data);
  }, []);

  const sendTimerStateUpdate = useCallback(async (update: TimerStateUpdate) => {
    if (!invoke) return;
    await invoke('timer:state-update', update);
  }, []);

  const setAutoLaunch = useCallback(
    async (enabled: boolean) => {
      if (!invoke) return;
      await invoke('app:set-auto-launch', enabled);
      refresh();
    },
    [refresh],
  );

  const getAutoLaunch = useCallback(async () => {
    if (!invoke) return false;
    return invoke('app:get-auto-launch');
  }, []);

  const updateShortcuts = useCallback(async () => {
    if (!invoke) return;
    await invoke('app:update-shortcuts');
  }, []);

  const startAppTracking = useCallback(async (sessionId?: string) => {
    if (!invoke) return;
    await invoke('app-tracking:start', sessionId);
  }, []);

  const stopAppTracking = useCallback(async (): Promise<AppUsageEntry[]> => {
    if (!invoke) return [];
    const entries = await invoke('app-tracking:stop');
    refresh();
    return (entries as AppUsageEntry[]) ?? [];
  }, [refresh]);

  const getAppUsageData = useCallback(async (): Promise<AppUsageEntry[]> => {
    if (!invoke) return [];
    const data = await invoke('app-tracking:get-data');
    return (data as AppUsageEntry[]) ?? [];
  }, []);

  const getLiveTimer = useCallback(async (): Promise<LiveTimerState | null> => {
    if (!invoke) return null;
    return invoke('live-timer:get') as Promise<LiveTimerState>;
  }, []);

  const startLiveTimer = useCallback(
    async (payload: {
      taskName: string;
      goalId?: string;
      goalName?: string;
    }): Promise<LiveTimerState | null> => {
      if (!invoke) return null;
      const result = (await invoke(
        'live-timer:start',
        payload,
      )) as LiveTimerState;
      setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
      return result;
    },
    [],
  );

  const pauseLiveTimer = useCallback(async () => {
    if (!invoke) return;
    const result = (await invoke('live-timer:pause')) as LiveTimerState;
    setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
  }, []);

  const resumeLiveTimer = useCallback(async () => {
    if (!invoke) return;
    const result = (await invoke('live-timer:resume')) as LiveTimerState;
    setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
  }, []);

  const breakLiveTimer = useCallback(async () => {
    if (!invoke) return;
    const result = (await invoke('live-timer:break')) as LiveTimerState;
    setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
  }, []);

  const endBreakLiveTimer = useCallback(async () => {
    if (!invoke) return;
    const result = (await invoke('live-timer:end-break')) as LiveTimerState;
    setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
  }, []);

  const stopLiveTimer = useCallback(async () => {
    if (!invoke) return null;
    const finalState = (await invoke('live-timer:stop')) as LiveTimerState;
    setState((prev) =>
      prev
        ? {
            ...prev,
            liveTimer: {
              isActive: false,
              status: 'idle',
              taskName: '',
              elapsed: 0,
              breakElapsed: 0,
              breaks: 0,
              mode: 'focus',
            },
          }
        : prev,
    );
    return finalState;
  }, []);

  const tickLiveTimer = useCallback(
    async (elapsed: number, breakElapsed: number) => {
      if (!invoke) return;
      await invoke('live-timer:tick', elapsed, breakElapsed);
    },
    [],
  );

  const editLiveTimerTask = useCallback(async (taskName: string) => {
    if (!invoke) return;
    const result = (await invoke(
      'live-timer:edit-task',
      taskName,
    )) as LiveTimerState;
    setState((prev) => (prev ? { ...prev, liveTimer: result } : prev));
  }, []);

  useEffect(() => {
    const unsub = window.electron?.ipcRenderer?.on?.(
      'live-timer:update' as Parameters<
        typeof window.electron.ipcRenderer.on
      >[0],
      (data: unknown) => {
        const timerState = data as LiveTimerState;
        setState((prev) => (prev ? { ...prev, liveTimer: timerState } : prev));
      },
    );
    return unsub;
  }, []);

  return {
    state,
    setWindowState,
    openSecondary,
    closeSecondary,
    refresh,
    setTheme,
    completeOnboarding,
    setCurrentTaskName,
    setCurrentFocusGoalId,
    addGoal,
    updateGoal,
    deleteGoal,
    addTask,
    updateTask,
    deleteTask,
    addSession,
    setUserPrefs,
    sendTimerStateUpdate,
    setAutoLaunch,
    getAutoLaunch,
    updateShortcuts,
    startAppTracking,
    stopAppTracking,
    getAppUsageData,
    getLiveTimer,
    startLiveTimer,
    pauseLiveTimer,
    resumeLiveTimer,
    breakLiveTimer,
    endBreakLiveTimer,
    stopLiveTimer,
    tickLiveTimer,
    editLiveTimerTask,
  };
}
