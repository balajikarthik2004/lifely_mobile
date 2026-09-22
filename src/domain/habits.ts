import { subDays, toKey } from '@/lib/date';
import type { Habit, HabitDayState, ISODate } from '@/types';

/** Is the habit scheduled on this calendar day? */
export function isScheduled(habit: Habit, dateKey: ISODate): boolean {
  if (!habit.isActive) return false;
  if (habit.frequency === 'DAILY') return true;
  const weekday = new Date(`${dateKey}T00:00:00`).getDay();
  return habit.days.includes(weekday);
}

export function dayState(habit: Habit, dateKey: ISODate, todayKeyValue: ISODate): HabitDayState {
  if (!isScheduled(habit, dateKey)) return 'NOT_SCHEDULED';
  const logged = habit.log[dateKey];
  if (logged === 'COMPLETED') return 'COMPLETED';
  if (logged === 'SKIPPED') return 'SKIPPED';
  return dateKey < todayKeyValue ? 'MISSED' : 'NOT_SCHEDULED';
}

/**
 * Streak length ending today.
 *
 * Skipped (rest) days and unscheduled days never break a streak (spec section 9) --
 * they are simply stepped over. Today counts only once it is completed, so an
 * unfinished day never shows as a break either.
 */
export function currentStreak(habit: Habit, todayKeyValue: ISODate): number {
  let streak = 0;
  let cursor = new Date(`${todayKeyValue}T00:00:00`);

  for (let i = 0; i < 400; i += 1) {
    const key = toKey(cursor);
    const logged = habit.log[key];

    if (logged === 'COMPLETED') {
      streak += 1;
    } else if (logged === 'SKIPPED' || !isScheduled(habit, key)) {
      // Rest day or not scheduled -- neutral, keep walking back.
    } else if (key === todayKeyValue) {
      // Today is still open; it neither adds to nor breaks the streak.
    } else {
      break;
    }
    cursor = subDays(cursor, 1);
  }
  return streak;
}

export function longestStreak(habit: Habit): number {
  const completed = Object.entries(habit.log)
    .filter(([, v]) => v === 'COMPLETED')
    .map(([k]) => k)
    .sort();
  if (completed.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < completed.length; i += 1) {
    const prev = new Date(`${completed[i - 1]}T00:00:00`);
    const curr = new Date(`${completed[i]}T00:00:00`);
    const gapDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);

    // Allow gaps that contain only skipped / unscheduled days.
    let bridged = gapDays === 1;
    if (!bridged && gapDays > 1 && gapDays <= 7) {
      bridged = true;
      for (let d = 1; d < gapDays; d += 1) {
        const key = toKey(new Date(prev.getTime() + d * 86400000));
        if (habit.log[key] !== 'SKIPPED' && isScheduled(habit, key)) {
          bridged = false;
          break;
        }
      }
    }
    run = bridged ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

export function completionRate(habit: Habit, dateKeys: ISODate[]): number {
  const scheduled = dateKeys.filter((k) => isScheduled(habit, k));
  if (scheduled.length === 0) return 0;
  const done = scheduled.filter((k) => habit.log[k] === 'COMPLETED').length;
  return (done / scheduled.length) * 100;
}

export function scheduledHabits(habits: Habit[], dateKey: ISODate): Habit[] {
  return habits.filter((h) => isScheduled(h, dateKey));
}

export function completedCount(habits: Habit[], dateKey: ISODate): number {
  return scheduledHabits(habits, dateKey).filter((h) => h.log[dateKey] === 'COMPLETED').length;
}
