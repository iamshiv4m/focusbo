import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ListTodo,
  Play,
  FileText,
  Trash2,
  Pencil,
  Plus,
  Check,
  Flag,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useStore } from '../store/useStore';
import {
  getUrgency,
  formatDueDate,
  urgencyColor,
  sortByUrgency,
} from '../lib/deadline';
import type { Task, Note, Priority } from '../../types';

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
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

const PRIORITY_ORDER: Priority[] = ['p0', 'p1', 'p2', 'p3', 'none'];
const PRIORITY_CONFIG: Record<
  Priority,
  { label: string; color: string; bg: string }
> = {
  p0: {
    label: 'P0',
    color: 'text-red-400',
    bg: 'bg-red-500/15 text-red-400 border-red-500/20',
  },
  p1: {
    label: 'P1',
    color: 'text-orange-400',
    bg: 'bg-orange-500/15 text-orange-400 border-orange-500/20',
  },
  p2: {
    label: 'P2',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20',
  },
  p3: {
    label: 'P3',
    color: 'text-blue-400',
    bg: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
  },
  none: { label: '', color: 'text-muted-foreground/40', bg: '' },
};

function cyclePriority(current?: Priority): Priority {
  const idx = PRIORITY_ORDER.indexOf(current ?? 'none');
  return PRIORITY_ORDER[(idx + 1) % PRIORITY_ORDER.length];
}

export default function TodosScreen() {
  const { state, addTask, updateTask, deleteTask, setCurrentTaskName } =
    useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoName, setNewTodoName] = useState('');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('none');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskName, setEditingTaskName] = useState('');
  const [editingTaskPriority, setEditingTaskPriority] =
    useState<Priority>('none');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [newNotesByTask, setNewNotesByTask] = useState<Record<string, string>>(
    {},
  );
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteTaskId, setEditingNoteTaskId] = useState<string | null>(
    null,
  );
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const tasks = state?.tasks ?? [];
  const goals = state?.goals ?? [];
  const activeTasks = useMemo(
    () =>
      tasks
        .filter((t) => !t.completedAt)
        .sort((a, b) => {
          const ai = PRIORITY_ORDER.indexOf(a.priority ?? 'none');
          const bi = PRIORITY_ORDER.indexOf(b.priority ?? 'none');
          return ai - bi;
        }),
    [tasks],
  );
  const completedTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.completedAt)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [tasks],
  );
  const sortedActiveTasks = useMemo(
    () => sortByUrgency(activeTasks),
    [activeTasks],
  );
  const overdueCount = activeTasks.filter(
    (t) => getUrgency(t.dueDate) === 'overdue',
  ).length;

  const goalNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const g of goals) map[g.id] = g.name;
    return map;
  }, [goals]);

  const handleAdd = () => {
    const name = newTodoName.trim();
    if (!name) return;
    addTask({
      id: generateId(),
      name,
      notes: [],
      dueDate: newTodoDueDate ? new Date(newTodoDueDate).getTime() : undefined,
      priority: newTodoPriority,
    });
    setNewTodoName('');
    setNewTodoDueDate('');
    setNewTodoPriority('none');
    setShowAddModal(false);
  };

  const handleToggleDone = (task: Task) => {
    updateTask(task.id, {
      completedAt: task.completedAt ? undefined : Date.now(),
    });
  };

  const handleStartEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskName(task.name);
    setEditingTaskPriority(task.priority ?? 'none');
  };

  const handleSaveEditedTask = () => {
    if (!editingTaskId) return;
    const name = editingTaskName.trim();
    if (!name) return;
    updateTask(editingTaskId, { name, priority: editingTaskPriority });
    setEditingTaskId(null);
    setEditingTaskName('');
    setEditingTaskPriority('none');
  };

  const handleCancelEditedTask = () => {
    setEditingTaskId(null);
    setEditingTaskName('');
    setEditingTaskPriority('none');
  };

  const handleAddNote = (taskId: string) => {
    const content = (newNotesByTask[taskId] ?? '').trim();
    if (!content) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const note: Note = {
      id: generateId(),
      content,
      createdAt: Date.now(),
    };
    updateTask(taskId, { notes: [...task.notes, note] });
    setNewNotesByTask((prev) => ({ ...prev, [taskId]: '' }));
  };

  const handleStartEditNote = (taskId: string, note: Note) => {
    setEditingNoteTaskId(taskId);
    setEditingNoteId(note.id);
    setEditingNoteContent(note.content);
  };

  const handleSaveEditedNote = () => {
    if (!editingNoteTaskId || !editingNoteId) return;
    const content = editingNoteContent.trim();
    if (!content) return;
    const task = tasks.find((t) => t.id === editingNoteTaskId);
    if (!task) return;
    const notes = task.notes.map((note) =>
      note.id === editingNoteId ? { ...note, content } : note,
    );
    updateTask(editingNoteTaskId, { notes });
    setEditingNoteTaskId(null);
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleCancelEditedNote = () => {
    setEditingNoteTaskId(null);
    setEditingNoteId(null);
    setEditingNoteContent('');
  };

  const handleDeleteNote = (taskId: string, noteId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    updateTask(taskId, {
      notes: task.notes.filter((note) => note.id !== noteId),
    });
    if (editingNoteTaskId === taskId && editingNoteId === noteId) {
      handleCancelEditedNote();
    }
  };

  const handleUseAsTask = (task: Task) => {
    setCurrentTaskName(task.name);
  };

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {overdueCount > 0 && (
        <div className="w-full px-1 mb-3">
          <div
            className="rounded-xl px-3 py-2 flex items-center gap-2"
            style={{
              background: 'rgba(255, 69, 58, 0.08)',
              border: '1px solid rgba(255, 69, 58, 0.2)',
            }}
          >
            <span className="text-xs font-medium" style={{ color: '#ff453a' }}>
              {overdueCount} overdue task{overdueCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="px-1">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-semibold tracking-tight m-0">Todos</h2>
          {activeTasks.length > 0 && (
            <span className="text-[11px] text-muted-foreground/60">
              {activeTasks.length} task{activeTasks.length !== 1 ? 's' : ''}{' '}
              remaining
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground m-0 mt-0.5">
          Manage tasks, add notes, and pick your next focus.
        </p>
      </div>

      {/* Add trigger */}
      <div className="glass-surface rounded-xl p-2.5">
        <div className="flex justify-center">
          <Button
            onClick={() => setShowAddModal(true)}
            className="btn-pill h-9 px-4 text-xs"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add task
          </Button>
        </div>
      </div>

      {/* Active tasks */}
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
            <ListTodo className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground m-0">No tasks yet</p>
          <p className="text-xs text-muted-foreground/60 m-0 mt-1">
            Add a task to start tracking your work
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sortedActiveTasks.map((task) => {
            const isExpanded = expandedId === task.id;
            const goalName = task.goalId ? goalNameMap[task.goalId] : null;

            return (
              <div
                key={task.id}
                className="group stagger-item glass-surface rounded-xl hover:bg-white/[0.07] dark:hover:bg-white/[0.07] transition-all duration-200"
              >
                <div className="p-3.5">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={false}
                      onCheckedChange={() => handleToggleDone(task)}
                      aria-label="Mark done"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <p className="text-[14px] font-medium m-0 leading-snug break-words truncate">
                          {task.name}
                        </p>
                        {task.dueDate &&
                          (() => {
                            const urgency = getUrgency(task.dueDate);
                            const label = formatDueDate(task.dueDate);
                            const color = urgencyColor(urgency);
                            return (
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                                style={{
                                  color,
                                  background: `${color}18`,
                                  border: `1px solid ${color}30`,
                                }}
                              >
                                {label}
                              </span>
                            );
                          })()}
                      </div>
                      {(goalName ||
                        task.notes.length > 0 ||
                        (task.priority && task.priority !== 'none')) && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {task.priority && task.priority !== 'none' && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 py-0 h-4 font-semibold border ${PRIORITY_CONFIG[task.priority].bg}`}
                            >
                              {PRIORITY_CONFIG[task.priority].label}
                            </Badge>
                          )}
                          {goalName && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {goalName}
                            </Badge>
                          )}
                          {task.notes.length > 0 && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0 h-4"
                            >
                              {task.notes.length} note
                              {task.notes.length !== 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-center opacity-75 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          updateTask(task.id, {
                            priority: cyclePriority(task.priority),
                          })
                        }
                        className={`h-7 w-7 ${
                          task.priority && task.priority !== 'none'
                            ? PRIORITY_CONFIG[task.priority].color
                            : 'text-muted-foreground hover:text-foreground'
                        }`}
                        title={`Priority: ${task.priority && task.priority !== 'none' ? PRIORITY_CONFIG[task.priority].label : 'None'} (click to cycle)`}
                      >
                        <Flag className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUseAsTask(task)}
                        className="h-7 px-2.5 text-[11px]"
                        title="Focus on this"
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Focus
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleStartEditTask(task)}
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Edit task"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : task.id)
                        }
                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                        title="Notes"
                      >
                        <FileText className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteTask(task.id)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Notes section */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-0">
                    <div className="border-t border-border/50 pt-3 space-y-2">
                      {task.notes.map((note) => (
                        <div
                          key={note.id}
                          className="group/note rounded-lg glass-surface p-2.5"
                        >
                          {editingNoteTaskId === task.id &&
                          editingNoteId === note.id ? (
                            <div className="flex gap-2 items-center">
                              <Input
                                className="flex-1 h-7 text-xs rounded-lg"
                                value={editingNoteContent}
                                onChange={(e) =>
                                  setEditingNoteContent(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditedNote();
                                  if (e.key === 'Escape')
                                    handleCancelEditedNote();
                                }}
                                autoFocus
                                aria-label="Edit note"
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={handleSaveEditedNote}
                                className="h-7 w-7 text-primary hover:text-primary"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground/80 m-0 break-words leading-relaxed">
                                  {note.content}
                                </p>
                                <span className="text-[10px] text-muted-foreground/50 mt-0.5 block">
                                  {timeAgo(note.createdAt)}
                                </span>
                              </div>
                              <div className="flex gap-0.5 shrink-0 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleStartEditNote(task.id, note)
                                  }
                                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                >
                                  <Pencil className="h-2.5 w-2.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    handleDeleteNote(task.id, note.id)
                                  }
                                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <Input
                          className="flex-1 h-7 text-xs rounded-lg"
                          placeholder="Add a note..."
                          value={newNotesByTask[task.id] ?? ''}
                          onChange={(e) =>
                            setNewNotesByTask((prev) => ({
                              ...prev,
                              [task.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddNote(task.id);
                          }}
                        />
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleAddNote(task.id)}
                          className="h-7 px-2.5 text-[11px] rounded-lg"
                        >
                          Add
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

      {/* Completed section */}
      {completedTasks.length > 0 && (
        <Collapsible open={showCompleted} onOpenChange={setShowCompleted}>
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between px-1 py-2 cursor-pointer group">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[11px]">
                  {completedTasks.length} completed
                </Badge>
              </div>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${showCompleted ? 'rotate-180' : ''}`}
              />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="flex flex-col gap-1.5">
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className="group flex items-center gap-3 stagger-item glass-surface rounded-xl px-3.5 py-3 transition-all"
                >
                  <Checkbox
                    checked
                    onCheckedChange={() => handleToggleDone(task)}
                    aria-label="Mark not done"
                  />
                  <span className="flex-1 text-[13px] line-through text-muted-foreground/60 truncate">
                    {task.name}
                  </span>
                  {task.completedAt && (
                    <span className="text-[10px] text-muted-foreground/40 shrink-0">
                      {timeAgo(task.completedAt)}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteTask(task.id)}
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </Button>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm border-0"
            onClick={() => setShowAddModal(false)}
            aria-label="Close add task modal"
          />
          <div className="relative w-full max-w-md glass-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-sm font-semibold">Add task</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAddModal(false)}
                className="h-7 px-2 text-[11px]"
              >
                Close
              </Button>
            </div>

            <div className="space-y-2.5">
              <div className="relative">
                <Input
                  className="h-10 rounded-xl pl-9"
                  placeholder="What needs your focus?"
                  value={newTodoName}
                  onChange={(e) => setNewTodoName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAdd();
                    if (e.key === 'Escape') setShowAddModal(false);
                  }}
                  autoFocus
                />
                <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              </div>

              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="h-9 rounded-xl bg-white/[0.05] border border-white/[0.08] text-xs text-muted-foreground px-2 outline-none focus:border-primary/40 transition-colors cursor-pointer w-full"
                style={{ colorScheme: 'dark' }}
              />

              <div className="flex items-center justify-between">
                <p className="m-0 text-[11px] text-muted-foreground/70">
                  Priority:{' '}
                  {newTodoPriority !== 'none'
                    ? PRIORITY_CONFIG[newTodoPriority].label
                    : 'None'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setNewTodoPriority(cyclePriority(newTodoPriority))
                  }
                  className={`h-8 w-8 rounded-lg border border-transparent ${
                    newTodoPriority !== 'none'
                      ? PRIORITY_CONFIG[newTodoPriority].color
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Cycle priority"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => setShowAddModal(false)}
                  className="h-8 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAdd}
                  disabled={!newTodoName.trim()}
                  className="btn-pill h-8 px-3 text-xs"
                >
                  Add task
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingTaskId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button
            className="absolute inset-0 bg-black/60 backdrop-blur-sm border-0"
            onClick={handleCancelEditedTask}
            aria-label="Close edit task modal"
          />
          <div className="relative w-full max-w-md glass-surface rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="m-0 text-sm font-semibold">Edit task</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelEditedTask}
                className="h-7 px-2 text-[11px]"
              >
                Close
              </Button>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <Input
                  className="h-10 rounded-xl pl-9"
                  placeholder="Task name"
                  value={editingTaskName}
                  onChange={(e) => setEditingTaskName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEditedTask();
                    if (e.key === 'Escape') handleCancelEditedTask();
                  }}
                  autoFocus
                  aria-label="Edit task name"
                />
                <ListTodo className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              </div>

              <div className="flex items-center justify-between">
                <p className="m-0 text-[11px] text-muted-foreground/70">
                  Priority:{' '}
                  {editingTaskPriority !== 'none'
                    ? PRIORITY_CONFIG[editingTaskPriority].label
                    : 'None'}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setEditingTaskPriority(cyclePriority(editingTaskPriority))
                  }
                  className={`h-8 w-8 rounded-lg border border-transparent ${
                    editingTaskPriority !== 'none'
                      ? PRIORITY_CONFIG[editingTaskPriority].color
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Cycle priority"
                >
                  <Flag className="h-3.5 w-3.5" />
                </Button>
              </div>

              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="ghost"
                  onClick={handleCancelEditedTask}
                  className="h-8 px-3 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEditedTask}
                  disabled={!editingTaskName.trim()}
                  className="btn-pill h-8 px-3 text-xs"
                >
                  Save changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
