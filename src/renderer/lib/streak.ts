import type { Session } from '../../types';

function getDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Consecutive days with at least one completed focus block, going backward from today.
 */
export function computeStreak(sessions: Session[]): number {
  const completedFocusDates = new Set(
    sessions
      .filter((s) => s.type === 'focus' && s.completed !== false)
      .map((s) => getDateKey(new Date(s.startTime))),
  );
  let streak = 0;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    const key = getDateKey(d);
    if (completedFocusDates.has(key)) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}
