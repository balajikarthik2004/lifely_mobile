/**
 * Tests over the store's half of the contract.
 *
 * The credit rules themselves are the server's, and the server's own suite
 * covers them. What matters here is everything the client is still responsible
 * for: calling the right endpoint, storing what comes back rather than a local
 * guess, showing the flip immediately, and putting the record back when the
 * call fails.
 */
import type { Habit, Reward, Task } from '@/types';

import { todayKey } from '@/lib/date';
import { selectBalance, selectLifetimeEarned } from '../selectors';
import { useAppStore } from '../useAppStore';

jest.mock('@/api', () => ({
  HISTORY_WINDOW_DAYS: 90,
  API_BASE_URL: 'http://localhost:4000/api/v1',
  API_ORIGIN: 'http://localhost:4000',
  errorMessage: (error: unknown) =>
    error instanceof Error ? error.message : 'Something went wrong. Please try again.',
  setSessionExpiredHandler: jest.fn(),
  loadTokens: jest.fn(async () => null),
  getTokens: jest.fn(() => null),
  auth: { login: jest.fn(), register: jest.fn(), logout: jest.fn(), changePassword: jest.fn() },
  users: {
    me: jest.fn(),
    update: jest.fn(),
    loadDemoData: jest.fn(),
    reset: jest.fn(),
    deleteAccount: jest.fn(),
  },
  tasks: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    complete: jest.fn(),
    uncomplete: jest.fn(),
  },
  habits: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    complete: jest.fn(),
    skip: jest.fn(),
    clearDay: jest.fn(),
  },
  goals: {
    list: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    addMilestone: jest.fn(),
    setMilestone: jest.fn(),
    removeMilestone: jest.fn(),
    logProgress: jest.fn(),
  },
  activities: { range: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn() },
  focus: {
    active: jest.fn(),
    start: jest.fn(),
    pause: jest.fn(),
    resume: jest.fn(),
    finish: jest.fn(),
    abandon: jest.fn(),
  },
  credits: { summary: jest.fn(), transactions: jest.fn(), adjust: jest.fn() },
  rewards: { list: jest.fn(), create: jest.fn(), update: jest.fn(), remove: jest.fn(), redeem: jest.fn() },
  reflections: { list: jest.fn(), save: jest.fn(), remove: jest.fn() },
  ai: { chat: jest.fn(), quickActions: jest.fn() },
}));

// eslint-disable-next-line import/first
import * as api from '@/api';

const mocked = api as unknown as {
  [K in keyof typeof api]: Record<string, jest.Mock>;
};

const summary = { balance: 0, today: 0, week: 0, month: 0, lifetime: 0 };

const task = (over: Partial<Task> = {}): Task => ({
  id: 'task-1',
  title: 'Ship the thing',
  category: 'WORK',
  priority: 'HIGH',
  status: 'TODO',
  dueDate: todayKey(),
  creditValue: 15,
  createdAt: '2026-09-21T08:00:00.000Z',
  updatedAt: '2026-09-21T08:00:00.000Z',
  ...over,
});

const habit = (over: Partial<Habit> = {}): Habit => ({
  id: 'habit-1',
  name: 'Exercise',
  icon: '🏋️',
  category: 'HEALTH',
  frequency: 'DAILY',
  days: [0, 1, 2, 3, 4, 5, 6],
  targetCount: 1,
  creditValue: 10,
  isActive: true,
  log: {},
  createdAt: '2026-09-21T08:00:00.000Z',
  updatedAt: '2026-09-21T08:00:00.000Z',
  ...over,
});

const reward = (over: Partial<Reward> = {}): Reward => ({
  id: 'reward-1',
  title: 'Movie night',
  icon: '🍿',
  creditCost: 500,
  category: 'ENTERTAINMENT',
  isActive: true,
  redemptions: [],
  createdAt: '2026-09-21T08:00:00.000Z',
  ...over,
});

const initial = useAppStore.getState();
const store = () => useAppStore.getState();

/** Every credit-bearing action re-reads these, so they always have an answer. */
function stubLedgerReads(): void {
  mocked.activities.range.mockResolvedValue([]);
  mocked.credits.transactions.mockResolvedValue([]);
  mocked.credits.summary.mockResolvedValue(summary);
}

beforeEach(() => {
  jest.clearAllMocks();
  stubLedgerReads();

  useAppStore.setState({
    ...initial,
    onboarded: true,
    status: 'ready',
    tasks: [],
    habits: [],
    goals: [],
    activities: [],
    transactions: [],
    rewards: [],
    reflections: [],
    focusSession: null,
    creditSummary: summary,
    chat: [],
    toast: null,
  });
});

describe('bootstrap', () => {
  it('fills every slice from the server and reports ready', async () => {
    mocked.users.me.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      profile: { name: 'Karthik' },
      creditRules: {},
      weights: {},
      notifications: {},
      onboarded: true,
    });
    mocked.tasks.list.mockResolvedValue([task()]);
    mocked.habits.list.mockResolvedValue([habit()]);
    mocked.goals.list.mockResolvedValue([]);
    mocked.rewards.list.mockResolvedValue({ items: [reward()], balance: 120 });
    mocked.reflections.list.mockResolvedValue([]);
    mocked.focus.active.mockResolvedValue(null);
    mocked.credits.summary.mockResolvedValue({ ...summary, balance: 120, lifetime: 300 });

    await store().bootstrap();

    const state = store();
    expect(state.status).toBe('ready');
    expect(state.profile.name).toBe('Karthik');
    expect(state.tasks).toHaveLength(1);
    expect(state.habits).toHaveLength(1);
    expect(state.rewards).toHaveLength(1);
    expect(state.onboarded).toBe(true);
  });

  it('reports the failure rather than showing an empty account as if it were real', async () => {
    mocked.users.me.mockRejectedValue(new Error('Cannot reach the server.'));
    mocked.tasks.list.mockResolvedValue([]);
    mocked.habits.list.mockResolvedValue([]);
    mocked.goals.list.mockResolvedValue([]);
    mocked.rewards.list.mockResolvedValue({ items: [], balance: 0 });
    mocked.reflections.list.mockResolvedValue([]);
    mocked.focus.active.mockResolvedValue(null);

    await store().bootstrap();

    expect(store().status).toBe('error');
    expect(store().syncError).toContain('Cannot reach the server');
  });
});

describe('task completion', () => {
  beforeEach(() => {
    useAppStore.setState({ tasks: [task()] });
  });

  it('stores the server’s task and its credit figure, not a locally computed one', async () => {
    mocked.tasks.complete.mockResolvedValue({
      task: task({ status: 'COMPLETED', completedAt: '2026-09-21T10:00:00.000Z' }),
      creditsAwarded: 15,
      balance: 15,
    });

    await store().toggleTask('task-1');

    expect(mocked.tasks.complete).toHaveBeenCalledWith('task-1');
    expect(store().tasks[0].status).toBe('COMPLETED');
    expect(store().toast?.credits).toBe(15);
    // The ledger and timeline rows are the server's, so they are re-read.
    expect(mocked.credits.summary).toHaveBeenCalled();
    expect(mocked.activities.range).toHaveBeenCalled();
  });

  it('calls uncomplete when the task is already done', async () => {
    useAppStore.setState({ tasks: [task({ status: 'COMPLETED' })] });
    mocked.tasks.uncomplete.mockResolvedValue({
      task: task({ status: 'TODO' }),
      creditsAwarded: -15,
      balance: 0,
    });

    await store().toggleTask('task-1');

    expect(mocked.tasks.uncomplete).toHaveBeenCalledWith('task-1');
    expect(store().tasks[0].status).toBe('TODO');
  });

  it('puts the task back and says so when the server refuses', async () => {
    mocked.tasks.complete.mockRejectedValue(new Error('That task no longer exists.'));

    await store().toggleTask('task-1');

    expect(store().tasks[0].status).toBe('TODO');
    expect(store().tasks[0].completedAt).toBeUndefined();
    expect(store().toast?.tone).toBe('warning');
    expect(store().toast?.subtitle).toContain('no longer exists');
  });
});

describe('habit days', () => {
  it('completes an untouched day and reports the streak the server counted', async () => {
    useAppStore.setState({ habits: [habit()] });
    const today = todayKey();
    mocked.habits.complete.mockResolvedValue({
      habit: habit({ log: { [today]: 'COMPLETED' } }),
      creditsAwarded: 13,
      balance: 13,
      streak: 4,
    });

    await store().toggleHabitDay('habit-1');

    expect(mocked.habits.complete).toHaveBeenCalledWith('habit-1', today);
    expect(store().habits[0].log[today]).toBe('COMPLETED');
    expect(store().toast?.title).toBe('4 day streak');
    expect(store().toast?.credits).toBe(13);
  });

  it('clears a day that was already ticked off', async () => {
    const today = todayKey();
    useAppStore.setState({ habits: [habit({ log: { [today]: 'COMPLETED' } })] });
    mocked.habits.clearDay.mockResolvedValue({
      habit: habit({ log: {} }),
      creditsAwarded: 0,
      balance: 0,
    });

    await store().toggleHabitDay('habit-1');

    expect(mocked.habits.clearDay).toHaveBeenCalledWith('habit-1', today);
    expect(store().habits[0].log[today]).toBeUndefined();
  });

  it('restores the day when the call fails', async () => {
    useAppStore.setState({ habits: [habit()] });
    mocked.habits.complete.mockRejectedValue(new Error('Tomorrow has not happened yet.'));

    await store().toggleHabitDay('habit-1');

    expect(store().habits[0].log[todayKey()]).toBeUndefined();
    expect(store().toast?.tone).toBe('warning');
  });
});

describe('reward redemption', () => {
  beforeEach(() => {
    useAppStore.setState({ rewards: [reward()] });
  });

  it('passes the server’s own refusal back to the screen', async () => {
    mocked.rewards.redeem.mockRejectedValue(
      new Error('You need 380 more credits for this one.'),
    );

    const result = await store().redeemReward('reward-1');

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('380 more credits');
    expect(store().rewards[0].redemptions).toHaveLength(0);
  });

  it('records the redemption the server made and the balance it reports', async () => {
    mocked.rewards.redeem.mockResolvedValue({
      reward: reward({
        redemptions: [{ id: 'r1', redeemedAt: '2026-09-21T20:00:00.000Z', cost: 500 }],
      }),
      balance: 100,
      spent: 500,
    });
    // The re-read that follows is the authority on the balance, so it has to
    // agree with what the redemption just did.
    mocked.credits.summary.mockResolvedValue({ ...summary, balance: 100 });

    const result = await store().redeemReward('reward-1');

    expect(result.ok).toBe(true);
    expect(store().rewards[0].redemptions).toHaveLength(1);
    expect(store().creditSummary.balance).toBe(100);
  });
});

describe('deleting a task', () => {
  it('removes it at once and restores it if the server says no', async () => {
    useAppStore.setState({ tasks: [task()] });
    mocked.tasks.remove.mockRejectedValue(new Error('That task no longer exists.'));

    await store().deleteTask('task-1');

    expect(store().tasks).toHaveLength(1);
    expect(store().toast?.tone).toBe('warning');
  });
});

describe('credit totals', () => {
  it('come from the server aggregate, not the cached window of transactions', () => {
    useAppStore.setState({
      creditSummary: { balance: 4210, today: 35, week: 210, month: 780, lifetime: 9100 },
      transactions: [],
    });

    expect(selectBalance(store())).toBe(4210);
    expect(selectLifetimeEarned(store())).toBe(9100);
  });
});
