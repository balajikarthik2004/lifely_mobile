/**
 * Domain models — mirrors the product spec (§19–§24) so the client can be
 * pointed at a real API later without reshaping any screen.
 */

export type ISODate = string; // 'yyyy-MM-dd'
export type ISODateTime = string; // full ISO timestamp

export const CATEGORIES = [
  'WORK',
  'HEALTH',
  'LEARNING',
  'PERSONAL',
  'FAMILY',
  'FINANCE',
  'TRAVEL',
  'OTHER',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
export type Priority = (typeof PRIORITIES)[number];

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type ActivitySource = 'MANUAL' | 'TASK' | 'HABIT' | 'FOCUS' | 'SYSTEM';

export type CreditType =
  | 'TASK_COMPLETION'
  | 'HABIT_COMPLETION'
  | 'FOCUS_SESSION'
  | 'WORKOUT'
  | 'READING'
  | 'LEARNING'
  | 'REFLECTION'
  | 'GOAL_MILESTONE'
  | 'REWARD_REDEMPTION'
  | 'ADJUSTMENT';

export interface Task {
  id: string;
  title: string;
  description?: string;
  category: Category;
  priority: Priority;
  status: TaskStatus;
  dueDate?: ISODate;
  dueTime?: string; // 'HH:mm'
  estimatedMinutes?: number;
  creditValue: number;
  goalId?: string;
  habitId?: string;
  recurrence?: 'NONE' | 'DAILY' | 'WEEKDAYS' | 'WEEKLY';
  completedAt?: ISODateTime;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export type HabitFrequency = 'DAILY' | 'WEEKLY' | 'CUSTOM';
export type HabitDayState = 'COMPLETED' | 'SKIPPED' | 'MISSED' | 'NOT_SCHEDULED';

export interface Habit {
  id: string;
  name: string;
  description?: string;
  icon: string; // emoji
  category: Category;
  frequency: HabitFrequency;
  /** 0 = Sunday … 6 = Saturday. Used when frequency is CUSTOM/WEEKLY. */
  days: number[];
  targetCount: number;
  creditValue: number;
  reminderTime?: string;
  goalId?: string;
  isActive: boolean;
  /** Date-keyed log. Absent day = not yet acted on. */
  log: Record<ISODate, 'COMPLETED' | 'SKIPPED'>;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Milestone {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: ISODateTime;
}

export interface Goal {
  id: string;
  title: string;
  why?: string;
  icon: string;
  category: Category;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  deadline?: ISODate;
  milestones: Milestone[];
  status: 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'ARCHIVED';
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface Activity {
  id: string;
  title: string;
  icon: string;
  category: Category;
  startTime: ISODateTime;
  endTime?: ISODateTime;
  durationMinutes?: number;
  source: ActivitySource;
  sourceId?: string;
  creditsEarned: number;
  mood?: number;
  energy?: number;
  notes?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface CreditTransaction {
  id: string;
  amount: number;
  type: CreditType;
  sourceId?: string;
  description: string;
  createdAt: ISODateTime;
}

export type RewardCategory = 'ENTERTAINMENT' | 'FOOD' | 'SHOPPING' | 'TRAVEL' | 'PERSONAL';

export interface Reward {
  id: string;
  title: string;
  description?: string;
  icon: string;
  creditCost: number;
  category: RewardCategory;
  isActive: boolean;
  redemptions: { id: string; redeemedAt: ISODateTime; cost: number }[];
  createdAt: ISODateTime;
}

export interface Reflection {
  id: string;
  date: ISODate;
  wentWell?: string;
  couldBeBetter?: string;
  learned?: string;
  mood: number; // 1–5
  energy: number; // 1–5
  tomorrow?: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface FocusSession {
  id: string;
  title: string;
  category: Category;
  taskId?: string;
  targetMinutes: number;
  startedAt: ISODateTime;
  endedAt?: ISODateTime;
  completedMinutes: number;
  status: 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABANDONED';
}

export interface DailyRecord {
  date: ISODate;
  lifeScore: number;
  creditsEarned: number;
  tasksCompleted: number;
  tasksTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
  focusMinutes: number;
  productiveMinutes: number;
  mood?: number;
  energy?: number;
}

export interface CreditRules {
  taskLow: number;
  taskMedium: number;
  taskHigh: number;
  taskCritical: number;
  focusPer30Min: number;
  reflection: number;
  streakBonusPerWeek: number;
  missedCriticalHabit: number;
}

export interface LifeScoreWeights {
  tasks: number;
  habits: number;
  goals: number;
  focus: number;
  health: number;
  reflection: number;
}

export interface UserProfile {
  name: string;
  statement: string;
  avatarEmoji: string;
  focusAreas: Category[];
  wakeTime: string;
  workStart: string;
  workEnd: string;
  sleepTime: string;
}

export interface NotificationPrefs {
  morningBrief: boolean;
  habitReminders: boolean;
  focusReminders: boolean;
  eveningReflection: boolean;
  weeklyReview: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: ISODateTime;
  suggestions?: string[];
}
