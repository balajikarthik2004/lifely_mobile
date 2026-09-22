/**
 * The API surface, in the shapes the app already speaks.
 *
 * The server wraps some records with computed extras (a habit arrives as
 * `{ habit, currentStreak, ... }`, a goal as `{ goal, progress }`) and names the
 * back-reference on activities and ledger rows `sourceRef`. Those differences
 * are flattened here, once, so no screen and no selector ever has to know about
 * them — everything past this file is `@/types`.
 */
import type {
  Activity,
  CreditRules,
  CreditTransaction,
  FocusSession,
  Goal,
  Habit,
  ISODate,
  LifeScoreWeights,
  NotificationPrefs,
  Reflection,
  Reward,
  Task,
  UserProfile,
} from '@/types';

import { request } from './client';
import { TRANSACTION_PAGE_SIZE } from './config';
import { setTokens, type TokenPair } from './tokens';

/* ------------------------------------------------------------------ */
/* Server envelopes                                                    */
/* ------------------------------------------------------------------ */

interface Items<T> {
  items: T[];
}

interface HabitEnvelope {
  habit: Habit;
  currentStreak: number;
  longestStreak: number;
  scheduledToday: boolean;
  stateToday: 'COMPLETED' | 'SKIPPED' | 'PENDING' | 'NOT_SCHEDULED';
}

interface GoalEnvelope {
  goal: Goal;
  progress: number;
}

interface RewardEnvelope {
  reward: Reward;
  affordable: boolean;
  remaining: number;
}

/** Anything the server links back to its source carries `sourceRef`. */
type WithSourceRef<T> = Omit<T, 'sourceId'> & { sourceRef?: string };

function withSourceId<T extends { sourceId?: string }>(row: WithSourceRef<T>): T {
  const { sourceRef, ...rest } = row;
  return { ...rest, sourceId: sourceRef } as T;
}

/** The server's log is a Mongo Map; JSON gives back a plain object, or nothing. */
function normalizeHabit(habit: Habit): Habit {
  return { ...habit, log: habit.log ?? {} };
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export interface ServerUser {
  id: string;
  email: string;
  profile: UserProfile;
  creditRules: CreditRules;
  weights: LifeScoreWeights;
  notifications: NotificationPrefs;
  onboarded: boolean;
}

interface AuthResponse extends TokenPair {
  expiresIn: string;
  user: ServerUser;
}

export const auth = {
  async register(email: string, password: string, name?: string): Promise<ServerUser> {
    const result = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { email, password, ...(name ? { name } : {}) },
      anonymous: true,
    });
    await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result.user;
  },

  async login(email: string, password: string): Promise<ServerUser> {
    const result = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
      anonymous: true,
    });
    await setTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
    return result.user;
  },

  async logout(refreshToken?: string): Promise<void> {
    try {
      await request<void>('/auth/logout', { method: 'POST', body: { refreshToken } });
    } catch {
      // Signing out locally must always succeed, even if the server cannot be
      // reached to revoke the session.
    }
    await setTokens(null);
  },

  changePassword(currentPassword: string, newPassword: string): Promise<void> {
    return request<void>('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword },
    });
  },
};

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

export interface UserPatch {
  profile?: Partial<UserProfile>;
  creditRules?: Partial<CreditRules>;
  weights?: Partial<LifeScoreWeights>;
  notifications?: Partial<NotificationPrefs>;
  onboarded?: boolean;
}

export const users = {
  me: () => request<ServerUser>('/users/me'),

  update: (patch: UserPatch) => request<ServerUser>('/users/me', { method: 'PATCH', body: patch }),

  /** Replaces the account's history with the demo fortnight. */
  loadDemoData: () => request<void>('/users/me/demo-data', { method: 'POST' }),

  /** Empties the account but keeps the login. */
  reset: () => request<void>('/users/me/reset', { method: 'POST' }),

  deleteAccount: () => request<void>('/users/me', { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ */
/* Tasks                                                               */
/* ------------------------------------------------------------------ */

export interface TaskInput {
  title: string;
  description?: string;
  category?: Task['category'];
  priority?: Task['priority'];
  dueDate?: ISODate;
  dueTime?: string;
  estimatedMinutes?: number;
  creditValue?: number;
  goalId?: string;
  habitId?: string;
  recurrence?: Task['recurrence'];
}

export interface CompletionResult {
  task: Task;
  creditsAwarded: number;
  balance: number;
}

export const tasks = {
  async list(): Promise<Task[]> {
    const { items } = await request<Items<Task>>('/tasks', {
      query: { limit: 200 },
    });
    return items;
  },

  create: (input: TaskInput) => request<Task>('/tasks', { method: 'POST', body: input }),

  update: (id: string, patch: Partial<TaskInput>) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: patch }),

  remove: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),

  complete: (id: string) => request<CompletionResult>(`/tasks/${id}/complete`, { method: 'POST' }),

  uncomplete: (id: string) =>
    request<CompletionResult>(`/tasks/${id}/uncomplete`, { method: 'POST' }),
};

/* ------------------------------------------------------------------ */
/* Habits                                                              */
/* ------------------------------------------------------------------ */

export interface HabitInput {
  name: string;
  description?: string;
  icon?: string;
  category?: Habit['category'];
  frequency?: Habit['frequency'];
  days?: number[];
  targetCount?: number;
  creditValue?: number;
  reminderTime?: string;
  goalId?: string;
  isActive?: boolean;
}

export interface HabitDayResult {
  habit: Habit;
  creditsAwarded: number;
  balance: number;
  streak?: number;
}

function unwrapHabitDay(result: {
  habit: HabitEnvelope;
  creditsAwarded: number;
  balance: number;
}): HabitDayResult {
  return {
    habit: normalizeHabit(result.habit.habit),
    creditsAwarded: result.creditsAwarded,
    balance: result.balance,
    streak: result.habit.currentStreak,
  };
}

export const habits = {
  async list(): Promise<Habit[]> {
    const { items } = await request<Items<HabitEnvelope>>('/habits');
    return items.map((row) => normalizeHabit(row.habit));
  },

  async create(input: HabitInput): Promise<Habit> {
    const row = await request<HabitEnvelope>('/habits', { method: 'POST', body: input });
    return normalizeHabit(row.habit);
  },

  async update(id: string, patch: Partial<HabitInput>): Promise<Habit> {
    const row = await request<HabitEnvelope>(`/habits/${id}`, { method: 'PATCH', body: patch });
    return normalizeHabit(row.habit);
  },

  remove: (id: string) => request<void>(`/habits/${id}`, { method: 'DELETE' }),

  async complete(id: string, date?: ISODate): Promise<HabitDayResult> {
    return unwrapHabitDay(
      await request(`/habits/${id}/complete`, { method: 'POST', body: { date } }),
    );
  },

  async skip(id: string, date?: ISODate): Promise<HabitDayResult> {
    return unwrapHabitDay(await request(`/habits/${id}/skip`, { method: 'POST', body: { date } }));
  },

  async clearDay(id: string, date?: ISODate): Promise<HabitDayResult> {
    return unwrapHabitDay(await request(`/habits/${id}/clear`, { method: 'POST', body: { date } }));
  },
};

/* ------------------------------------------------------------------ */
/* Goals                                                               */
/* ------------------------------------------------------------------ */

export interface GoalInput {
  title: string;
  why?: string;
  icon?: string;
  category?: Goal['category'];
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  deadline?: ISODate;
  milestones?: { title: string }[];
}

export interface MilestoneResult {
  goal: Goal;
  creditsAwarded: number;
  balance: number;
}

export const goals = {
  async list(): Promise<Goal[]> {
    const { items } = await request<Items<GoalEnvelope>>('/goals');
    return items.map((row) => row.goal);
  },

  async create(input: GoalInput): Promise<Goal> {
    const row = await request<GoalEnvelope>('/goals', { method: 'POST', body: input });
    return row.goal;
  },

  async update(
    id: string,
    patch: Partial<Omit<GoalInput, 'milestones'>> & { status?: Goal['status'] },
  ): Promise<Goal> {
    const row = await request<GoalEnvelope>(`/goals/${id}`, { method: 'PATCH', body: patch });
    return row.goal;
  },

  remove: (id: string) => request<void>(`/goals/${id}`, { method: 'DELETE' }),

  async addMilestone(id: string, title: string): Promise<Goal> {
    const row = await request<GoalEnvelope>(`/goals/${id}/milestones`, {
      method: 'POST',
      body: { title },
    });
    return row.goal;
  },

  async setMilestone(
    id: string,
    milestoneId: string,
    isCompleted: boolean,
  ): Promise<MilestoneResult> {
    const row = await request<GoalEnvelope & { creditsAwarded: number; balance: number }>(
      `/goals/${id}/milestones/${milestoneId}`,
      { method: 'PATCH', body: { isCompleted } },
    );
    return { goal: row.goal, creditsAwarded: row.creditsAwarded, balance: row.balance };
  },

  async removeMilestone(id: string, milestoneId: string): Promise<Goal> {
    const row = await request<GoalEnvelope>(`/goals/${id}/milestones/${milestoneId}`, {
      method: 'DELETE',
    });
    return row.goal;
  },

  async logProgress(id: string, amount: number): Promise<Goal> {
    const row = await request<GoalEnvelope>(`/goals/${id}/progress`, {
      method: 'POST',
      body: { amount },
    });
    return row.goal;
  },
};

/* ------------------------------------------------------------------ */
/* Activities                                                          */
/* ------------------------------------------------------------------ */

export interface ActivityInput {
  title: string;
  icon?: string;
  category?: Activity['category'];
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  creditsEarned?: number;
  mood?: number;
  energy?: number;
  notes?: string;
}

export const activities = {
  async range(from: ISODate, to: ISODate): Promise<Activity[]> {
    const { items } = await request<Items<WithSourceRef<Activity>>>('/activities', {
      query: { from, to },
    });
    return items.map(withSourceId);
  },

  async create(input: ActivityInput): Promise<Activity> {
    return withSourceId(
      await request<WithSourceRef<Activity>>('/activities', { method: 'POST', body: input }),
    );
  },

  async update(id: string, patch: Partial<ActivityInput>): Promise<Activity> {
    return withSourceId(
      await request<WithSourceRef<Activity>>(`/activities/${id}`, {
        method: 'PATCH',
        body: patch,
      }),
    );
  },

  remove: (id: string) => request<void>(`/activities/${id}`, { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ */
/* Focus                                                               */
/* ------------------------------------------------------------------ */

export interface FocusInput {
  title: string;
  category?: FocusSession['category'];
  targetMinutes: number;
  taskId?: string;
}

export interface FocusFinishResult {
  session: FocusSession;
  minutes: number;
  creditsAwarded: number;
  balance: number;
}

export const focus = {
  async active(): Promise<FocusSession | null> {
    const result = await request<{ session: FocusSession | null; elapsedMinutes: number }>(
      '/focus/active',
    );
    return result.session;
  },

  start: (input: FocusInput) => request<FocusSession>('/focus/start', { method: 'POST', body: input }),

  pause: () => request<FocusSession>('/focus/pause', { method: 'POST' }),

  resume: () => request<FocusSession>('/focus/resume', { method: 'POST' }),

  finish: () => request<FocusFinishResult>('/focus/finish', { method: 'POST' }),

  abandon: () => request<void>('/focus/abandon', { method: 'POST' }),
};

/* ------------------------------------------------------------------ */
/* Credits                                                             */
/* ------------------------------------------------------------------ */

export interface CreditSummary {
  balance: number;
  today: number;
  week: number;
  month: number;
  lifetime: number;
}

export const credits = {
  summary: () => request<CreditSummary>('/credits/balance'),

  async transactions(): Promise<CreditTransaction[]> {
    const { items } = await request<{
      items: WithSourceRef<CreditTransaction>[];
      nextCursor: string | null;
    }>('/credits/transactions', { query: { limit: TRANSACTION_PAGE_SIZE } });
    return items.map(withSourceId);
  },

  adjust: (amount: number, description: string) =>
    request<{ transaction: WithSourceRef<CreditTransaction>; balance: number }>('/credits/adjust', {
      method: 'POST',
      body: { amount, description },
    }),
};

/* ------------------------------------------------------------------ */
/* Rewards                                                             */
/* ------------------------------------------------------------------ */

export interface RewardInput {
  title: string;
  description?: string;
  icon?: string;
  creditCost: number;
  category?: Reward['category'];
}

export interface RedemptionResult {
  reward: Reward;
  balance: number;
  spent: number;
}

export const rewards = {
  async list(): Promise<{ items: Reward[]; balance: number }> {
    const result = await request<{ items: RewardEnvelope[]; balance: number }>('/rewards');
    return { items: result.items.map((row) => row.reward), balance: result.balance };
  },

  create: (input: RewardInput) => request<Reward>('/rewards', { method: 'POST', body: input }),

  update: (id: string, patch: Partial<RewardInput> & { isActive?: boolean }) =>
    request<Reward>(`/rewards/${id}`, { method: 'PATCH', body: patch }),

  remove: (id: string) => request<void>(`/rewards/${id}`, { method: 'DELETE' }),

  redeem: (id: string) => request<RedemptionResult>(`/rewards/${id}/redeem`, { method: 'POST' }),
};

/* ------------------------------------------------------------------ */
/* Reflections                                                         */
/* ------------------------------------------------------------------ */

export interface ReflectionInput {
  date?: ISODate;
  wentWell?: string;
  couldBeBetter?: string;
  learned?: string;
  tomorrow?: string;
  mood: number;
  energy: number;
}

export const reflections = {
  async list(): Promise<Reflection[]> {
    const { items } = await request<Items<Reflection>>('/reflections', { query: { limit: 200 } });
    return items;
  },

  save: (input: ReflectionInput) =>
    request<{ reflection: Reflection; creditsAwarded: number; balance: number }>('/reflections', {
      method: 'POST',
      body: input,
    }),

  remove: (date: ISODate) => request<void>(`/reflections/${date}`, { method: 'DELETE' }),
};

/* ------------------------------------------------------------------ */
/* Assistant                                                           */
/* ------------------------------------------------------------------ */

export interface AIReply {
  text: string;
  suggestions?: string[];
}

export const ai = {
  quickActions: () =>
    request<{ actions: string[]; contextWindowDays: number }>('/ai/quick-actions'),

  chat: (message: string) => request<AIReply>('/ai/chat', { method: 'POST', body: { message } }),

  summarizeDay: () => request<AIReply>('/ai/summarize-day', { method: 'POST' }),
  analyzeProductivity: () => request<AIReply>('/ai/analyze-productivity', { method: 'POST' }),
  planTomorrow: () => request<AIReply>('/ai/plan-tomorrow', { method: 'POST' }),
  analyzeHabits: () => request<AIReply>('/ai/analyze-habits', { method: 'POST' }),
  analyzeGoals: () => request<AIReply>('/ai/analyze-goals', { method: 'POST' }),
};

export { ApiError, errorMessage, setSessionExpiredHandler } from './client';
export { loadTokens, getTokens } from './tokens';
export { API_BASE_URL, API_ORIGIN, HISTORY_WINDOW_DAYS } from './config';
