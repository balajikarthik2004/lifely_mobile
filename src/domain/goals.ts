import { clamp } from '@/lib/format';
import type { Goal } from '@/types';

/**
 * Goal progress prefers an explicit numeric target (e.g. 2L saved of 5L) and
 * falls back to the share of milestones completed.
 */
export function goalProgress(goal: Goal): number {
  if (goal.status === 'COMPLETED') return 100;
  if (typeof goal.targetValue === 'number' && goal.targetValue > 0) {
    return clamp(((goal.currentValue ?? 0) / goal.targetValue) * 100);
  }
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.isCompleted).length;
    return clamp((done / goal.milestones.length) * 100);
  }
  return 0;
}

export function goalProgressLabel(goal: Goal): string {
  if (typeof goal.targetValue === 'number' && goal.targetValue > 0) {
    const unit = goal.unit ? ` ${goal.unit}` : '';
    const current = (goal.currentValue ?? 0).toLocaleString('en-US');
    return `${current}${unit} / ${goal.targetValue.toLocaleString('en-US')}${unit}`;
  }
  if (goal.milestones.length > 0) {
    const done = goal.milestones.filter((m) => m.isCompleted).length;
    return `${done}/${goal.milestones.length} milestones`;
  }
  return 'No target set';
}

export function averageGoalProgress(goals: Goal[]): number {
  const relevant = goals.filter((g) => g.status === 'ACTIVE' || g.status === 'COMPLETED');
  if (relevant.length === 0) return 0;
  return relevant.reduce((sum, g) => sum + goalProgress(g), 0) / relevant.length;
}
