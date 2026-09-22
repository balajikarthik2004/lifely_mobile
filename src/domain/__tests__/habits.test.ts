import { completionRate, currentStreak, dayState, isScheduled, longestStreak } from '../habits';
import type { Habit } from '@/types';

function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    name: 'Read',
    icon: 'book',
    category: 'LEARNING',
    frequency: 'DAILY',
    days: [0, 1, 2, 3, 4, 5, 6],
    targetCount: 1,
    creditValue: 5,
    isActive: true,
    log: {},
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  };
}

// 2026-09-21 is a Monday.
const MON = '2026-09-21';
const SUN = '2026-09-20';
const SAT = '2026-09-19';
const FRI = '2026-09-18';
const THU = '2026-09-17';

describe('isScheduled', () => {
  it('is true every day for a daily habit', () => {
    expect(isScheduled(makeHabit(), SUN)).toBe(true);
  });

  it('respects chosen weekdays', () => {
    const weekdaysOnly = makeHabit({ frequency: 'CUSTOM', days: [1, 2, 3, 4, 5] });
    expect(isScheduled(weekdaysOnly, MON)).toBe(true);
    expect(isScheduled(weekdaysOnly, SUN)).toBe(false);
  });

  it('is never scheduled while paused', () => {
    expect(isScheduled(makeHabit({ isActive: false }), MON)).toBe(false);
  });
});

describe('currentStreak', () => {
  it('counts consecutive completed days ending today', () => {
    const habit = makeHabit({
      log: { [MON]: 'COMPLETED', [SUN]: 'COMPLETED', [SAT]: 'COMPLETED' },
    });
    expect(currentStreak(habit, MON)).toBe(3);
  });

  it('does not break when today is still open', () => {
    const habit = makeHabit({ log: { [SUN]: 'COMPLETED', [SAT]: 'COMPLETED' } });
    expect(currentStreak(habit, MON)).toBe(2);
  });

  it('steps over a deliberate rest day rather than resetting', () => {
    const habit = makeHabit({
      log: { [MON]: 'COMPLETED', [SUN]: 'SKIPPED', [SAT]: 'COMPLETED', [FRI]: 'COMPLETED' },
    });
    expect(currentStreak(habit, MON)).toBe(3);
  });

  it('steps over days the habit was never scheduled for', () => {
    const weekdaysOnly = makeHabit({
      frequency: 'CUSTOM',
      days: [1, 2, 3, 4, 5],
      log: { [MON]: 'COMPLETED', [FRI]: 'COMPLETED', [THU]: 'COMPLETED' },
    });
    // Saturday and Sunday are not scheduled, so they do not break anything.
    expect(currentStreak(weekdaysOnly, MON)).toBe(3);
  });

  it('breaks on a genuinely missed scheduled day', () => {
    const habit = makeHabit({
      log: { [MON]: 'COMPLETED', [SAT]: 'COMPLETED' }, // Sunday missed
    });
    expect(currentStreak(habit, MON)).toBe(1);
  });

  it('is zero for an untouched habit', () => {
    expect(currentStreak(makeHabit(), MON)).toBe(0);
  });
});

describe('longestStreak', () => {
  it('finds the best run in the history', () => {
    const habit = makeHabit({
      log: {
        '2026-09-01': 'COMPLETED',
        '2026-09-02': 'COMPLETED',
        '2026-09-03': 'COMPLETED',
        '2026-09-04': 'COMPLETED',
        // gap
        '2026-09-10': 'COMPLETED',
        '2026-09-11': 'COMPLETED',
      },
    });
    expect(longestStreak(habit)).toBe(4);
  });

  it('is zero with no completions', () => {
    expect(longestStreak(makeHabit())).toBe(0);
  });
});

describe('dayState', () => {
  it('reports a past scheduled day with no entry as missed', () => {
    expect(dayState(makeHabit(), SUN, MON)).toBe('MISSED');
  });

  it('does not call today missed while it is still open', () => {
    expect(dayState(makeHabit(), MON, MON)).toBe('NOT_SCHEDULED');
  });

  it('distinguishes a rest day from a miss', () => {
    const habit = makeHabit({ log: { [SUN]: 'SKIPPED' } });
    expect(dayState(habit, SUN, MON)).toBe('SKIPPED');
  });
});

describe('completionRate', () => {
  it('measures only the days the habit was scheduled', () => {
    const weekdaysOnly = makeHabit({
      frequency: 'CUSTOM',
      days: [1, 2, 3, 4, 5],
      log: { [MON]: 'COMPLETED', [FRI]: 'COMPLETED' },
    });
    // Of MON, FRI, THU only, two of three were kept.
    expect(Math.round(completionRate(weekdaysOnly, [MON, SUN, SAT, FRI, THU]))).toBe(67);
  });

  it('is zero when nothing was scheduled in the window', () => {
    const sundaysOnly = makeHabit({ frequency: 'CUSTOM', days: [0] });
    expect(completionRate(sundaysOnly, [MON, FRI])).toBe(0);
  });
});
