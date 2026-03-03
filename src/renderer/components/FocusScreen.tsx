import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Target, Play } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useStore } from '../store/useStore';
import { useTimer, PRESETS } from '../hooks/useTimer';
import { computeStreak } from '../lib/streak';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function FocusScreen() {
  const {
    state,
    setCurrentTaskName,
    setCurrentFocusGoalId,
    addSession,
    setUserPrefs,
    sendTimerStateUpdate,
    startAppTracking,
    stopAppTracking,
  } = useStore();
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const sessionContextRef = useRef<{
    taskId?: string;
    goalId?: string;
    taskName: string;
  }>({ taskName: '' });

  const handleSessionComplete = (duration: number, type: 'focus' | 'break') => {
    const ctx = sessionContextRef.current;
    // Stop app tracking when session ends
    if (type === 'focus') stopAppTracking();
    const prefs = state?.userPrefs;
    if (prefs?.notifyOnComplete) {
      const title = type === 'focus' ? 'Focus complete' : 'Break complete';
      const body =
        type === 'focus' ? 'Time for a break!' : 'Ready to focus again?';
      window.electron?.ipcRenderer?.invoke?.('app:notify', { title, body });
    }
    if (prefs?.soundOnComplete) {
      try {
        const audioCtx = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          audioCtx.currentTime + 0.2,
        );
        osc.start(audioCtx.currentTime);
        osc.stop(audioCtx.currentTime + 0.2);
      } catch {
        /* ignore */
      }
    }
    addSession({
      id: generateId(),
      taskId: ctx.taskId,
      goalId: ctx.goalId,
      taskName: ctx.taskName || undefined,
      startTime: Date.now() - duration * 1000,
      endTime: Date.now(),
      duration,
      type,
      completed: true,
    });
  };

  const handleStopEarly = (elapsed: number, type: 'focus' | 'break') => {
    const ctx = sessionContextRef.current;
    // Stop app tracking when session stopped early
    if (type === 'focus') stopAppTracking();
    addSession({
      id: generateId(),
      taskId: ctx.taskId,
      goalId: ctx.goalId,
      taskName: ctx.taskName || undefined,
      startTime: Date.now() - elapsed * 1000,
      endTime: Date.now(),
      duration: elapsed,
      type,
      completed: false,
    });
  };

  const {
    state: timerState,
    remaining,
    mode,
    formatTime,
    start,
    pause,
    resume,
    stop,
    startBreak,
  } = useTimer(handleSessionComplete, handleStopEarly, {
    focusDuration: state?.userPrefs?.focusDuration ?? 25 * 60,
    breakDuration: state?.userPrefs?.breakDuration ?? 5 * 60,
  });

  const currentTaskName = state?.currentTaskName ?? '';
  const tasks = useMemo(() => state?.tasks ?? [], [state?.tasks]);
  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.completedAt),
    [tasks],
  );
  const selectedTask = useMemo(
    () => activeTasks.find((task) => task.id === selectedTaskId),
    [activeTasks, selectedTaskId],
  );
  const focusMinuteOptions = useMemo(
    () => Array.from({ length: 24 }, (_, index) => (index + 1) * 5),
    [],
  );
  const breakMinuteOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => (index + 1) * 5),
    [],
  );
  const selectedFocusMinutes = Math.max(
    5,
    Math.round((state?.userPrefs?.focusDuration ?? 25 * 60) / 60),
  );
  const selectedBreakMinutes = Math.max(
    5,
    Math.round((state?.userPrefs?.breakDuration ?? 5 * 60) / 60),
  );
  const streak = computeStreak(state?.sessions ?? []);

  // Goals data
  const goals = useMemo(() => state?.goals ?? [], [state?.goals]);
  const currentFocusGoalId = state?.currentFocusGoalId ?? '';
  const focusGoal = useMemo(
    () => goals.find((g) => g.id === currentFocusGoalId),
    [goals, currentFocusGoalId],
  );
  const recentGoals = useMemo(
    () => [...goals].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3),
    [goals],
  );

  // Daily focus goal progress
  const dailyGoalMinutes = state?.userPrefs?.dailyFocusGoalMinutes ?? 120;
  const todayFocusMinutes = useMemo(() => {
    const sessions = state?.sessions ?? [];
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    return sessions
      .filter((s) => s.type === 'focus' && s.startTime >= todayStart)
      .reduce((sum, s) => sum + s.duration / 60, 0);
  }, [state?.sessions]);
  const dailyGoalProgress =
    dailyGoalMinutes > 0
      ? Math.min(1, todayFocusMinutes / dailyGoalMinutes)
      : 0;

  useEffect(() => {
    if (!activeTasks.length) {
      setSelectedTaskId('');
      return;
    }

    const taskFromCurrentName = activeTasks.find(
      (task) => task.name === currentTaskName,
    );

    if (!selectedTaskId && taskFromCurrentName) {
      setSelectedTaskId(taskFromCurrentName.id);
      return;
    }

    const stillValid = activeTasks.some((task) => task.id === selectedTaskId);
    if (!stillValid) {
      setSelectedTaskId(activeTasks[0].id);
    }
  }, [activeTasks, currentTaskName, selectedTaskId]);

  const handleStartFocus = useCallback(() => {
    const sessionId = generateId();
    if (selectedTask) {
      setCurrentTaskName(selectedTask.name);
      sessionContextRef.current = {
        taskId: selectedTask.id,
        goalId: selectedTask.goalId,
        taskName: selectedTask.name,
      };
    } else if (focusGoal) {
      // Focusing on a goal directly (no matching task)
      setCurrentTaskName(focusGoal.name);
      sessionContextRef.current = {
        goalId: focusGoal.id,
        taskName: focusGoal.name,
      };
    } else {
      setCurrentTaskName('');
      sessionContextRef.current = { taskName: '' };
    }
    // Start app tracking for this focus session
    startAppTracking(sessionId);
    start('focus');
  }, [selectedTask, focusGoal, setCurrentTaskName, start, startAppTracking]);

  const handleSelectGoal = useCallback(
    (goalId: string, goalName: string) => {
      setCurrentFocusGoalId(goalId);
      setCurrentTaskName(goalName);
      // If there's a matching task, select it; otherwise clear task selector
      const matchingTask = activeTasks.find(
        (t) => t.goalId === goalId || t.name === goalName,
      );
      if (matchingTask) {
        setSelectedTaskId(matchingTask.id);
      } else {
        setSelectedTaskId('');
      }
    },
    [activeTasks, setCurrentFocusGoalId, setCurrentTaskName],
  );

  const handleClearGoal = useCallback(() => {
    setCurrentFocusGoalId('');
  }, [setCurrentFocusGoalId]);

  const handleStartBreak = useCallback(() => {
    sessionContextRef.current = { taskName: '' };
    start('break');
  }, [start]);

  // Sync timer state to main process (for tray + global shortcuts)
  useEffect(() => {
    sendTimerStateUpdate({
      status:
        timerState === 'idle'
          ? 'idle'
          : timerState === 'running'
            ? 'running'
            : 'paused',
      remaining,
      mode,
      taskName: sessionContextRef.current.taskName,
    });
  }, [timerState, remaining, mode, sendTimerStateUpdate]);

  // Listen for timer commands from tray/global shortcuts
  useEffect(() => {
    const unsub = window.electron?.ipcRenderer?.on?.(
      'timer:command' as Parameters<typeof window.electron.ipcRenderer.on>[0],
      (action: unknown) => {
        if (typeof action !== 'string') return;
        switch (action) {
          case 'start-focus':
            handleStartFocus();
            break;
          case 'start-break':
            handleStartBreak();
            break;
          case 'pause':
            pause();
            break;
          case 'resume':
            resume();
            break;
          case 'stop':
            stop();
            break;
          default:
            break;
        }
      },
    );
    return unsub;
  }, [handleStartFocus, handleStartBreak, pause, resume, stop]);

  const totalDuration =
    mode === 'focus'
      ? (state?.userPrefs?.focusDuration ?? 25 * 60)
      : (state?.userPrefs?.breakDuration ?? 5 * 60);
  const progress = totalDuration > 0 ? 1 - remaining / totalDuration : 0;

  const [settingsOpen, setSettingsOpen] = useState(false);
  const circumference = 2 * Math.PI * 90;

  const isRunning = timerState === 'running';
  const isPaused = timerState === 'paused';
  const isIdle = timerState === 'idle';

  const ambientClass = [
    'timer-ambient',
    mode === 'focus' ? 'timer-ambient--focus' : 'timer-ambient--break',
    isRunning ? 'timer-ambient--active' : isPaused ? 'timer-ambient--idle' : '',
  ].join(' ');

  return (
    <div className="flex flex-col items-center animate-fade-in-up">
      {/* ─── SVG gradient defs (hidden) ─── */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="timer-gradient-focus" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0a84ff" />
            <stop offset="100%" stopColor="#5e5ce6" />
          </linearGradient>
          <linearGradient id="timer-gradient-break" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#30d158" />
            <stop offset="100%" stopColor="#34c759" />
          </linearGradient>
        </defs>
      </svg>

      {/* ─── Hero timer ─── */}
      <div className="relative flex items-center justify-center w-full pt-2 pb-3">
        {/* Ambient glow */}
        <div className={ambientClass} />

        <div className="relative w-52 h-52 flex items-center justify-center z-10">
          <svg
            className="timer-ring absolute inset-0 w-full h-full"
            viewBox="0 0 200 200"
          >
            <circle className="timer-ring-track" cx="100" cy="100" r="90" />
            <circle
              className={`timer-ring-progress ${mode === 'break' ? 'break-mode' : ''}`}
              cx="100"
              cy="100"
              r="90"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progress)}
            />
          </svg>

          <div className="text-center z-10">
            <div className="font-display text-[3.25rem] font-semibold tabular-nums text-foreground tracking-[-0.05em] leading-none">
              {formatTime(remaining)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 m-0 tracking-wide uppercase">
              {isIdle
                ? mode === 'focus'
                  ? `${selectedFocusMinutes} min focus`
                  : `${selectedBreakMinutes} min break`
                : isRunning
                  ? mode === 'focus'
                    ? 'focusing'
                    : 'resting'
                  : 'paused'}
            </p>
          </div>
        </div>
      </div>

      {/* ─── Context badges ─── */}
      <div className="flex items-center gap-2 mb-4">
        {streak > 0 && (
          <Badge variant="secondary" className="text-[11px] px-2 py-0.5">
            🔥 {streak}d streak
          </Badge>
        )}
        {!isIdle && selectedTask && (
          <Badge
            variant="outline"
            className="text-[11px] px-2 py-0.5 max-w-[180px] truncate"
          >
            {selectedTask.name}
          </Badge>
        )}
        {!isIdle && !selectedTask && focusGoal && (
          <Badge
            variant="outline"
            className="text-[11px] px-2 py-0.5 max-w-[180px] truncate"
          >
            🎯 {focusGoal.name}
          </Badge>
        )}
        <Badge
          variant={mode === 'focus' ? 'default' : 'secondary'}
          className="text-[11px] px-2 py-0.5"
        >
          {mode === 'focus' ? 'Focus' : 'Break'}
        </Badge>
      </div>

      {/* ─── Action buttons ─── */}
      <div className="flex gap-3 justify-center mb-6">
        {isIdle && (
          <>
            <Button
              size="lg"
              onClick={handleStartFocus}
              className="btn-pill h-11 px-8 text-[15px]"
            >
              Start Focus
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={handleStartBreak}
              className="btn-pill h-11 px-6 text-[15px]"
            >
              Break
            </Button>
          </>
        )}
        {isRunning && (
          <>
            <Button
              variant="secondary"
              size="lg"
              onClick={pause}
              className="btn-pill h-11 px-8 text-[15px]"
            >
              Pause
            </Button>
            {mode === 'focus' && (
              <Button
                variant="outline"
                size="lg"
                onClick={startBreak}
                className="btn-pill h-11 px-6 text-[15px]"
              >
                Break
              </Button>
            )}
          </>
        )}
        {isPaused && (
          <>
            <Button
              size="lg"
              onClick={resume}
              className="btn-pill h-11 px-8 text-[15px]"
            >
              Resume
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={stop}
              className="btn-pill h-11 px-6 text-[15px]"
            >
              Stop
            </Button>
          </>
        )}
      </div>

      {/* ─── Daily focus goal ─── */}
      <div className="w-full px-1 mb-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            {Math.round(todayFocusMinutes)}m{' '}
            <span className="text-muted-foreground/60">
              /{' '}
              {dailyGoalMinutes >= 60
                ? `${Math.floor(dailyGoalMinutes / 60)}h${dailyGoalMinutes % 60 ? ` ${dailyGoalMinutes % 60}m` : ''}`
                : `${dailyGoalMinutes}m`}{' '}
              today
            </span>
          </span>
          <span className="text-[11px] font-semibold text-foreground/80">
            {Math.round(dailyGoalProgress * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${dailyGoalProgress * 100}%`,
              background:
                dailyGoalProgress >= 1
                  ? 'linear-gradient(90deg, #30d158, #34c759)'
                  : 'linear-gradient(90deg, #0a84ff, #5e5ce6)',
            }}
          />
        </div>
      </div>

      {/* ─── Active focus goal banner ─── */}
      {focusGoal && (
        <div className="w-full px-1 mb-3">
          <div className="glass-surface rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground/60 m-0 uppercase tracking-wider font-medium">
                Focusing on goal
              </p>
              <p className="text-[13px] font-medium m-0 truncate">
                {focusGoal.name}
              </p>
            </div>
            <button
              onClick={handleClearGoal}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground bg-transparent border-0 cursor-pointer px-1.5 py-0.5 rounded transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ─── Recent goals — quick pick ─── */}
      {recentGoals.length > 0 && !focusGoal && isIdle && (
        <div className="w-full px-1 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Recent goals
            </span>
            <Link
              to="/goals"
              className="text-[11px] font-medium text-primary/70 no-underline hover:text-primary transition-colors"
            >
              All goals →
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {recentGoals.map((goal) => (
              <button
                key={goal.id}
                onClick={() => handleSelectGoal(goal.id, goal.name)}
                className="group/goal glass-surface rounded-xl p-2.5 flex items-center gap-2.5 w-full text-left bg-transparent border-0 cursor-pointer hover:bg-white/[0.07] transition-all duration-200"
              >
                <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                  <Target className="h-3 w-3 text-primary/70" />
                </div>
                <span className="text-[12px] font-medium flex-1 truncate">
                  {goal.name}
                </span>
                <Play className="h-3 w-3 text-muted-foreground/40 group-hover/goal:text-primary transition-colors shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Todo selector — minimal inline ─── */}
      <div className="w-full px-1">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Current task
          </span>
          <Link
            to="/todos"
            className="text-[11px] font-medium text-primary/70 no-underline hover:text-primary transition-colors"
          >
            Manage →
          </Link>
        </div>
        <Select
          value={selectedTaskId}
          onValueChange={(value) => setSelectedTaskId(value)}
          disabled={activeTasks.length === 0}
        >
          <SelectTrigger
            aria-label="Select todo"
            className="rounded-xl glass-input h-10"
          >
            <SelectValue
              placeholder={
                activeTasks.length === 0
                  ? 'No active todos — add one first'
                  : 'Choose a task to focus on...'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {activeTasks.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ─── Session config — collapsible ─── */}
      <div className="w-full mt-5 px-1">
        <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
          <CollapsibleTrigger className="settings-trigger w-full flex items-center justify-between cursor-pointer bg-transparent border-0 px-0 py-1.5">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Session settings
            </span>
            <ChevronDown className="h-3.5 w-3.5" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-3 pb-1 space-y-3">
              {/* Preset chips */}
              <div className="flex gap-1.5">
                {(['short', 'pomodoro', 'long'] as const).map((key) => {
                  const p = PRESETS[key];
                  const labels = {
                    short: '15 / 5',
                    pomodoro: '25 / 5',
                    long: '45 / 10',
                  } as const;
                  const isActive =
                    (state?.userPrefs?.focusDuration ?? 25 * 60) === p.focus;
                  return (
                    <Button
                      key={key}
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        setUserPrefs({
                          focusDuration: p.focus,
                          breakDuration: p.break,
                        })
                      }
                      className="btn-pill h-7 px-3 text-[11px]"
                    >
                      {labels[key]}
                    </Button>
                  );
                })}
              </div>

              {/* Custom selects */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <p className="m-0 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Focus
                  </p>
                  <Select
                    value={String(selectedFocusMinutes)}
                    onValueChange={(v) =>
                      setUserPrefs({ focusDuration: Number(v) * 60 })
                    }
                  >
                    <SelectTrigger
                      className="h-8 text-xs rounded-lg"
                      aria-label="Focus minutes"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {focusMinuteOptions.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <p className="m-0 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                    Break
                  </p>
                  <Select
                    value={String(selectedBreakMinutes)}
                    onValueChange={(v) =>
                      setUserPrefs({ breakDuration: Number(v) * 60 })
                    }
                  >
                    <SelectTrigger
                      className="h-8 text-xs rounded-lg"
                      aria-label="Break minutes"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {breakMinuteOptions.map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} min
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notification toggles */}
              <div className="flex gap-5 pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                  <Checkbox
                    checked={state?.userPrefs?.notifyOnComplete ?? true}
                    onCheckedChange={(c) =>
                      setUserPrefs({ notifyOnComplete: c === true })
                    }
                  />
                  Notify
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-muted-foreground">
                  <Checkbox
                    checked={state?.userPrefs?.soundOnComplete ?? false}
                    onCheckedChange={(c) =>
                      setUserPrefs({ soundOnComplete: c === true })
                    }
                  />
                  Sound
                </label>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
