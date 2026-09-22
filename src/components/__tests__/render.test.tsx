/**
 * Render smoke tests.
 *
 * These do not assert on styling — they assert that every card and chart the
 * app leans on actually mounts, renders the numbers it was given, and survives
 * the empty-data case that a brand new install starts from.
 */
import { render } from '@testing-library/react-native';

import { DonutChart } from '../charts/DonutChart';
import { Heatmap } from '../charts/Heatmap';
import { TrendChart } from '../charts/TrendChart';
import { GoalCard } from '../GoalCard';
import { HabitCard } from '../HabitCard';
import { LifeScoreCard } from '../LifeScoreCard';
import { MetricCard } from '../MetricCard';
import { RewardCard } from '../RewardCard';
import { TaskCard } from '../TaskCard';
import { Timeline } from '../Timeline';
import { EmptyState } from '../ui/EmptyState';
import { ProgressBar, ProgressRing } from '../ui/Progress';
import { calculateLifeScore } from '@/domain/lifeScore';
import { todayKey } from '@/lib/date';
import type { Activity, Goal, Habit, Reward, Task } from '@/types';

const noop = () => undefined;

const task: Task = {
  id: 't1',
  title: 'Finish the ERP testing round',
  category: 'WORK',
  priority: 'CRITICAL',
  status: 'TODO',
  dueDate: todayKey(),
  dueTime: '11:00',
  creditValue: 15,
  createdAt: '2026-09-21T08:00:00.000Z',
  updatedAt: '2026-09-21T08:00:00.000Z',
};

const habit: Habit = {
  id: 'h1',
  name: 'Exercise',
  icon: 'gym',
  category: 'HEALTH',
  frequency: 'DAILY',
  days: [0, 1, 2, 3, 4, 5, 6],
  targetCount: 1,
  creditValue: 10,
  isActive: true,
  log: { [todayKey()]: 'COMPLETED' },
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const goal: Goal = {
  id: 'g1',
  title: 'Become a full-stack developer',
  icon: 'laptop',
  category: 'WORK',
  milestones: [
    { id: 'm1', title: 'a', isCompleted: true },
    { id: 'm2', title: 'b', isCompleted: false },
  ],
  status: 'ACTIVE',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
};

const activity: Activity = {
  id: 'a1',
  title: 'Deep work on ERP module',
  icon: 'laptop',
  category: 'WORK',
  startTime: `${todayKey()}T09:00:00.000Z`,
  endTime: `${todayKey()}T11:00:00.000Z`,
  durationMinutes: 120,
  source: 'FOCUS',
  creditsEarned: 20,
  createdAt: `${todayKey()}T09:00:00.000Z`,
  updatedAt: `${todayKey()}T09:00:00.000Z`,
};

const reward: Reward = {
  id: 'r1',
  title: 'Movie night',
  icon: 'popcorn',
  creditCost: 500,
  category: 'ENTERTAINMENT',
  isActive: true,
  redemptions: [],
  createdAt: '2026-09-01T00:00:00.000Z',
};

describe('TaskCard', () => {
  it('shows the task, its priority and what it is worth', async () => {
    const screen = await render(<TaskCard task={task} onToggle={noop} />);
    expect(screen.getByText('Finish the ERP testing round')).toBeTruthy();
    expect(screen.getByText('Critical')).toBeTruthy();
    expect(screen.getByText('+15')).toBeTruthy();
  });

  it('marks a completed task as completed in text, not only in colour', async () => {
    const screen = await render(<TaskCard task={{ ...task, status: 'COMPLETED' }} onToggle={noop} />);
    expect(screen.getByText('Completed')).toBeTruthy();
  });
});

describe('HabitCard', () => {
  it('renders the habit with its live streak', async () => {
    const screen = await render(<HabitCard habit={habit} onToggle={noop} />);
    expect(screen.getByText('Exercise')).toBeTruthy();
    expect(screen.getByLabelText(/Complete Exercise|Undo Exercise/)).toBeTruthy();
  });
});

describe('GoalCard', () => {
  it('renders progress derived from milestones', async () => {
    const screen = await render(<GoalCard goal={goal} />);
    expect(screen.getByText('Become a full-stack developer')).toBeTruthy();
    expect(screen.getByText('50%')).toBeTruthy();
    expect(screen.getByText('1/2 milestones')).toBeTruthy();
  });
});

describe('LifeScoreCard', () => {
  it('renders the score and every component of the breakdown', async () => {
    const breakdown = calculateLifeScore({
      tasksCompleted: 4,
      tasksTotal: 6,
      habitsCompleted: 6,
      habitsTotal: 8,
      goalProgressAvg: 70,
      focusMinutes: 200,
      healthMinutes: 45,
      hasReflection: true,
    });

    const screen = await render(<LifeScoreCard breakdown={breakdown} />);
    expect(screen.getByText(String(breakdown.score))).toBeTruthy();
    ['Tasks', 'Habits', 'Goals', 'Focus', 'Health', 'Reflection'].forEach((label) => {
      expect(screen.getByText(label)).toBeTruthy();
    });
  });

  it('renders a zero score without crashing', async () => {
    const breakdown = calculateLifeScore({
      tasksCompleted: 0,
      tasksTotal: 0,
      habitsCompleted: 0,
      habitsTotal: 0,
      goalProgressAvg: 0,
      focusMinutes: 0,
      healthMinutes: 0,
      hasReflection: false,
    });
    const screen = await render(<LifeScoreCard breakdown={breakdown} />);
    expect(screen.getByText('Just getting started')).toBeTruthy();
  });
});

describe('Timeline', () => {
  it('renders an activity with its duration', async () => {
    const screen = await render(<Timeline activities={[activity]} />);
    expect(screen.getByText('Deep work on ERP module')).toBeTruthy();
    expect(screen.getByText('2h')).toBeTruthy();
  });

  it('surfaces a long gap as untracked time', async () => {
    const later: Activity = {
      ...activity,
      id: 'a2',
      title: 'Afternoon block',
      startTime: `${todayKey()}T15:00:00.000Z`,
      endTime: `${todayKey()}T16:00:00.000Z`,
      durationMinutes: 60,
    };
    const screen = await render(<Timeline activities={[activity, later]} />);
    expect(screen.getByText('4h untracked')).toBeTruthy();
  });

  it('renders nothing rather than crashing on an empty day', async () => {
    await expect(render(<Timeline activities={[]} />)).resolves.toBeTruthy();
  });
});

describe('RewardCard', () => {
  it('offers redemption once the balance covers it', async () => {
    const screen = await render(<RewardCard reward={reward} balance={600} onRedeem={noop} />);
    expect(screen.getByText('Redeem')).toBeTruthy();
  });

  it('shows how far off it is when the balance is short', async () => {
    const screen = await render(<RewardCard reward={reward} balance={200} onRedeem={noop} />);
    expect(screen.getByText('300 credits to go')).toBeTruthy();
    expect(screen.getByText('Not yet')).toBeTruthy();
  });
});

describe('charts', () => {
  it('renders the donut with a direct-labelled legend', async () => {
    const screen = await render(
      <DonutChart
        data={[
          { key: 'WORK', label: 'Work', value: 240, color: '#2F6BD8' },
          { key: 'HEALTH', label: 'Health', value: 60, color: '#E2703A' },
        ]}
      />,
    );
    expect(screen.getByText('Work')).toBeTruthy();
    expect(screen.getByText('4h')).toBeTruthy();
    expect(screen.getByText('1h')).toBeTruthy();
  });

  it('tells the reader when there is nothing to plot', async () => {
    const screen = await render(<DonutChart data={[]} />);
    expect(screen.getByText('Nothing tracked yet')).toBeTruthy();
  });

  it('renders the trend with its series named and the latest point read out', async () => {
    const screen = await render(
      <TrendChart
        data={[
          { label: 'M', value: 60, caption: 'Sep 15' },
          { label: 'T', value: 82, caption: 'Sep 16' },
        ]}
        seriesLabel="Life Score, daily"
      />,
    );
    expect(screen.getByText('Life Score, daily')).toBeTruthy();
  });

  it('renders the heatmap with both ends of the ramp labelled', async () => {
    const screen = await render(<Heatmap cells={[{ key: '2026-09-21', value: 0.8 }]} />);
    expect(screen.getByText('Nothing')).toBeTruthy();
    expect(screen.getByText('Full day')).toBeTruthy();
  });
});

describe('shared primitives', () => {
  it('renders an empty state with its call to action', async () => {
    const screen = await render(
      <EmptyState
        emoji="*"
        title="No tasks yet"
        body="Start by adding one important thing."
        actionLabel="Add task"
        onAction={noop}
      />,
    );
    expect(screen.getByText('No tasks yet')).toBeTruthy();
    expect(screen.getByText('Add task')).toBeTruthy();
  });

  it('exposes progress to assistive technology', async () => {
    const screen = await render(<ProgressBar value={42} label="Today's progress" />);
    const bar = screen.getByLabelText("Today's progress");
    expect(bar.props.accessibilityValue).toEqual({ min: 0, max: 100, now: 42 });
  });

  it('clamps an out-of-range ring value instead of overflowing', async () => {
    const screen = await render(<ProgressRing value={180} label="Life Score" />);
    const ring = screen.getByLabelText('Life Score');
    expect(ring.props.accessibilityValue.now).toBe(100);
  });

  it('renders a metric tile', async () => {
    const screen = await render(<MetricCard icon="zap" value="+42" label="Credits today" />);
    expect(screen.getByText('+42')).toBeTruthy();
    expect(screen.getByText('Credits today')).toBeTruthy();
  });
});
