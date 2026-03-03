import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Clock, Flame, Monitor, Target, TrendingUp, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useStore } from '../store/useStore';
import { computeStreak } from '../lib/streak';
import type { AppUsageEntry } from '../../types';

function getDateKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateRange(days: number) {
  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);
    day.setDate(day.getDate() - i);
    dates.push(getDateKey(day.getTime()));
  }
  return dates;
}

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatMinutes(mins: number) {
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function timeAgo(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  return `${days}d ago`;
}

type Range = '7d' | '30d';

export default function ProgressScreen() {
  const { state, getAppUsageData } = useStore();
  const [range, setRange] = useState<Range>('7d');
  const [appUsage, setAppUsage] = useState<AppUsageEntry[]>([]);
  const sessions = useMemo(() => state?.sessions ?? [], [state?.sessions]);
  const dailyGoalMinutes = state?.userPrefs?.dailyFocusGoalMinutes ?? 120;
  const trackAppUsage = state?.userPrefs?.trackAppUsage ?? true;

  // Fetch app usage data
  useEffect(() => {
    if (trackAppUsage) {
      getAppUsageData().then(setAppUsage);
    }
  }, [getAppUsageData, trackAppUsage, state?.sessions]);

  const rangeDays = range === '7d' ? 7 : 30;
  const rangeLabel = range === '7d' ? '7 days' : '30 days';

  // Today's stats
  const todayKey = getDateKey(Date.now());
  const todayStats = useMemo(() => {
    const todaySessions = sessions.filter(
      (s) => getDateKey(s.startTime) === todayKey,
    );
    const focusSeconds = todaySessions
      .filter((s) => s.type === 'focus')
      .reduce((sum, s) => sum + s.duration, 0);
    const focusCount = todaySessions.filter((s) => s.type === 'focus').length;
    return { focusMinutes: focusSeconds / 60, focusCount };
  }, [sessions, todayKey]);

  const dailyGoalProgress =
    dailyGoalMinutes > 0
      ? Math.min(1, todayStats.focusMinutes / dailyGoalMinutes)
      : 0;

  // Range-filtered data
  const rangeDates = useMemo(() => getDateRange(rangeDays), [rangeDays]);
  const rangeCutoff = useMemo(
    () => new Date(`${rangeDates[0]}T00:00:00`).getTime(),
    [rangeDates],
  );
  const rangeSessions = useMemo(
    () => sessions.filter((s) => s.startTime >= rangeCutoff),
    [sessions, rangeCutoff],
  );

  const chartData = useMemo(() => {
    const byDate: Record<string, { focus: number; break: number }> = {};
    rangeSessions.forEach((s) => {
      const key = getDateKey(s.startTime);
      if (!byDate[key]) byDate[key] = { focus: 0, break: 0 };
      if (s.type === 'focus') byDate[key].focus += s.duration;
      else byDate[key].break += s.duration;
    });

    return rangeDates.map((date) => {
      const data = byDate[date] ?? { focus: 0, break: 0 };
      const d = new Date(`${date}T00:00:00`);
      return {
        date,
        day:
          rangeDays <= 7
            ? d.toLocaleDateString(undefined, { weekday: 'short' })
            : `${d.getMonth() + 1}/${d.getDate()}`,
        focus: Math.round(data.focus / 60),
        break: Math.round(data.break / 60),
      };
    });
  }, [rangeSessions, rangeDates, rangeDays]);

  const rangeFocusSessions = useMemo(
    () => rangeSessions.filter((s) => s.type === 'focus'),
    [rangeSessions],
  );

  const totalFocusMins = useMemo(
    () => rangeFocusSessions.reduce((sum, s) => sum + s.duration / 60, 0),
    [rangeFocusSessions],
  );

  const totalBreakMins = useMemo(
    () =>
      rangeSessions
        .filter((s) => s.type === 'break')
        .reduce((sum, s) => sum + s.duration / 60, 0),
    [rangeSessions],
  );

  const streak = useMemo(() => computeStreak(sessions), [sessions]);

  const completedCount = useMemo(
    () => rangeFocusSessions.filter((s) => s.completed !== false).length,
    [rangeFocusSessions],
  );
  const adherence =
    rangeFocusSessions.length > 0
      ? Math.round((completedCount / rangeFocusSessions.length) * 100)
      : 0;

  const avgDailyMins = totalFocusMins / rangeDays;

  // Time by task — horizontal bars
  const timeByTask = useMemo(() => {
    const byKey: Record<string, { name: string; duration: number }> = {};
    rangeFocusSessions.forEach((s) => {
      const name = s.taskName?.trim() || 'Unnamed';
      if (!byKey[name]) byKey[name] = { name, duration: 0 };
      byKey[name].duration += s.duration;
    });
    return Object.values(byKey)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 8);
  }, [rangeFocusSessions]);

  const maxTaskDuration = timeByTask[0]?.duration ?? 1;

  // App usage — aggregate by app name for current range
  const appUsageByApp = useMemo(() => {
    if (!appUsage.length) return [];
    const rangeUsage = appUsage.filter((e) => e.startTime >= rangeCutoff);
    const byApp: Record<string, { name: string; duration: number }> = {};
    rangeUsage.forEach((e) => {
      if (!byApp[e.appName])
        byApp[e.appName] = { name: e.appName, duration: 0 };
      byApp[e.appName].duration += e.duration;
    });
    return Object.values(byApp)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10);
  }, [appUsage, rangeCutoff]);

  const maxAppDuration = appUsageByApp[0]?.duration ?? 1;
  const totalAppSeconds = appUsageByApp.reduce((s, a) => s + a.duration, 0);

  const recentSessions = useMemo(
    () => [...sessions].sort((a, b) => b.startTime - a.startTime).slice(0, 12),
    [sessions],
  );

  // Custom tooltip component
  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      dataKey: string;
      payload: { date: string };
    }>;
    label?: string;
  }) => {
    if (!active || !payload?.length) return null;
    const date = payload[0]?.payload?.date;
    const dateStr = date
      ? new Date(`${date}T00:00:00`).toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : label;
    return (
      <div className="chart-tooltip">
        <p className="text-xs font-medium text-foreground m-0 mb-1">
          {dateStr}
        </p>
        {payload.map((entry) => (
          <p
            key={entry.dataKey}
            className="text-[11px] text-muted-foreground m-0"
          >
            <span
              className="inline-block w-2 h-2 rounded-full mr-1.5"
              style={{
                background:
                  entry.dataKey === 'focus'
                    ? 'var(--primary)'
                    : 'var(--muted-foreground)',
              }}
            />
            {entry.dataKey === 'focus' ? 'Focus' : 'Break'}: {entry.value}m
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Header + Range toggle */}
      <div className="px-1 flex items-start justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight m-0">
            Progress
          </h2>
          <p className="text-xs text-muted-foreground m-0 mt-0.5">
            Track your focus, consistency, and trends.
          </p>
        </div>
        <div className="flex gap-1 glass-surface rounded-lg p-0.5">
          {(['7d', '30d'] as const).map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setRange(r)}
              className={`h-6 px-2.5 text-[11px] rounded-md ${
                range === r ? '' : 'text-muted-foreground'
              }`}
            >
              {r === '7d' ? '7D' : '30D'}
            </Button>
          ))}
        </div>
      </div>

      {/* Today's progress card */}
      <div className="glass-surface rounded-xl p-4">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] font-medium m-0">Today</p>
              <p className="text-[11px] text-muted-foreground m-0">
                {Math.round(todayStats.focusMinutes)}m focused ·{' '}
                {todayStats.focusCount} session
                {todayStats.focusCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-foreground/80">
            {Math.round(dailyGoalProgress * 100)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${dailyGoalProgress * 100}%`,
              background:
                dailyGoalProgress >= 1
                  ? 'linear-gradient(90deg, #30d158, #34c759)'
                  : 'linear-gradient(90deg, var(--primary), #5e5ce6)',
            }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground/50 m-0 mt-1.5">
          Goal: {formatMinutes(dailyGoalMinutes)} per day
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2">
        {[
          {
            icon: Clock,
            label: 'Focus time',
            value: formatMinutes(totalFocusMins),
            sublabel: rangeLabel,
          },
          {
            icon: Target,
            label: 'Sessions',
            value: String(rangeFocusSessions.length),
            sublabel: `${completedCount} completed`,
          },
          {
            icon: Flame,
            label: 'Streak',
            value: `${streak}d`,
            sublabel: streak > 0 ? 'Keep it up' : 'Start today',
          },
          {
            icon: TrendingUp,
            label: 'Completion',
            value: `${adherence}%`,
            sublabel: `~${formatMinutes(avgDailyMins)}/day avg`,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="stagger-item glass-surface rounded-xl p-3.5 transition-all"
          >
            <div className="flex items-center gap-1.5 mb-2">
              <stat.icon className="h-3 w-3 text-muted-foreground/60" />
              <span className="text-[11px] text-muted-foreground uppercase tracking-wider font-medium">
                {stat.label}
              </span>
            </div>
            <p className="text-xl font-bold text-primary tabular-nums m-0 leading-none">
              {stat.value}
            </p>
            <p className="text-[10px] text-muted-foreground/50 m-0 mt-1">
              {stat.sublabel}
            </p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="glass-surface rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] font-medium">Activity</span>
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'var(--primary)' }}
              />
              Focus {formatMinutes(totalFocusMins)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: 'var(--muted-foreground)' }}
              />
              Break {formatMinutes(totalBreakMins)}
            </span>
          </div>
        </div>
        <div className="w-full h-[200px]">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} barGap={1}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="chart-grid"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                className="chart-axis"
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                interval={rangeDays > 7 ? 4 : 0}
              />
              <YAxis
                className="chart-axis"
                tickFormatter={(v) => `${v}m`}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={36}
              />
              <Tooltip content={<CustomTooltip />} cursor={false} />
              <Bar
                dataKey="focus"
                fill="var(--primary)"
                radius={[4, 4, 0, 0]}
                maxBarSize={rangeDays > 7 ? 12 : 24}
              />
              <Bar
                dataKey="break"
                fill="var(--muted-foreground)"
                radius={[4, 4, 0, 0]}
                opacity={0.4}
                maxBarSize={rangeDays > 7 ? 12 : 24}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time by task — horizontal bars */}
      {timeByTask.length > 0 && (
        <div className="glass-surface rounded-xl p-4">
          <span className="text-[13px] font-medium block mb-3">
            Time by task
          </span>
          <div className="space-y-2.5">
            {timeByTask.map(({ name, duration }) => {
              const pct = (duration / maxTaskDuration) * 100;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {name}
                    </span>
                    <span className="text-[11px] text-primary font-medium tabular-nums shrink-0 ml-2">
                      {formatDuration(duration)}
                    </span>
                  </div>
                  <div className="stat-bar">
                    <div
                      className="stat-bar-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* App Usage — horizontal bars */}
      {trackAppUsage && appUsageByApp.length > 0 && (
        <div className="glass-surface rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground/60" />
              <span className="text-[13px] font-medium">App usage</span>
            </div>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              {formatDuration(totalAppSeconds)} tracked
            </span>
          </div>
          <div className="space-y-2.5">
            {appUsageByApp.map(({ name, duration }) => {
              const pct = (duration / maxAppDuration) * 100;
              const share =
                totalAppSeconds > 0
                  ? Math.round((duration / totalAppSeconds) * 100)
                  : 0;
              return (
                <div key={name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4 font-normal"
                      >
                        {share}%
                      </Badge>
                      <span className="text-[11px] text-primary font-medium tabular-nums">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                  <div className="stat-bar">
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${pct}%`,
                        background:
                          'linear-gradient(90deg, #5e5ce6, var(--primary))',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="glass-surface rounded-xl p-4">
          <span className="text-[13px] font-medium block mb-3">
            Recent sessions
          </span>
          <div className="space-y-0">
            {recentSessions.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 py-2.5 border-b border-border/30 last:border-b-0"
              >
                <div
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.type === 'focus' ? 'bg-primary' : 'bg-muted-foreground/50'}`}
                />
                <span className="text-xs font-medium min-w-[52px] tabular-nums">
                  {formatDuration(s.duration)}
                </span>
                <span className="text-xs text-muted-foreground truncate flex-1">
                  {s.taskName || '—'}
                </span>
                {s.type === 'focus' && s.completed === false && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 h-4 text-muted-foreground/60"
                  >
                    Stopped
                  </Badge>
                )}
                <span className="text-[10px] text-muted-foreground/50 shrink-0 tabular-nums">
                  {timeAgo(s.startTime)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <TrendingUp className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground m-0">No sessions yet</p>
          <p className="text-xs text-muted-foreground/60 m-0 mt-1">
            Complete your first focus session to see your progress
          </p>
        </div>
      )}
    </div>
  );
}
