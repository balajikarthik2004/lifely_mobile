/**
 * The app's state, backed by the Lifely API.
 *
 * The shape is the same one the screens and selectors have always read — plain
 * arrays of `@/types` records — but nothing in here is authored locally any
 * more. Every action calls the server and stores what comes back, so the credit
 * ledger, streaks and Life Score are computed in exactly one place.
 *
 * Actions that move credits (completing a task or a habit, reaching a
 * milestone, finishing a focus block, saving a reflection, redeeming a reward)
 * also create ledger and timeline rows server-side. Rather than mirror those
 * rules here — the surest way to drift — the affected slices are re-read after
 * the call. The record itself updates immediately from the response, so the tap
 * still feels instant.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as api from '@/api';
import { errorMessage, HISTORY_WINDOW_DAYS } from '@/api';
import { lastNDays, todayKey } from '@/lib/date';
import { createId } from '@/lib/id';
import type {
  Activity,
  ChatMessage,
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

import {
  DEFAULT_NOTIFICATIONS,
  DEFAULT_PROFILE,
  DEFAULT_RULES,
  DEFAULT_SCORE_WEIGHTS,
} from './defaults';
import { useAuthStore } from './useAuthStore';

export interface Toast {
  id: string;
  title: string;
  subtitle?: string;
  credits?: number;
  tone: 'success' | 'info' | 'warning';
}

export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error';

interface Account {
  onboarded: boolean;
  profile: UserProfile;
  creditRules: CreditRules;
  weights: LifeScoreWeights;
  notifications: NotificationPrefs;
}

interface Data {
  tasks: Task[];
  habits: Habit[];
  goals: Goal[];
  activities: Activity[];
  transactions: CreditTransaction[];
  rewards: Reward[];
  reflections: Reflection[];
  focusSession: FocusSession | null;
  /** Authoritative totals from the server — the cached ledger is only a window. */
  creditSummary: api.CreditSummary;
}

interface Actions {
  // lifecycle
  bootstrap: () => Promise<void>;
  refresh: () => Promise<void>;
  clearLocal: () => void;
  completeOnboarding: (input: {
    profile: Partial<UserProfile>;
    habits: Omit<Habit, 'id' | 'log' | 'createdAt' | 'updatedAt'>[];
    goal?: Pick<Goal, 'title' | 'category' | 'icon' | 'why' | 'deadline'>;
    withSampleData: boolean;
  }) => Promise<void>;
  loadSampleData: () => Promise<void>;
  resetEverything: () => Promise<void>;

  // tasks
  addTask: (input: Partial<Task> & Pick<Task, 'title'>) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;

  // habits
  addHabit: (input: Partial<Habit> & Pick<Habit, 'name'>) => Promise<Habit | null>;
  updateHabit: (id: string, patch: Partial<Habit>) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabitDay: (id: string, dateKey?: ISODate) => Promise<void>;
  skipHabitDay: (id: string, dateKey?: ISODate) => Promise<void>;

  // goals
  addGoal: (input: Partial<Goal> & Pick<Goal, 'title'>) => Promise<Goal | null>;
  updateGoal: (id: string, patch: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  addMilestone: (goalId: string, title: string) => Promise<void>;
  toggleMilestone: (goalId: string, milestoneId: string) => Promise<void>;
  removeMilestone: (goalId: string, milestoneId: string) => Promise<void>;

  // activities
  addActivity: (input: Partial<Activity> & Pick<Activity, 'title'>) => Promise<Activity | null>;
  updateActivity: (id: string, patch: Partial<Activity>) => Promise<void>;
  deleteActivity: (id: string) => Promise<void>;

  // rewards
  addReward: (input: Partial<Reward> & Pick<Reward, 'title' | 'creditCost'>) => Promise<Reward | null>;
  updateReward: (id: string, patch: Partial<Reward>) => Promise<void>;
  deleteReward: (id: string) => Promise<void>;
  redeemReward: (id: string) => Promise<{ ok: boolean; reason?: string }>;

  // reflection
  saveReflection: (input: Omit<Reflection, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;

  // focus
  startFocus: (
    input: Pick<FocusSession, 'title' | 'category' | 'targetMinutes'> & { taskId?: string },
  ) => Promise<void>;
  pauseFocus: () => Promise<void>;
  resumeFocus: () => Promise<void>;
  finishFocus: () => Promise<number>;
  cancelFocus: () => Promise<void>;

  // credits
  adjustCredits: (amount: number, description: string) => Promise<void>;

  // assistant
  pushChat: (message: Omit<ChatMessage, 'id' | 'createdAt'>) => void;
  clearChat: () => void;

  // settings
  updateProfile: (patch: Partial<UserProfile>) => void;
  updateCreditRules: (patch: Partial<CreditRules>) => void;
  updateWeights: (patch: Partial<LifeScoreWeights>) => void;
  updateNotifications: (patch: Partial<NotificationPrefs>) => void;

  // ui
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: () => void;
}

export interface AppState extends Account, Data, Actions {
  /** Whether the locally cached conversation has come back from disk. */
  hydrated: boolean;
  status: SyncStatus;
  syncError: string | null;
  chat: ChatMessage[];
  toast: Toast | null;
}

const emptySummary: api.CreditSummary = {
  balance: 0,
  today: 0,
  week: 0,
  month: 0,
  lifetime: 0,
};

const emptyState: Account & Data = {
  onboarded: false,
  profile: DEFAULT_PROFILE,
  creditRules: DEFAULT_RULES,
  weights: DEFAULT_SCORE_WEIGHTS,
  notifications: DEFAULT_NOTIFICATIONS,
  tasks: [],
  habits: [],
  goals: [],
  activities: [],
  transactions: [],
  rewards: [],
  reflections: [],
  focusSession: null,
  creditSummary: emptySummary,
};

/**
 * The rewards a brand-new account starts with, so the Rewards screen is never
 * empty on day one.
 */
const STARTER_REWARDS: api.RewardInput[] = [
  {
    title: 'Movie night',
    description: 'A film, the good snacks, no laptop in the room.',
    icon: '\u{1F37F}',
    creditCost: 500,
    category: 'ENTERTAINMENT',
  },
  {
    title: 'Dinner out',
    description: 'That restaurant you keep walking past.',
    icon: '\u{1F37D}️',
    creditCost: 800,
    category: 'FOOD',
  },
  {
    title: 'A guilt-free lazy morning',
    description: 'No alarm, no plans, no guilt.',
    icon: '\u{1F6CF}️',
    creditCost: 300,
    category: 'PERSONAL',
  },
];

/** The window of history the client caches for its own charts and streaks. */
function historyRange(): { from: ISODate; to: ISODate } {
  const days = lastNDays(HISTORY_WINDOW_DAYS);
  return { from: days[0], to: days[days.length - 1] };
}

function accountFrom(user: api.ServerUser): Account {
  return {
    onboarded: user.onboarded,
    profile: { ...DEFAULT_PROFILE, ...user.profile },
    creditRules: { ...DEFAULT_RULES, ...user.creditRules },
    weights: { ...DEFAULT_SCORE_WEIGHTS, ...user.weights },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...user.notifications },
  };
}

/** Settings screens edit as you type; the server hears about it once you stop. */
function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: T) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Reports a failed call without losing what the server actually said. */
      const failed = (error: unknown) => {
        get().showToast({
          title: 'That did not save',
          subtitle: errorMessage(error),
          tone: 'warning',
        });
      };

      /**
       * Re-reads everything a credit-bearing action can touch. The server
       * creates the ledger row and the timeline entry; this is how the client
       * learns about them without duplicating the rules.
       */
      const refreshLedger = async () => {
        const { from, to } = historyRange();
        try {
          const [activities, transactions, creditSummary] = await Promise.all([
            api.activities.range(from, to),
            api.credits.transactions(),
            api.credits.summary(),
          ]);
          set({ activities, transactions, creditSummary });
        } catch {
          // The action itself succeeded; a stale chart until the next read is
          // not worth interrupting anyone over.
        }
      };

      const pushUserPatch = debounce((patch: api.UserPatch) => {
        void api.users
          .update(patch)
          .then((user) => useAuthStore.getState().setUser(user))
          .catch(failed);
      }, 700);

      return {
        ...emptyState,
        hydrated: false,
        status: 'idle',
        syncError: null,
        chat: [],
        toast: null,

        /* --------------------------------------------------------------- */
        /* Lifecycle                                                        */
        /* --------------------------------------------------------------- */

        bootstrap: async () => {
          set({ status: 'loading', syncError: null });
          const { from, to } = historyRange();

          try {
            const [
              user,
              tasks,
              habits,
              goals,
              activities,
              transactions,
              creditSummary,
              rewardList,
              reflections,
              focusSession,
            ] = await Promise.all([
              api.users.me(),
              api.tasks.list(),
              api.habits.list(),
              api.goals.list(),
              api.activities.range(from, to),
              api.credits.transactions(),
              api.credits.summary(),
              api.rewards.list(),
              api.reflections.list(),
              api.focus.active(),
            ]);

            set({
              ...accountFrom(user),
              tasks,
              habits,
              goals,
              activities,
              transactions,
              creditSummary,
              rewards: rewardList.items,
              reflections,
              focusSession,
              status: 'ready',
              syncError: null,
            });
          } catch (error) {
            set({ status: 'error', syncError: errorMessage(error) });
          }
        },

        refresh: async () => {
          await get().bootstrap();
        },

        clearLocal: () => set({ ...emptyState, status: 'idle', syncError: null, toast: null }),

        completeOnboarding: async ({ profile, habits, goal, withSampleData }) => {
          try {
            if (withSampleData) {
              await api.users.loadDemoData();
              if (profile.name) await api.users.update({ profile: { name: profile.name } });
              await get().bootstrap();
              return;
            }

            await api.users.update({ profile, onboarded: true });

            // Sequential rather than parallel: a first run on a cold server is
            // the worst moment to open ten connections at once.
            for (const habit of habits) {
              await api.habits.create({
                name: habit.name,
                icon: habit.icon,
                category: habit.category,
                frequency: habit.frequency,
                days: habit.days,
                targetCount: habit.targetCount,
                creditValue: habit.creditValue,
              });
            }

            if (goal) {
              await api.goals.create({
                title: goal.title,
                category: goal.category,
                icon: goal.icon,
                why: goal.why,
                deadline: goal.deadline,
              });
            }

            for (const reward of STARTER_REWARDS) {
              await api.rewards.create(reward);
            }

            await get().bootstrap();
          } catch (error) {
            failed(error);
          }
        },

        loadSampleData: async () => {
          try {
            await api.users.loadDemoData();
            await get().bootstrap();
            get().showToast({ title: 'Sample fortnight loaded', tone: 'info' });
          } catch (error) {
            failed(error);
          }
        },

        resetEverything: async () => {
          try {
            await api.users.reset();
            await get().bootstrap();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Tasks                                                            */
        /* --------------------------------------------------------------- */

        addTask: async (input) => {
          try {
            const task = await api.tasks.create({
              title: input.title,
              description: input.description,
              category: input.category,
              priority: input.priority,
              dueDate: input.dueDate ?? todayKey(),
              dueTime: input.dueTime,
              estimatedMinutes: input.estimatedMinutes,
              creditValue: input.creditValue,
              goalId: input.goalId,
              habitId: input.habitId,
              recurrence: input.recurrence,
            });
            set((s) => ({ tasks: [task, ...s.tasks] }));
            return task;
          } catch (error) {
            failed(error);
            return null;
          }
        },

        updateTask: async (id, patch) => {
          try {
            const task = await api.tasks.update(id, {
              title: patch.title,
              description: patch.description,
              category: patch.category,
              priority: patch.priority,
              dueDate: patch.dueDate,
              dueTime: patch.dueTime,
              estimatedMinutes: patch.estimatedMinutes,
              creditValue: patch.creditValue,
              goalId: patch.goalId,
              habitId: patch.habitId,
              recurrence: patch.recurrence,
            });
            set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
          } catch (error) {
            failed(error);
          }
        },

        deleteTask: async (id) => {
          const previous = get().tasks;
          set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }));
          try {
            await api.tasks.remove(id);
            await refreshLedger();
          } catch (error) {
            set({ tasks: previous });
            failed(error);
          }
        },

        toggleTask: async (id) => {
          const task = get().tasks.find((t) => t.id === id);
          if (!task) return;

          const completing = task.status !== 'COMPLETED';

          // The flip is shown straight away; the server's version replaces it a
          // moment later, and a failure puts the original back.
          set((s) => ({
            tasks: s.tasks.map((t) =>
              t.id === id
                ? {
                    ...t,
                    status: completing ? 'COMPLETED' : 'TODO',
                    completedAt: completing ? new Date().toISOString() : undefined,
                  }
                : t,
            ),
          }));

          try {
            const result = completing
              ? await api.tasks.complete(id)
              : await api.tasks.uncomplete(id);

            set((s) => ({
              tasks: s.tasks.map((t) => (t.id === id ? result.task : t)),
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            if (completing && result.creditsAwarded > 0) {
              get().showToast({
                title: 'Task completed',
                subtitle: task.title,
                credits: result.creditsAwarded,
                tone: 'success',
              });
            }

            await refreshLedger();
          } catch (error) {
            set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? task : t)) }));
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Habits                                                           */
        /* --------------------------------------------------------------- */

        addHabit: async (input) => {
          try {
            const habit = await api.habits.create({
              name: input.name,
              description: input.description,
              icon: input.icon,
              category: input.category,
              frequency: input.frequency,
              days: input.days,
              targetCount: input.targetCount,
              creditValue: input.creditValue,
              reminderTime: input.reminderTime,
              goalId: input.goalId,
              isActive: input.isActive,
            });
            set((s) => ({ habits: [...s.habits, habit] }));
            return habit;
          } catch (error) {
            failed(error);
            return null;
          }
        },

        updateHabit: async (id, patch) => {
          try {
            const habit = await api.habits.update(id, {
              name: patch.name,
              description: patch.description,
              icon: patch.icon,
              category: patch.category,
              frequency: patch.frequency,
              days: patch.days,
              targetCount: patch.targetCount,
              creditValue: patch.creditValue,
              reminderTime: patch.reminderTime,
              goalId: patch.goalId,
              isActive: patch.isActive,
            });
            set((s) => ({ habits: s.habits.map((h) => (h.id === id ? habit : h)) }));
          } catch (error) {
            failed(error);
          }
        },

        deleteHabit: async (id) => {
          const previous = get().habits;
          set((s) => ({ habits: s.habits.filter((h) => h.id !== id) }));
          try {
            await api.habits.remove(id);
            await refreshLedger();
          } catch (error) {
            set({ habits: previous });
            failed(error);
          }
        },

        toggleHabitDay: async (id, dateKey = todayKey()) => {
          const habit = get().habits.find((h) => h.id === id);
          if (!habit) return;

          const wasCompleted = habit.log[dateKey] === 'COMPLETED';
          const nextLog = { ...habit.log };
          if (wasCompleted) delete nextLog[dateKey];
          else nextLog[dateKey] = 'COMPLETED';

          set((s) => ({
            habits: s.habits.map((h) => (h.id === id ? { ...h, log: nextLog } : h)),
          }));

          try {
            const result = wasCompleted
              ? await api.habits.clearDay(id, dateKey)
              : await api.habits.complete(id, dateKey);

            set((s) => ({
              habits: s.habits.map((h) => (h.id === id ? result.habit : h)),
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            if (!wasCompleted && result.creditsAwarded > 0) {
              const streak = result.streak ?? 0;
              get().showToast({
                title: streak > 1 ? `${streak} day streak` : 'Habit done',
                subtitle: habit.name,
                credits: result.creditsAwarded,
                tone: 'success',
              });
            }

            await refreshLedger();
          } catch (error) {
            set((s) => ({ habits: s.habits.map((h) => (h.id === id ? habit : h)) }));
            failed(error);
          }
        },

        skipHabitDay: async (id, dateKey = todayKey()) => {
          const habit = get().habits.find((h) => h.id === id);
          if (!habit) return;

          const wasSkipped = habit.log[dateKey] === 'SKIPPED';

          try {
            const result = wasSkipped
              ? await api.habits.clearDay(id, dateKey)
              : await api.habits.skip(id, dateKey);

            set((s) => ({
              habits: s.habits.map((h) => (h.id === id ? result.habit : h)),
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Goals                                                            */
        /* --------------------------------------------------------------- */

        addGoal: async (input) => {
          try {
            const goal = await api.goals.create({
              title: input.title,
              why: input.why,
              icon: input.icon,
              category: input.category,
              targetValue: input.targetValue,
              currentValue: input.currentValue,
              unit: input.unit,
              deadline: input.deadline,
              milestones: input.milestones?.map((m) => ({ title: m.title })),
            });
            set((s) => ({ goals: [goal, ...s.goals] }));
            return goal;
          } catch (error) {
            failed(error);
            return null;
          }
        },

        updateGoal: async (id, patch) => {
          try {
            const goal = await api.goals.update(id, {
              title: patch.title,
              why: patch.why,
              icon: patch.icon,
              category: patch.category,
              targetValue: patch.targetValue,
              currentValue: patch.currentValue,
              unit: patch.unit,
              deadline: patch.deadline,
              status: patch.status,
            });
            set((s) => ({ goals: s.goals.map((g) => (g.id === id ? goal : g)) }));
          } catch (error) {
            failed(error);
          }
        },

        deleteGoal: async (id) => {
          const previous = get().goals;
          set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }));
          try {
            await api.goals.remove(id);
            // Deleting a goal detaches its tasks and habits server-side.
            const [tasks, habits] = await Promise.all([api.tasks.list(), api.habits.list()]);
            set({ tasks, habits });
          } catch (error) {
            set({ goals: previous });
            failed(error);
          }
        },

        addMilestone: async (goalId, title) => {
          try {
            const goal = await api.goals.addMilestone(goalId, title);
            set((s) => ({ goals: s.goals.map((g) => (g.id === goalId ? goal : g)) }));
          } catch (error) {
            failed(error);
          }
        },

        toggleMilestone: async (goalId, milestoneId) => {
          const goal = get().goals.find((g) => g.id === goalId);
          const milestone = goal?.milestones.find((m) => m.id === milestoneId);
          if (!goal || !milestone) return;

          const completing = !milestone.isCompleted;

          try {
            const result = await api.goals.setMilestone(goalId, milestoneId, completing);
            set((s) => ({
              goals: s.goals.map((g) => (g.id === goalId ? result.goal : g)),
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            if (completing && result.creditsAwarded > 0) {
              get().showToast({
                title: 'Milestone reached',
                subtitle: milestone.title,
                credits: result.creditsAwarded,
                tone: 'success',
              });
            }

            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        removeMilestone: async (goalId, milestoneId) => {
          try {
            const goal = await api.goals.removeMilestone(goalId, milestoneId);
            set((s) => ({ goals: s.goals.map((g) => (g.id === goalId ? goal : g)) }));
            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Activities                                                       */
        /* --------------------------------------------------------------- */

        addActivity: async (input) => {
          try {
            const activity = await api.activities.create({
              title: input.title,
              icon: input.icon,
              category: input.category,
              startTime: input.startTime,
              endTime: input.endTime,
              durationMinutes: input.durationMinutes,
              creditsEarned: input.creditsEarned,
              mood: input.mood,
              energy: input.energy,
              notes: input.notes,
            });

            set((s) => ({ activities: [activity, ...s.activities] }));

            if (activity.creditsEarned > 0) {
              get().showToast({
                title: 'Activity logged',
                subtitle: activity.title,
                credits: activity.creditsEarned,
                tone: 'success',
              });
            }

            await refreshLedger();
            return activity;
          } catch (error) {
            failed(error);
            return null;
          }
        },

        updateActivity: async (id, patch) => {
          try {
            const activity = await api.activities.update(id, {
              title: patch.title,
              icon: patch.icon,
              category: patch.category,
              startTime: patch.startTime,
              endTime: patch.endTime,
              durationMinutes: patch.durationMinutes,
              creditsEarned: patch.creditsEarned,
              mood: patch.mood,
              energy: patch.energy,
              notes: patch.notes,
            });
            set((s) => ({ activities: s.activities.map((a) => (a.id === id ? activity : a)) }));
            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        deleteActivity: async (id) => {
          const previous = get().activities;
          set((s) => ({ activities: s.activities.filter((a) => a.id !== id) }));
          try {
            await api.activities.remove(id);
            await refreshLedger();
          } catch (error) {
            set({ activities: previous });
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Rewards                                                          */
        /* --------------------------------------------------------------- */

        addReward: async (input) => {
          try {
            const reward = await api.rewards.create({
              title: input.title,
              description: input.description,
              icon: input.icon,
              creditCost: input.creditCost,
              category: input.category,
            });
            set((s) => ({ rewards: [reward, ...s.rewards] }));
            return reward;
          } catch (error) {
            failed(error);
            return null;
          }
        },

        updateReward: async (id, patch) => {
          try {
            const reward = await api.rewards.update(id, {
              title: patch.title,
              description: patch.description,
              icon: patch.icon,
              creditCost: patch.creditCost,
              category: patch.category,
              isActive: patch.isActive,
            });
            set((s) => ({ rewards: s.rewards.map((r) => (r.id === id ? reward : r)) }));
          } catch (error) {
            failed(error);
          }
        },

        deleteReward: async (id) => {
          const previous = get().rewards;
          set((s) => ({ rewards: s.rewards.filter((r) => r.id !== id) }));
          try {
            await api.rewards.remove(id);
          } catch (error) {
            set({ rewards: previous });
            failed(error);
          }
        },

        redeemReward: async (id) => {
          const reward = get().rewards.find((r) => r.id === id);
          if (!reward) return { ok: false, reason: 'That reward no longer exists.' };

          try {
            const result = await api.rewards.redeem(id);

            set((s) => ({
              rewards: s.rewards.map((r) => (r.id === id ? result.reward : r)),
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            get().showToast({
              title: 'Enjoy it',
              subtitle: reward.title,
              credits: -result.spent,
              tone: 'info',
            });

            await refreshLedger();
            return { ok: true };
          } catch (error) {
            // The server knows the real balance, so its refusal is the one to
            // show — "you need 120 more credits", not a guess.
            return { ok: false, reason: errorMessage(error) };
          }
        },

        /* --------------------------------------------------------------- */
        /* Reflection                                                       */
        /* --------------------------------------------------------------- */

        saveReflection: async (input) => {
          const existing = get().reflections.some((r) => r.date === input.date);

          try {
            const result = await api.reflections.save({
              date: input.date,
              wentWell: input.wentWell,
              couldBeBetter: input.couldBeBetter,
              learned: input.learned,
              tomorrow: input.tomorrow,
              mood: input.mood,
              energy: input.energy,
            });

            set((s) => ({
              reflections: [
                result.reflection,
                ...s.reflections.filter((r) => r.date !== result.reflection.date),
              ],
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            if (existing) {
              get().showToast({ title: 'Reflection updated', tone: 'info' });
            } else {
              get().showToast({
                title: 'Day closed out',
                subtitle: 'Reflection saved',
                credits: result.creditsAwarded,
                tone: 'success',
              });
            }

            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Focus                                                            */
        /* --------------------------------------------------------------- */

        startFocus: async ({ title, category, targetMinutes, taskId }) => {
          try {
            const session = await api.focus.start({ title, category, targetMinutes, taskId });
            set({ focusSession: session });
          } catch (error) {
            failed(error);
          }
        },

        pauseFocus: async () => {
          try {
            set({ focusSession: await api.focus.pause() });
          } catch (error) {
            failed(error);
          }
        },

        resumeFocus: async () => {
          try {
            set({ focusSession: await api.focus.resume() });
          } catch (error) {
            failed(error);
          }
        },

        finishFocus: async () => {
          const session = get().focusSession;
          if (!session) return 0;

          try {
            // The server times the session, so a backgrounded app cannot inflate
            // or lose the minutes.
            const result = await api.focus.finish();

            set((s) => ({
              focusSession: null,
              creditSummary: { ...s.creditSummary, balance: result.balance },
            }));

            if (result.creditsAwarded > 0) {
              get().showToast({
                title: 'Focus session complete',
                subtitle: `${result.minutes} minutes on ${session.title}`,
                credits: result.creditsAwarded,
                tone: 'success',
              });
            }

            await refreshLedger();
            return result.creditsAwarded;
          } catch (error) {
            failed(error);
            return 0;
          }
        },

        cancelFocus: async () => {
          set({ focusSession: null });
          try {
            await api.focus.abandon();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Credits                                                          */
        /* --------------------------------------------------------------- */

        adjustCredits: async (amount, description) => {
          try {
            await api.credits.adjust(amount, description);
            await refreshLedger();
          } catch (error) {
            failed(error);
          }
        },

        /* --------------------------------------------------------------- */
        /* Assistant (local to the device)                                  */
        /* --------------------------------------------------------------- */

        pushChat: (message) =>
          set((s) => ({
            chat: [...s.chat, { ...message, id: createId('msg'), createdAt: new Date().toISOString() }],
          })),

        clearChat: () => set({ chat: [] }),

        /* --------------------------------------------------------------- */
        /* Settings                                                         */
        /* --------------------------------------------------------------- */

        updateProfile: (patch) => {
          set((s) => ({ profile: { ...s.profile, ...patch } }));
          pushUserPatch({ profile: get().profile });
        },

        updateCreditRules: (patch) => {
          set((s) => ({ creditRules: { ...s.creditRules, ...patch } }));
          pushUserPatch({ creditRules: get().creditRules });
        },

        updateWeights: (patch) => {
          set((s) => ({ weights: { ...s.weights, ...patch } }));
          pushUserPatch({ weights: get().weights });
        },

        updateNotifications: (patch) => {
          set((s) => ({ notifications: { ...s.notifications, ...patch } }));
          pushUserPatch({ notifications: get().notifications });
        },

        /* --------------------------------------------------------------- */
        /* UI                                                               */
        /* --------------------------------------------------------------- */

        showToast: (toast) => set({ toast: { ...toast, id: createId('toast') } }),
        dismissToast: () => set({ toast: null }),
      };
    },
    {
      name: 'lifely-local-v2',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Only what the server does not hold. Everything else is fetched, so it
      // can never be stale or belong to a previously signed-in account.
      partialize: (state) => ({ chat: state.chat }),
      onRehydrateStorage: () => () => {
        useAppStore.setState({ hydrated: true });
      },
    },
  ),
);
