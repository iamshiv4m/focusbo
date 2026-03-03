import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Target, Plus, Pencil, Trash2, Play } from 'lucide-react';
import { useStore } from '../store/useStore';
import type { Goal } from '../../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatMinutes(mins: number) {
  if (mins < 1) return '0m';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function GoalsScreen() {
  const {
    state,
    addGoal,
    updateGoal,
    deleteGoal,
    setCurrentTaskName,
    setCurrentFocusGoalId,
  } = useStore();
  const [newGoalName, setNewGoalName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const goals = state?.goals ?? [];
  const tasks = state?.tasks ?? [];
  const sessions = state?.sessions ?? [];

  // Compute stats per goal: linked tasks and total focus time
  const goalStats = useMemo(() => {
    const stats: Record<string, { taskCount: number; focusMinutes: number }> =
      {};
    for (const goal of goals) {
      const linkedTasks = tasks.filter((t) => t.goalId === goal.id);
      const focusSessions = sessions.filter(
        (s) => s.goalId === goal.id && s.type === 'focus',
      );
      const focusMinutes = focusSessions.reduce(
        (sum, s) => sum + s.duration / 60,
        0,
      );
      stats[goal.id] = { taskCount: linkedTasks.length, focusMinutes };
    }
    return stats;
  }, [goals, tasks, sessions]);

  const handleAdd = () => {
    const name = newGoalName.trim();
    if (!name) return;
    addGoal({
      id: generateId(),
      name,
      createdAt: Date.now(),
    });
    setNewGoalName('');
  };

  const handleStartEdit = (goal: Goal) => {
    setEditingId(goal.id);
    setEditName(goal.name);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    const name = editName.trim();
    if (!name) return;
    updateGoal(editingId, { name });
    setEditingId(null);
    setEditName('');
  };

  const handleUseAsTask = (goal: Goal) => {
    setCurrentTaskName(goal.name);
    setCurrentFocusGoalId(goal.id);
  };

  const daysAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Header */}
      <div className="px-1">
        <h2 className="text-base font-semibold tracking-tight m-0">Goals</h2>
        <p className="text-xs text-muted-foreground m-0 mt-0.5">
          Define high-level goals to guide your focus sessions.
        </p>
      </div>

      {/* Add input */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Input
            className="flex-1 rounded-xl h-10 pl-9 placeholder:text-muted-foreground/50"
            placeholder="What do you want to achieve?"
            value={newGoalName}
            onChange={(e) => setNewGoalName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          />
          <Target className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
        </div>
        <Button
          onClick={handleAdd}
          disabled={!newGoalName.trim()}
          size="icon"
          className="btn-pill h-10 w-10 shrink-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Goals list */}
      {goals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <Target className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground m-0">No goals yet</p>
          <p className="text-xs text-muted-foreground/60 m-0 mt-1">
            Add a goal to start organizing your focus sessions
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {goals.map((goal) => {
            const stats = goalStats[goal.id] ?? {
              taskCount: 0,
              focusMinutes: 0,
            };
            const isEditing = editingId === goal.id;

            return (
              <div
                key={goal.id}
                className="group stagger-item glass-surface rounded-xl hover:bg-white/[0.07] dark:hover:bg-white/[0.07] transition-all duration-200"
              >
                {isEditing ? (
                  <div className="flex gap-2 p-3">
                    <Input
                      className="flex-1 h-8 rounded-lg text-sm"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveEdit();
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                    />
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      className="btn-pill h-8 px-4 text-xs"
                    >
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      className="h-8 px-2 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="p-3.5">
                    {/* Top row: name + actions */}
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Target className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium m-0 leading-snug truncate">
                          {goal.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-muted-foreground/60">
                            {daysAgo(goal.createdAt)}
                          </span>
                          {stats.taskCount > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {stats.taskCount} task
                              {stats.taskCount !== 1 ? 's' : ''}
                            </Badge>
                          )}
                          {stats.focusMinutes > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {formatMinutes(stats.focusMinutes)} focused
                            </Badge>
                          )}
                        </div>
                      </div>
                      {/* Actions — visible on hover */}
                      <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to="/"
                          onClick={() => handleUseAsTask(goal)}
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
                          title="Focus on this"
                        >
                          <Play className="h-3 w-3" />
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStartEdit(goal)}
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteGoal(goal.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {goals.length > 0 && (
        <p className="text-[11px] text-muted-foreground/50 text-center m-0 mt-1">
          {goals.length} goal{goals.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
