/**
 * Derived reads over the store.
 *
 * Kept as plain functions of state (rather than stored fields) so nothing can
 * ever go stale — the Life Score and every analytic number are recomputed from
 * the cached ledger and logs on every read.
 *
 * Credit totals are the exception. The client caches only a recent window of
 * transactions, so a balance summed from it would quietly go wrong on an old
 * account. Those numbers come from the server's own aggregate instead.
 */
import { useMemo } from 'react';

import { HEALTH_CATEGORIES, PRODUCTIVE_CATEGORIES } from '@/domain/categories';
import { sumTransactions, transactionsOn } from '@/domain/credits';
import { averageGoalProgress } from '@/domain/goals';
import { completedCount, scheduledHabits } from '@/domain/habits';
import { calculateLifeScore, type LifeScoreBreakdown } from '@/domain/lifeScore';
import { currentWeekKeys, lastNDays, todayKey } from '@/lib/date';
import type { Activity, Category, DailyRecord, ISODate, Task } from '@/types';

import { useAppStore, type AppState } from './useAppStore';

/* --------------------------------------------------------------------- */
/* Pure selectors                                                         */
/* --------------------------------------------------------------------- */

export function selectBalance(state: AppState): number {
  return state.creditSummary.balance;
}

export function selectLifetimeEarned(state: AppState): number {
  return state.creditSummary.lifetime;
}

export function activitiesOn(state: AppState, dateKey: ISODate): Activity[] {
  return state.activities
    .filter((a) => a.startTime.slice(0, 10) === dateKey)
    .sort((a, b) => (a.startTime < b.startTime ? -1 : 1));
}

export function tasksFor(state: AppState, dateKey: ISODate): Task[] {
  return state.tasks.filter(
    (t) =>
      t.status !== 'CANCELLED' &&
      (t.dueDate === dateKey || t.completedAt?.slice(0, 10) === dateKey),
  );
}

export function minutesByCategory(activities: Activity[]): Record<Category, number> {
  const totals = {
    WORK: 0,
    HEALTH: 0,
    LEARNING: 0,
    PERSONAL: 0,
    FAMILY: 0,
    FINANCE: 0,
    TRAVEL: 0,
    OTHER: 0,
  } as Record<Category, number>;
  activities.forEach((a) => {
    totals[a.category] += a.durationMinutes ?? 0;
  });
  return totals;
}

export function dailyRecord(state: AppState, dateKey: ISODate): DailyRecord {
  const dayActivities = activitiesOn(state, dateKey);
  const dayTasks = tasksFor(state, dateKey);
  const scheduled = scheduledHabits(state.habits, dateKey);
  const reflection = state.reflections.find((r) => r.date === dateKey);

  const focusMinutes = dayActivities
    .filter((a) => a.source === 'FOCUS')
    .reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);

  const healthMinutes = dayActivities
    .filter((a) => HEALTH_CATEGORIES.includes(a.category))
    .reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);

  const productiveMinutes = dayActivities
    .filter((a) => PRODUCTIVE_CATEGORIES.includes(a.category))
    .reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);

  const tasksCompleted = dayTasks.filter((t) => t.status === 'COMPLETED').length;
  const habitsCompleted = completedCount(state.habits, dateKey);

  const { score } = calculateLifeScore(
    {
      tasksCompleted,
      tasksTotal: dayTasks.length,
      habitsCompleted,
      habitsTotal: scheduled.length,
      goalProgressAvg: averageGoalProgress(state.goals),
      focusMinutes,
      healthMinutes,
      hasReflection: Boolean(reflection),
    },
    state.weights,
  );

  return {
    date: dateKey,
    lifeScore: score,
    creditsEarned: sumTransactions(transactionsOn(state.transactions, dateKey)),
    tasksCompleted,
    tasksTotal: dayTasks.length,
    habitsCompleted,
    habitsTotal: scheduled.length,
    focusMinutes,
    productiveMinutes,
    mood: reflection?.mood,
    energy: reflection?.energy,
  };
}

export function lifeScoreBreakdown(state: AppState, dateKey: ISODate): LifeScoreBreakdown {
  const record = dailyRecord(state, dateKey);
  const dayActivities = activitiesOn(state, dateKey);
  const healthMinutes = dayActivities
    .filter((a) => HEALTH_CATEGORIES.includes(a.category))
    .reduce((sum, a) => sum + (a.durationMinutes ?? 0), 0);

  return calculateLifeScore(
    {
      tasksCompleted: record.tasksCompleted,
      tasksTotal: record.tasksTotal,
      habitsCompleted: record.habitsCompleted,
      habitsTotal: record.habitsTotal,
      goalProgressAvg: averageGoalProgress(state.goals),
      focusMinutes: record.focusMinutes,
      healthMinutes,
      hasReflection: state.reflections.some((r) => r.date === dateKey),
    },
    state.weights,
  );
}

/** Gaps of 45 minutes or more between logged activities (spec section 7). */
export interface TimelineGap {
  afterActivityId: string | null;
  startTime: string;
  endTime: string;
  minutes: number;
}

export function untrackedGaps(activities: Activity[], minMinutes = 45): TimelineGap[] {
  const gaps: TimelineGap[] = [];
  const sorted = [...activities].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));

  for (let i = 0; i < sorted.length - 1; i += 1) {
    const end = sorted[i].endTime ?? sorted[i].startTime;
    const nextStart = sorted[i + 1].startTime;
    const minutes = Math.round((new Date(nextStart).getTime() - new Date(end).getTime()) / 60000);
    if (minutes >= minMinutes) {
      gaps.push({ afterActivityId: sorted[i].id, startTime: end, endTime: nextStart, minutes });
    }
  }
  return gaps;
}

export function currentDayStreak(state: AppState): number {
  const keys = lastNDays(365).reverse();
  let streak = 0;
  for (const key of keys) {
    const hasActivity =
      state.activities.some((a) => a.startTime.slice(0, 10) === key) ||
      state.transactions.some((t) => t.createdAt.slice(0, 10) === key);
    if (hasActivity) streak += 1;
    else if (key !== todayKey()) break;
  }
  return streak;
}

/* --------------------------------------------------------------------- */
/* Hooks                                                                  */
/* --------------------------------------------------------------------- */

export function useBalance(): number {
  return useAppStore((s) => s.creditSummary.balance);
}

export function useToday(): DailyRecord {
  const state = useAppStore();
  const key = todayKey();
  return useMemo(
    () => dailyRecord(state, key),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.habits, state.activities, state.transactions, state.reflections, state.goals, state.weights, key],
  );
}

export function useLifeScore(dateKey: ISODate = todayKey()): LifeScoreBreakdown {
  const state = useAppStore();
  return useMemo(
    () => lifeScoreBreakdown(state, dateKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.habits, state.activities, state.reflections, state.goals, state.weights, dateKey],
  );
}

export function useRecordsForRange(days: number): DailyRecord[] {
  const state = useAppStore();
  return useMemo(
    () => lastNDays(days).map((key) => dailyRecord(state, key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.habits, state.activities, state.transactions, state.reflections, state.goals, state.weights, days],
  );
}

export function useWeekRecords(): DailyRecord[] {
  const state = useAppStore();
  return useMemo(
    () => currentWeekKeys().map((key) => dailyRecord(state, key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.tasks, state.habits, state.activities, state.transactions, state.reflections, state.goals, state.weights],
  );
}

/** Straight from the server's aggregate over the whole ledger. */
export function useCreditsSummary() {
  return useAppStore((s) => s.creditSummary);
}
