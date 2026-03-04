export type Urgency =
  | 'overdue'
  | 'today'
  | 'tomorrow'
  | 'soon'
  | 'later'
  | 'none';

export function getUrgency(dueDate?: number): Urgency {
  if (!dueDate) return 'none';
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayEnd = new Date(today);
  todayEnd.setHours(23, 59, 59, 999);

  const tomorrowEnd = new Date(today);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const soonEnd = new Date(today);
  soonEnd.setDate(soonEnd.getDate() + 3);

  if (dueDate < today.getTime()) return 'overdue';
  if (dueDate <= todayEnd.getTime()) return 'today';
  if (dueDate <= tomorrowEnd.getTime()) return 'tomorrow';
  if (dueDate <= soonEnd.getTime()) return 'soon';
  return 'later';
}

export function formatDueDate(dueDate?: number): string {
  if (!dueDate) return '';
  const urgency = getUrgency(dueDate);
  if (urgency === 'overdue') {
    const days = Math.ceil((Date.now() - dueDate) / (1000 * 60 * 60 * 24));
    return days === 1 ? 'Yesterday' : `${days}d overdue`;
  }
  if (urgency === 'today') return 'Today';
  if (urgency === 'tomorrow') return 'Tomorrow';
  const date = new Date(dueDate);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function urgencyColor(urgency: Urgency): string {
  switch (urgency) {
    case 'overdue':
      return '#ff453a';
    case 'today':
      return '#ff9f0a';
    case 'tomorrow':
      return '#ffd60a';
    case 'soon':
      return '#30d158';
    default:
      return 'rgba(255,255,255,0.3)';
  }
}

export function sortByUrgency<
  T extends { dueDate?: number; completedAt?: number },
>(tasks: T[]): T[] {
  const urgencyOrder: Record<Urgency, number> = {
    overdue: 0,
    today: 1,
    tomorrow: 2,
    soon: 3,
    later: 4,
    none: 5,
  };

  return [...tasks].sort((a, b) => {
    if (a.completedAt && !b.completedAt) return 1;
    if (!a.completedAt && b.completedAt) return -1;
    const ua = urgencyOrder[getUrgency(a.dueDate)];
    const ub = urgencyOrder[getUrgency(b.dueDate)];
    return ua - ub;
  });
}
