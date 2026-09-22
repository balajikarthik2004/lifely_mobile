import { averageGoalProgress, goalProgress, goalProgressLabel } from '../goals';
import { calculateLifeScore, DEFAULT_WEIGHTS, scoreLabel } from '../lifeScore';
import type { Goal } from '@/types';

const emptyDay = {
  tasksCompleted: 0,
  tasksTotal: 0,
  habitsCompleted: 0,
  habitsTotal: 0,
  goalProgressAvg: 0,
  focusMinutes: 0,
  healthMinutes: 0,
  hasReflection: false,
};

describe('calculateLifeScore', () => {
  it('is zero for a day with nothing recorded', () => {
    expect(calculateLifeScore(emptyDay).score).toBe(0);
  });

  it('is 100 when every component is maxed', () => {
    expect(
      calculateLifeScore({
        tasksCompleted: 6,
        tasksTotal: 6,
        habitsCompleted: 8,
        habitsTotal: 8,
        goalProgressAvg: 100,
        focusMinutes: 600,
        healthMinutes: 120,
        hasReflection: true,
      }).score,
    ).toBe(100);
  });

  it('never exceeds 100 when a component overshoots its target', () => {
    const { score } = calculateLifeScore({
      ...emptyDay,
      focusMinutes: 10000,
      healthMinutes: 10000,
    });
    expect(score).toBeLessThanOrEqual(100);
  });

  it('treats an empty denominator as zero rather than dividing by zero', () => {
    const { components } = calculateLifeScore({ ...emptyDay, tasksTotal: 0, tasksCompleted: 0 });
    const tasks = components.find((c) => c.key === 'tasks');
    expect(tasks?.value).toBe(0);
  });

  it('weights each component as the spec defines', () => {
    // Only the reflection component is satisfied: 10% of the total.
    const { score } = calculateLifeScore({ ...emptyDay, hasReflection: true });
    expect(score).toBe(DEFAULT_WEIGHTS.reflection);
  });

  it('respects custom weights', () => {
    const { score } = calculateLifeScore(
      { ...emptyDay, hasReflection: true },
      { tasks: 0, habits: 0, goals: 0, focus: 0, health: 0, reflection: 50 },
    );
    expect(score).toBe(100);
  });

  it('returns a breakdown that explains the number', () => {
    const { components } = calculateLifeScore({
      ...emptyDay,
      tasksCompleted: 1,
      tasksTotal: 2,
    });
    expect(components).toHaveLength(6);
    expect(components.find((c) => c.key === 'tasks')?.value).toBe(50);
  });
});

describe('scoreLabel', () => {
  it('describes the day without judging the person', () => {
    expect(scoreLabel(95)).toBe('Excellent day');
    expect(scoreLabel(75)).toBe('Strong day');
    expect(scoreLabel(55)).toBe('Steady day');
    expect(scoreLabel(30)).toBe('Slow day');
    expect(scoreLabel(0)).toBe('Just getting started');
  });
});

function makeGoal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'g1',
    title: 'Goal',
    icon: 'target',
    category: 'WORK',
    milestones: [],
    status: 'ACTIVE',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('goalProgress', () => {
  it('prefers an explicit numeric target', () => {
    const goal = makeGoal({ targetValue: 500000, currentValue: 200000, unit: 'INR' });
    expect(goalProgress(goal)).toBe(40);
    expect(goalProgressLabel(goal)).toBe('200,000 INR / 500,000 INR');
  });

  it('falls back to the share of milestones completed', () => {
    const goal = makeGoal({
      milestones: [
        { id: 'm1', title: 'a', isCompleted: true },
        { id: 'm2', title: 'b', isCompleted: true },
        { id: 'm3', title: 'c', isCompleted: false },
        { id: 'm4', title: 'd', isCompleted: false },
      ],
    });
    expect(goalProgress(goal)).toBe(50);
    expect(goalProgressLabel(goal)).toBe('2/4 milestones');
  });

  it('is zero with no target and no milestones', () => {
    expect(goalProgress(makeGoal())).toBe(0);
    expect(goalProgressLabel(makeGoal())).toBe('No target set');
  });

  it('caps at 100 when the target is exceeded', () => {
    expect(goalProgress(makeGoal({ targetValue: 10, currentValue: 25 }))).toBe(100);
  });

  it('is 100 once the goal is marked complete', () => {
    expect(goalProgress(makeGoal({ status: 'COMPLETED' }))).toBe(100);
  });
});

describe('averageGoalProgress', () => {
  it('is zero with no goals, rather than NaN', () => {
    expect(averageGoalProgress([])).toBe(0);
  });

  it('ignores paused and archived goals', () => {
    const goals = [
      makeGoal({ id: 'a', targetValue: 10, currentValue: 10 }),
      makeGoal({ id: 'b', status: 'PAUSED', targetValue: 10, currentValue: 0 }),
    ];
    expect(averageGoalProgress(goals)).toBe(100);
  });
});
