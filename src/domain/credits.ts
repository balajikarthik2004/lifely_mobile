/**
 * Credit engine (spec §18).
 *
 * Every credit change in the app funnels through `buildTransaction`. Screens
 * never mutate a balance directly — they dispatch a store action which calls
 * into here, so the ledger and the balance can never drift apart.
 */
import { createId } from '@/lib/id';
import type { CreditRules, CreditTransaction, CreditType, Priority } from '@/types';

export const DEFAULT_CREDIT_RULES: CreditRules = {
  taskLow: 5,
  taskMedium: 5,
  taskHigh: 10,
  taskCritical: 15,
  focusPer30Min: 5,
  reflection: 5,
  streakBonusPerWeek: 2,
  missedCriticalHabit: -5,
};

export function creditsForPriority(priority: Priority, rules: CreditRules): number {
  switch (priority) {
    case 'LOW':
      return rules.taskLow;
    case 'MEDIUM':
      return rules.taskMedium;
    case 'HIGH':
      return rules.taskHigh;
    case 'CRITICAL':
      return rules.taskCritical;
  }
}

/** 30 focused minutes = base rate; 60+ minutes of deep work earns a bonus tier. */
export function creditsForFocus(minutes: number, rules: CreditRules): number {
  if (minutes < 10) return 0;
  const blocks = Math.floor(minutes / 30);
  const base = blocks * rules.focusPer30Min;
  const deepWorkBonus = minutes >= 60 ? rules.focusPer30Min : 0;
  return Math.max(rules.focusPer30Min, base + deepWorkBonus);
}

/** Streak bonus, capped so long streaks do not inflate credits indefinitely. */
export function streakBonus(streak: number, rules: CreditRules): number {
  if (streak < 7) return 0;
  const weeks = Math.floor(streak / 7);
  return Math.min(10, weeks * rules.streakBonusPerWeek);
}

export interface TransactionInput {
  amount: number;
  type: CreditType;
  description: string;
  sourceId?: string;
  createdAt?: string;
}

export function buildTransaction(input: TransactionInput): CreditTransaction {
  return {
    id: createId('ctx'),
    amount: Math.round(input.amount),
    type: input.type,
    description: input.description,
    sourceId: input.sourceId,
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

export function sumTransactions(transactions: CreditTransaction[]): number {
  return transactions.reduce((total, t) => total + t.amount, 0);
}

export function transactionsOn(transactions: CreditTransaction[], dateKey: string): CreditTransaction[] {
  return transactions.filter((t) => t.createdAt.slice(0, 10) === dateKey);
}

export function transactionsWithin(
  transactions: CreditTransaction[],
  dateKeys: string[],
): CreditTransaction[] {
  const set = new Set(dateKeys);
  return transactions.filter((t) => set.has(t.createdAt.slice(0, 10)));
}
