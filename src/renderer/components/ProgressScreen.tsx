import { useMemo, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import {
  Target,
  TrendingUp,
  Zap,
  Coffee,
  Award,
  Share2,
  Download,
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { generateShareCard } from '../lib/shareCard';

type Period = 'week' | 'lastWeek' | 'allTime';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getWeekRange(weeksAgo = 0) {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - dayOfWeek - weeksAgo * 7);
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return { start: startOfWeek.getTime(), end: endOfWeek.getTime() };
}

export default function ProgressScreen() {
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('week');
  const [sharing, setSharing] = useState(false);
  const [sharePreview, setSharePreview] = useState<string | null>(null);

  const sessions = useMemo(() => state?.sessions ?? [], [state?.sessions]);
  const goals = useMemo(() => state?.goals ?? [], [state?.goals]);

  const periodSessions = useMemo(() => {
    if (period === 'allTime') return sessions.filter((s) => s.type === 'focus');
    const weeksAgo = period === 'lastWeek' ? 1 : 0;
    const { start, end } = getWeekRange(weeksAgo);
    return sessions.filter(
      (s) => s.type === 'focus' && s.startTime >= start && s.startTime <= end,
    );
  }, [sessions, period]);

  const dailyData = useMemo(() => {
    if (period === 'allTime')
      return [] as { day: string; minutes: number; isToday: boolean }[];
    const weeksAgo = period === 'lastWeek' ? 1 : 0;
    const { start } = getWeekRange(weeksAgo);
    return DAY_LABELS.map((day, i) => {
      const dayStart = new Date(start);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayMinutes = sessions
        .filter(
          (s) =>
            s.type === 'focus' &&
            s.startTime >= dayStart.getTime() &&
            s.startTime <= dayEnd.getTime(),
        )
        .reduce((sum, s) => sum + s.duration / 60, 0);
      return {
        day,
        minutes: Math.round(dayMinutes),
        isToday: i === new Date().getDay() && period === 'week',
      };
    });
  }, [sessions, period]);

  const totalMinutes = useMemo(
    () => periodSessions.reduce((sum, s) => sum + s.duration / 60, 0),
    [periodSessions],
  );
  const totalSessions = periodSessions.length;
  const avgSessionMinutes =
    totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;

  const bestDay = useMemo(() => {
    if (!dailyData.length) return null;
    const best = dailyData.reduce((a, b) => (a.minutes > b.minutes ? a : b));
    return best.minutes > 0 ? best : null;
  }, [dailyData]);

  const goalBreakdown = useMemo(() => {
    return goals
      .map((goal) => {
        const goalMinutes = periodSessions
          .filter((s) => s.goalId === goal.id)
          .reduce((sum, s) => sum + s.duration / 60, 0);
        return { goal, minutes: Math.round(goalMinutes) };
      })
      .filter((g) => g.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 5);
  }, [goals, periodSessions]);

  const moodCounts = useMemo(() => {
    const counts = { great: 0, okay: 0, rough: 0, none: 0 };
    periodSessions.forEach((s) => {
      if (s.mood === 'great') counts.great += 1;
      else if (s.mood === 'okay') counts.okay += 1;
      else if (s.mood === 'rough') counts.rough += 1;
      else counts.none += 1;
    });
    return counts;
  }, [periodSessions]);

  const streak = useMemo(() => {
    const focusDays = new Set(
      sessions
        .filter((s) => s.type === 'focus')
        .map((s) => {
          const d = new Date(s.startTime);
          return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        }),
    );

    let count = 0;
    const today = new Date();
    for (let i = 0; i < 365; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (focusDays.has(key)) count += 1;
      else if (i > 0) break;
    }
    return count;
  }, [sessions]);

  const insight = useMemo(() => {
    if (totalMinutes === 0)
      return 'No sessions this period yet. Start your first focus session!';
    if (bestDay && period !== 'allTime')
      return `Your best day was ${bestDay.day} with ${bestDay.minutes} minutes of focus. 🔥`;
    if (moodCounts.great > moodCounts.rough)
      return `${moodCounts.great} great sessions this period. You're in flow! 💪`;
    if (streak >= 7)
      return `${streak}-day streak! Consistency is your superpower. ⚡`;
    return `${Math.round((totalMinutes / 60) * 10) / 10} hours of deep work. Keep building the habit!`;
  }, [totalMinutes, bestDay, period, moodCounts, streak]);

  const tabs: { value: Period; label: string }[] = [
    { value: 'week', label: 'This week' },
    { value: 'lastWeek', label: 'Last week' },
    { value: 'allTime', label: 'All time' },
  ];

  const handleShare = useCallback(async () => {
    setSharing(true);
    try {
      const dataUrl = await generateShareCard({
        totalMinutes: Math.round(totalMinutes),
        totalSessions,
        streak,
        bestDayLabel: bestDay?.day ?? '',
        bestDayMinutes: bestDay?.minutes ?? 0,
        moodGreat: moodCounts.great,
        moodOkay: moodCounts.okay,
        moodRough: moodCounts.rough,
        periodLabel: tabs.find((t) => t.value === period)?.label ?? '',
        dailyData: period !== 'allTime' ? dailyData : [],
      });
      setSharePreview(dataUrl);
    } finally {
      setSharing(false);
    }
  }, [
    totalMinutes,
    totalSessions,
    streak,
    bestDay,
    moodCounts,
    period,
    dailyData,
    tabs,
  ]);

  const handleDownload = useCallback(() => {
    if (!sharePreview) return;
    const a = document.createElement('a');
    a.href = sharePreview;
    a.download = `focusbo-${period}-${Date.now()}.png`;
    a.click();
  }, [sharePreview, period]);

  return (
    <div className="flex flex-col animate-fade-in-up">
      <div className="flex items-center gap-2 mb-5">
        <div className="flex gap-1 bg-white/[0.04] rounded-xl p-1 flex-1">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setPeriod(tab.value)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-0"
              style={{
                background:
                  period === tab.value
                    ? 'rgba(255,255,255,0.08)'
                    : 'transparent',
                color:
                  period === tab.value
                    ? 'var(--foreground)'
                    : 'rgba(255,255,255,0.4)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleShare}
          disabled={sharing || totalSessions === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border-0 cursor-pointer disabled:opacity-30 transition-all"
          style={{
            background: 'rgba(10, 132, 255, 0.1)',
            color: '#0a84ff',
            border: '1px solid rgba(10, 132, 255, 0.2)',
          }}
        >
          <Share2 className="w-3 h-3" />
          {sharing ? 'Generating...' : 'Share'}
        </button>
      </div>

      <div
        className="rounded-xl px-3.5 py-3 mb-4 text-xs text-muted-foreground leading-relaxed"
        style={{
          background: 'rgba(10, 132, 255, 0.07)',
          border: '1px solid rgba(10, 132, 255, 0.15)',
        }}
      >
        {insight}
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          {
            label: 'Focus time',
            value: `${Math.round((totalMinutes / 60) * 10) / 10}h`,
            icon: Zap,
          },
          { label: 'Sessions', value: String(totalSessions), icon: TrendingUp },
          {
            label: 'Avg session',
            value: `${avgSessionMinutes}m`,
            icon: Coffee,
          },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="rounded-xl p-2.5 flex flex-col items-center gap-1"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <Icon className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-base font-semibold text-foreground tabular-nums">
              {value}
            </span>
            <span className="text-[10px] text-muted-foreground/50">
              {label}
            </span>
          </div>
        ))}
      </div>

      {period !== 'allTime' && dailyData.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium mb-2">
            Daily focus (minutes)
          </p>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData} barSize={20}>
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  contentStyle={{
                    background: 'rgba(18,18,24,0.95)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.8)',
                  }}
                  formatter={(value: number | undefined) => [
                    `${value ?? 0}m`,
                    'Focus',
                  ]}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                  {dailyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={
                        entry.isToday
                          ? '#0a84ff'
                          : entry.minutes > 0
                            ? 'rgba(10, 132, 255, 0.4)'
                            : 'rgba(255,255,255,0.06)'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div
          className="rounded-xl p-3 flex items-center gap-2.5"
          style={{
            background: 'rgba(255,159,10,0.07)',
            border: '1px solid rgba(255,159,10,0.15)',
          }}
        >
          <Award
            className="w-4 h-4 flex-shrink-0"
            style={{ color: '#ff9f0a' }}
          />
          <div>
            <p className="text-base font-semibold text-foreground">{streak}d</p>
            <p className="text-[10px] text-muted-foreground/50">streak</p>
          </div>
        </div>

        <div
          className="rounded-xl p-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <p className="text-[10px] text-muted-foreground/50 mb-1.5">
            Session moods
          </p>
          <div className="flex gap-2">
            {moodCounts.great > 0 && (
              <span className="text-xs">😊 {moodCounts.great}</span>
            )}
            {moodCounts.okay > 0 && (
              <span className="text-xs">😐 {moodCounts.okay}</span>
            )}
            {moodCounts.rough > 0 && (
              <span className="text-xs">😔 {moodCounts.rough}</span>
            )}
            {moodCounts.great + moodCounts.okay + moodCounts.rough === 0 && (
              <span className="text-xs text-muted-foreground/30">No data</span>
            )}
          </div>
        </div>
      </div>

      {goalBreakdown.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground/40 font-medium mb-2">
            Time by goal
          </p>
          <div className="flex flex-col gap-1.5">
            {goalBreakdown.map(({ goal, minutes }) => {
              const pct = totalMinutes > 0 ? (minutes / totalMinutes) * 100 : 0;
              return (
                <div key={goal.id} className="flex items-center gap-2.5">
                  <Target className="w-3 h-3 text-primary/50 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground/70 flex-1 truncate">
                    {goal.name}
                  </span>
                  <span className="text-xs font-medium text-foreground tabular-nums">
                    {minutes}m
                  </span>
                  <div className="w-16 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        background: 'linear-gradient(90deg, #0a84ff, #5e5ce6)',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {totalSessions === 0 && (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <TrendingUp className="w-8 h-8 text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground/50">
            No sessions yet for this period.
          </p>
          <p className="text-xs text-muted-foreground/30 mt-1">
            Start a focus session to see your stats here.
          </p>
        </div>
      )}

      {sharePreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
          onClick={() => setSharePreview(null)}
        >
          <div
            className="flex flex-col items-center gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={sharePreview}
              className="rounded-xl max-w-full"
              style={{ maxHeight: '60vh' }}
              alt="Stats card"
            />
            <div className="flex gap-3">
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-primary text-white border-0 cursor-pointer hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                Save image
              </button>
              <button
                onClick={() => setSharePreview(null)}
                className="px-5 py-2.5 rounded-xl text-sm font-medium text-muted-foreground border border-white/[0.08] bg-transparent cursor-pointer hover:bg-white/[0.04] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
