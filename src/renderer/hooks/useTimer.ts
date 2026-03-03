import { useState, useEffect, useRef, useCallback } from 'react';

export const PRESETS = {
  short: { focus: 15 * 60, break: 5 * 60 },
  pomodoro: { focus: 25 * 60, break: 5 * 60 },
  long: { focus: 45 * 60, break: 10 * 60 },
} as const;

const DEFAULT_FOCUS = 25 * 60;
const DEFAULT_BREAK = 5 * 60;

export type TimerState = 'idle' | 'running' | 'paused' | 'break';

export interface UseTimerOptions {
  focusDuration?: number;
  breakDuration?: number;
  onSessionComplete?: (duration: number, type: 'focus' | 'break') => void;
  onStopEarly?: (elapsed: number, type: 'focus' | 'break') => void;
}

export function useTimer(
  onSessionComplete?: (duration: number, type: 'focus' | 'break') => void,
  onStopEarly?: (elapsed: number, type: 'focus' | 'break') => void,
  options?: { focusDuration?: number; breakDuration?: number },
) {
  const focusDuration = options?.focusDuration ?? DEFAULT_FOCUS;
  const breakDuration = options?.breakDuration ?? DEFAULT_BREAK;

  const [state, setState] = useState<TimerState>('idle');
  const [remaining, setRemaining] = useState(focusDuration);
  const [mode, setMode] = useState<'focus' | 'break'>('focus');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  const getDuration = useCallback(() => {
    return mode === 'focus' ? focusDuration : breakDuration;
  }, [mode, focusDuration, breakDuration]);

  const clearIntervalSafe = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(
    (type: 'focus' | 'break' = 'focus') => {
      clearIntervalSafe();
      setMode(type);
      const duration = type === 'focus' ? focusDuration : breakDuration;
      setRemaining(duration);
      startTimeRef.current = Date.now();
      setState('running');
      intervalRef.current = setInterval(() => {
        setRemaining((prev) => {
          if (prev <= 1) {
            clearIntervalSafe();
            setState('idle');
            onSessionComplete?.(duration, type);
            return duration;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [clearIntervalSafe, onSessionComplete, focusDuration, breakDuration],
  );

  const pause = useCallback(() => {
    if (state !== 'running') return;
    clearIntervalSafe();
    pausedAtRef.current = Date.now();
    setState('paused');
  }, [state, clearIntervalSafe]);

  const resume = useCallback(() => {
    if (state !== 'paused') return;
    setState('running');
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearIntervalSafe();
          setState('idle');
          const duration = getDuration();
          onSessionComplete?.(duration, mode);
          return duration;
        }
        return prev - 1;
      });
    }, 1000);
  }, [state, clearIntervalSafe, getDuration, mode, onSessionComplete]);

  const stop = useCallback(() => {
    const planned = getDuration();
    const elapsed = Math.max(0, planned - remaining);
    if (elapsed > 0) {
      onStopEarly?.(elapsed, mode);
    }
    clearIntervalSafe();
    setState('idle');
    setRemaining(planned);
  }, [clearIntervalSafe, getDuration, remaining, mode, onStopEarly]);

  const startBreak = useCallback(() => {
    stop();
    start('break');
  }, [stop, start]);

  useEffect(() => {
    return () => clearIntervalSafe();
  }, [clearIntervalSafe]);

  useEffect(() => {
    if (state === 'idle') {
      setRemaining(mode === 'focus' ? focusDuration : breakDuration);
    }
  }, [state, mode, focusDuration, breakDuration]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return {
    state,
    remaining,
    mode,
    formatTime,
    start,
    pause,
    resume,
    stop,
    startBreak,
  };
}
