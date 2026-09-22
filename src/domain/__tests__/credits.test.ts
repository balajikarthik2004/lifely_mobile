import {
  buildTransaction,
  creditsForFocus,
  creditsForPriority,
  DEFAULT_CREDIT_RULES,
  streakBonus,
  sumTransactions,
  transactionsOn,
} from '../credits';

const rules = DEFAULT_CREDIT_RULES;

describe('creditsForPriority', () => {
  it('scales with priority', () => {
    expect(creditsForPriority('LOW', rules)).toBe(5);
    expect(creditsForPriority('MEDIUM', rules)).toBe(5);
    expect(creditsForPriority('HIGH', rules)).toBe(10);
    expect(creditsForPriority('CRITICAL', rules)).toBe(15);
  });
});

describe('creditsForFocus', () => {
  it('awards nothing for a session too short to count', () => {
    expect(creditsForFocus(0, rules)).toBe(0);
    expect(creditsForFocus(9, rules)).toBe(0);
  });

  it('awards the base rate for a partial block over the minimum', () => {
    expect(creditsForFocus(10, rules)).toBe(5);
    expect(creditsForFocus(29, rules)).toBe(5);
  });

  it('awards one block at 30 minutes', () => {
    expect(creditsForFocus(30, rules)).toBe(5);
  });

  it('adds a deep-work bonus from an hour onward', () => {
    // 2 blocks (10) + deep-work bonus (5)
    expect(creditsForFocus(60, rules)).toBe(15);
    // 3 blocks (15) + bonus (5)
    expect(creditsForFocus(90, rules)).toBe(20);
  });
});

describe('streakBonus', () => {
  it('gives nothing below a full week', () => {
    expect(streakBonus(0, rules)).toBe(0);
    expect(streakBonus(6, rules)).toBe(0);
  });

  it('adds per completed week', () => {
    expect(streakBonus(7, rules)).toBe(2);
    expect(streakBonus(14, rules)).toBe(4);
  });

  it('caps so long streaks cannot inflate credits indefinitely', () => {
    expect(streakBonus(365, rules)).toBe(10);
  });
});

describe('the ledger', () => {
  it('derives a balance by summing transactions, including negatives', () => {
    const ledger = [
      buildTransaction({ amount: 10, type: 'TASK_COMPLETION', description: 'Task' }),
      buildTransaction({ amount: 5, type: 'HABIT_COMPLETION', description: 'Habit' }),
      buildTransaction({ amount: -500, type: 'REWARD_REDEMPTION', description: 'Movie' }),
    ];
    expect(sumTransactions(ledger)).toBe(-485);
  });

  it('rounds amounts so the balance stays an integer', () => {
    const transaction = buildTransaction({ amount: 7.6, type: 'ADJUSTMENT', description: 'x' });
    expect(transaction.amount).toBe(8);
  });

  it('filters to a single day by calendar date, not by time', () => {
    const ledger = [
      buildTransaction({
        amount: 10,
        type: 'TASK_COMPLETION',
        description: 'Early',
        createdAt: '2026-09-21T00:30:00.000Z',
      }),
      buildTransaction({
        amount: 10,
        type: 'TASK_COMPLETION',
        description: 'Late',
        createdAt: '2026-09-21T23:30:00.000Z',
      }),
      buildTransaction({
        amount: 10,
        type: 'TASK_COMPLETION',
        description: 'Next day',
        createdAt: '2026-09-22T01:00:00.000Z',
      }),
    ];
    expect(transactionsOn(ledger, '2026-09-21')).toHaveLength(2);
  });
});
