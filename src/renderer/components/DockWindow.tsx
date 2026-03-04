import { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore';
import {
  Play,
  Target,
  ListTodo,
  BarChart3,
  ChevronLeft,
  Pause,
  Square,
  Coffee,
  Pencil,
  Zap,
  Clock,
  PlayCircle,
} from 'lucide-react';
import type { LiveTimerState } from '../../types';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function getTodayMinutes(
  sessions: { type: string; startTime: number; duration: number }[],
): number {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return Math.round(
    sessions
      .filter((s) => s.type === 'focus' && s.startTime >= todayStart.getTime())
      .reduce((sum, s) => sum + s.duration / 60, 0),
  );
}

const NAV_OPTIONS = [
  { route: '/', label: 'Focus', icon: Zap },
  { route: '/goals', label: 'Goals', icon: Target },
  { route: '/todos', label: 'Todos', icon: ListTodo },
  { route: '/progress', label: 'Progress', icon: BarChart3 },
] as const;

export default function DockWindow() {
  const {
    state,
    setWindowState,
    openSecondary,
    startLiveTimer,
    pauseLiveTimer,
    resumeLiveTimer,
    breakLiveTimer,
    endBreakLiveTimer,
    stopLiveTimer,
    tickLiveTimer,
    editLiveTimerTask,
    addSession,
  } = useStore();

  const liveTimer: LiveTimerState = state?.liveTimer ?? {
    isActive: false,
    status: 'idle',
    taskName: '',
    elapsed: 0,
    breakElapsed: 0,
    breaks: 0,
    mode: 'focus',
  };

  const windowState = state?.windowState ?? 'collapsed';
  const tasks = state?.tasks ?? [];
  const goals = state?.goals ?? [];
  const sessions = state?.sessions ?? [];

  const [localElapsed, setLocalElapsed] = useState(liveTimer.elapsed);
  const [localBreakElapsed, setLocalBreakElapsed] = useState(
    liveTimer.breakElapsed,
  );
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [selectedGoalId, setSelectedGoalId] = useState('');

  const [editingTask, setEditingTask] = useState(false);
  const [editTaskValue, setEditTaskValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('dock-window', 'dark');
    html.classList.remove('theme-light');
    return () => html.classList.remove('dock-window');
  }, []);

  useEffect(() => {
    setLocalElapsed(liveTimer.elapsed);
    setLocalBreakElapsed(liveTimer.breakElapsed);
  }, [liveTimer.elapsed, liveTimer.breakElapsed]);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (
      liveTimer.isActive &&
      (liveTimer.status === 'running' || liveTimer.status === 'break')
    ) {
      let tickCount = 0;
      intervalRef.current = setInterval(() => {
        tickCount += 1;
        if (liveTimer.status === 'break') {
          setLocalBreakElapsed((prev) => {
            const next = prev + 1;
            if (tickCount % 5 === 0) {
              tickLiveTimer(localElapsed, next);
            }
            return next;
          });
        } else {
          setLocalElapsed((prev) => {
            const next = prev + 1;
            if (tickCount % 5 === 0) {
              tickLiveTimer(next, localBreakElapsed);
            }
            return next;
          });
        }
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [
    liveTimer.isActive,
    liveTimer.status,
    localElapsed,
    localBreakElapsed,
    tickLiveTimer,
  ]);

  useEffect(() => {
    const dockInvoke = window.electron?.ipcRenderer?.invoke;
    if (!dockInvoke) return;
    if (liveTimer.isActive) {
      dockInvoke('window:resize-dock', 'timer-active');
    } else if (windowState === 'options') {
      dockInvoke('window:resize-dock', 'options');
    } else {
      dockInvoke('window:resize-dock', 'collapsed');
    }
  }, [liveTimer.isActive, windowState]);

  const handleQuickStart = useCallback(
    async (taskName: string, goalId?: string) => {
      if (!taskName.trim()) return;
      const goal = goals.find((g) => g.id === goalId);
      await startLiveTimer({
        taskName: taskName.trim(),
        goalId,
        goalName: goal?.name,
      });
      setLocalElapsed(0);
      setLocalBreakElapsed(0);
      setQuickTaskInput('');
      setSelectedGoalId('');
      await setWindowState('collapsed');
    },
    [goals, startLiveTimer, setWindowState],
  );

  const handleStop = useCallback(async () => {
    const finalState = await stopLiveTimer();
    if (finalState && localElapsed > 10) {
      await addSession({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        taskName: finalState.taskName || undefined,
        goalId: finalState.goalId,
        startTime: finalState.startedAt ?? Date.now() - localElapsed * 1000,
        endTime: Date.now(),
        duration: localElapsed,
        type: 'focus',
        completed: false,
      });
    }
    setLocalElapsed(0);
    setLocalBreakElapsed(0);
  }, [stopLiveTimer, addSession, localElapsed]);

  const handleStartEdit = useCallback(() => {
    setEditTaskValue(liveTimer.taskName);
    setEditingTask(true);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }, [liveTimer.taskName]);

  const handleSaveEdit = useCallback(async () => {
    if (editTaskValue.trim()) {
      await editLiveTimerTask(editTaskValue.trim());
    }
    setEditingTask(false);
  }, [editTaskValue, editLiveTimerTask]);

  const recentTaskNames = Array.from(
    new Set(
      [...sessions]
        .sort((a, b) => b.startTime - a.startTime)
        .filter((s) => s.taskName && s.type === 'focus')
        .map((s) => s.taskName as string),
    ),
  ).slice(0, 3);

  const recentGoals = [...goals]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);

  const todayMinutes = getTodayMinutes(sessions);
  const activeTasks = tasks.filter((t) => !t.completedAt).slice(0, 3);

  if (liveTimer.isActive) {
    const isBreak = liveTimer.status === 'break';
    const isPaused = liveTimer.status === 'paused';

    return (
      <div className="w-full h-full flex items-center justify-end overflow-hidden dark">
        <motion.div
          layout
          initial={{ opacity: 0, x: 20, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 320, damping: 28 }}
          className="h-[72px] w-[240px] min-w-[240px] flex items-center justify-between px-3 rounded-l-2xl overflow-hidden"
          style={{
            background: isBreak
              ? 'rgba(16, 32, 20, 0.92)'
              : isPaused
                ? 'rgba(20, 20, 28, 0.92)'
                : 'rgba(12, 14, 22, 0.92)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            borderLeft: isBreak
              ? '1px solid rgba(48, 209, 88, 0.2)'
              : isPaused
                ? '1px solid rgba(255, 159, 10, 0.2)'
                : '1px solid rgba(10, 132, 255, 0.2)',
          }}
        >
          <div
            className="flex-1 min-w-0 flex flex-col justify-center cursor-pointer"
            onClick={() => openSecondary('/')}
          >
            <div className="flex items-center gap-1.5 mb-0.5">
              {liveTimer.goalId && (
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: isBreak ? '#30d158' : '#0a84ff' }}
                />
              )}
              {editingTask ? (
                <input
                  ref={editInputRef}
                  value={editTaskValue}
                  onChange={(e) => setEditTaskValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setEditingTask(false);
                  }}
                  onBlur={handleSaveEdit}
                  className="bg-transparent text-[11px] font-medium text-white/90 outline-none border-b border-white/20 w-full max-w-[110px]"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  }}
                />
              ) : (
                <span
                  className="text-[11px] font-medium text-white/80 truncate max-w-[106px]"
                  style={{
                    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  }}
                >
                  {liveTimer.taskName || 'Focus session'}
                </span>
              )}
              {!editingTask && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartEdit();
                  }}
                  className="opacity-0 hover:opacity-100 focus:opacity-100 text-white/30 hover:text-white/60 transition-opacity bg-transparent border-0 cursor-pointer p-0 flex-shrink-0"
                  style={{ lineHeight: 1 }}
                >
                  <Pencil className="w-2.5 h-2.5" />
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-1.5">
              <span
                className="text-[22px] font-semibold tabular-nums leading-none"
                style={{
                  fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
                  color: isBreak ? '#30d158' : isPaused ? '#ff9f0a' : '#ffffff',
                  letterSpacing: '-0.03em',
                }}
              >
                {isBreak
                  ? formatElapsed(localBreakElapsed)
                  : formatElapsed(localElapsed)}
              </span>
              <span className="text-[9px] text-white/30 uppercase tracking-wider">
                {isBreak ? 'break' : isPaused ? 'paused' : 'elapsed'}
              </span>
            </div>

            {liveTimer.breaks > 0 && !isBreak && (
              <span className="text-[9px] text-white/25 mt-0.5">
                {liveTimer.breaks} break{liveTimer.breaks !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2 min-w-[92px] justify-end">
            {!isBreak && (
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.92 }}
                onClick={isPaused ? resumeLiveTimer : pauseLiveTimer}
                className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-colors cursor-pointer"
                title={isPaused ? 'Resume' : 'Pause'}
              >
                {isPaused ? (
                  <Play className="w-3 h-3 text-white/70" strokeWidth={2.5} />
                ) : (
                  <Pause className="w-3 h-3 text-white/70" strokeWidth={2.5} />
                )}
              </motion.button>
            )}

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={isBreak ? endBreakLiveTimer : breakLiveTimer}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors cursor-pointer"
              style={{
                background: isBreak
                  ? 'rgba(48, 209, 88, 0.15)'
                  : 'rgba(255,255,255,0.06)',
                border: isBreak
                  ? '1px solid rgba(48, 209, 88, 0.3)'
                  : '1px solid rgba(255,255,255,0.08)',
              }}
              title={isBreak ? 'End break' : 'Take a break'}
            >
              <Coffee
                className="w-3 h-3"
                style={{ color: isBreak ? '#30d158' : 'rgba(255,255,255,0.7)' }}
                strokeWidth={2.5}
              />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.92 }}
              onClick={handleStop}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/[0.06] hover:bg-red-500/20 border border-white/[0.08] hover:border-red-500/30 transition-colors cursor-pointer"
              title="Stop session"
            >
              <Square
                className="w-3 h-3 text-white/50 hover:text-red-400"
                strokeWidth={2.5}
                fill="currentColor"
              />
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-end overflow-hidden dark">
      <motion.div
        layout
        initial={false}
        animate={windowState === 'options' ? 'options' : 'collapsed'}
        variants={{
          collapsed: { width: 56 },
          options: { width: 240 },
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="dock-strip h-full flex flex-col overflow-hidden rounded-l-2xl flex-shrink-0"
      >
        <AnimatePresence mode="wait">
          {windowState === 'collapsed' ? (
            <motion.button
              key="collapsed"
              type="button"
              onClick={() => setWindowState('options')}
              className="w-full h-full min-h-[56px] flex items-center justify-center cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.02] transition-colors rounded-l-2xl"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Open quick panel"
            >
              <Play className="h-5 w-5 text-primary" strokeWidth={2.5} />
            </motion.button>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden py-2.5 px-2.5"
              style={{ scrollbarWidth: 'none' }}
            >
              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Clock className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                    Today
                  </span>
                </div>
                <div className="glass-surface rounded-xl px-2.5 py-2 flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-white/90">
                    {todayMinutes}m
                  </span>
                  <span className="text-[10px] text-white/30">focus</span>
                </div>
              </div>

              {recentTaskNames.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                      Recent
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentTaskNames.map((name) => (
                      <motion.button
                        key={name}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickStart(name)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left bg-transparent border-0 cursor-pointer hover:bg-white/[0.06] transition-all group"
                      >
                        <PlayCircle className="w-3 h-3 text-primary/50 group-hover:text-primary flex-shrink-0 transition-colors" />
                        <span className="text-[11px] text-white/60 group-hover:text-white/90 truncate transition-colors">
                          {name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {activeTasks.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ListTodo className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                      Tasks
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {activeTasks.map((task) => (
                      <motion.button
                        key={task.id}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickStart(task.name, task.goalId)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left bg-transparent border-0 cursor-pointer hover:bg-white/[0.06] transition-all group"
                      >
                        <PlayCircle className="w-3 h-3 text-primary/50 group-hover:text-primary flex-shrink-0 transition-colors" />
                        <span className="text-[11px] text-white/60 group-hover:text-white/90 truncate transition-colors">
                          {task.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {recentGoals.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Target className="w-3 h-3 text-white/30" />
                    <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                      Goals
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {recentGoals.map((goal) => (
                      <motion.button
                        key={goal.id}
                        whileHover={{ x: 2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleQuickStart(goal.name, goal.id)}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left bg-transparent border-0 cursor-pointer hover:bg-white/[0.06] transition-all group"
                      >
                        <Target className="w-3 h-3 text-primary/50 group-hover:text-primary flex-shrink-0 transition-colors" />
                        <span className="text-[11px] text-white/60 group-hover:text-white/90 truncate transition-colors">
                          {goal.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3 h-3 text-white/30" />
                  <span className="text-[9px] uppercase tracking-widest text-white/30 font-semibold">
                    Quick start
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={quickTaskInput}
                    onChange={(e) => setQuickTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && quickTaskInput.trim()) {
                        handleQuickStart(
                          quickTaskInput,
                          selectedGoalId || undefined,
                        );
                      }
                    }}
                    placeholder="Task name..."
                    className="flex-1 min-w-0 bg-white/[0.05] border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 placeholder:text-white/20 outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all"
                  />
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={() =>
                      quickTaskInput.trim() &&
                      handleQuickStart(
                        quickTaskInput,
                        selectedGoalId || undefined,
                      )
                    }
                    disabled={!quickTaskInput.trim()}
                    className="w-7 h-7 rounded-lg flex items-center justify-center bg-primary/80 hover:bg-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer flex-shrink-0 border-0"
                  >
                    <Play className="w-3 h-3 text-white" strokeWidth={2.5} />
                  </motion.button>
                </div>
              </div>

              <div className="h-px bg-white/[0.06] mx-1 mb-2" />

              <div className="flex flex-col gap-0.5">
                {NAV_OPTIONS.map(({ route, label, icon: Icon }) => (
                  <motion.button
                    key={route}
                    whileHover={{ x: 3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openSecondary(route)}
                    className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left bg-transparent border-0 cursor-pointer hover:bg-white/[0.05] transition-all"
                  >
                    <Icon className="h-3.5 w-3.5 flex-shrink-0 text-primary/60" />
                    <span className="text-[11px] font-medium text-white/40 truncate">
                      {label}
                    </span>
                  </motion.button>
                ))}
              </div>

              <motion.button
                whileHover={{ y: -1, scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setWindowState('collapsed')}
                className="mt-2 h-6 w-7 self-center rounded-full border border-white/[0.07] bg-white/[0.02] text-white/25 hover:text-white/60 hover:bg-white/[0.06] transition-all cursor-pointer flex items-center justify-center"
                aria-label="Collapse"
              >
                <ChevronLeft className="h-3 w-3" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
