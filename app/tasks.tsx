import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Segmented,
  TaskCard,
  Text,
} from '@/components';
import { formatShortDate, todayKey } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { colors, spacing } from '@/theme';

type Tab = 'today' | 'upcoming' | 'completed';

const PRIORITY_RANK = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as const;

export default function TasksScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('today');

  const tasks = useAppStore((s) => s.tasks);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const today = todayKey();

  const { todayTasks, upcoming, completed } = useMemo(() => {
    const open = tasks.filter((t) => t.status === 'TODO' || t.status === 'IN_PROGRESS');
    return {
      todayTasks: open
        .filter((t) => !t.dueDate || t.dueDate <= today)
        .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]),
      upcoming: open
        .filter((t) => t.dueDate && t.dueDate > today)
        .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1)),
      completed: tasks
        .filter((t) => t.status === 'COMPLETED')
        .sort((a, b) => ((a.completedAt ?? '') < (b.completedAt ?? '') ? 1 : -1))
        .slice(0, 50),
    };
  }, [tasks, today]);

  const visible = tab === 'today' ? todayTasks : tab === 'upcoming' ? upcoming : completed;
  const overdue = todayTasks.filter((t) => t.dueDate && t.dueDate < today).length;

  const emptyCopy = {
    today: {
      emoji: '\u{1F4DD}',
      title: 'No tasks yet',
      body: 'Start by adding one important thing you want to accomplish today.',
    },
    upcoming: {
      emoji: '\u{1F5D3}️',
      title: 'Nothing scheduled ahead',
      body: 'When you know something is coming, park it here so it stops taking up room in your head.',
    },
    completed: {
      emoji: '✅',
      title: 'Nothing completed yet',
      body: 'Finished tasks land here with the credits they earned.',
    },
  }[tab];

  return (
    <Screen>
      <ScreenHeader
        title="Tasks"
        subtitle={
          overdue > 0
            ? `${overdue} carried over from earlier days`
            : 'One list. Priority first, not due-date first.'
        }
      />

      <View style={styles.block}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: 'today', label: `Today${todayTasks.length ? ` (${todayTasks.length})` : ''}` },
            { value: 'upcoming', label: 'Upcoming' },
            { value: 'completed', label: 'Done' },
          ]}
        />
      </View>

      <View style={styles.list}>
        {visible.length > 0 ? (
          visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={toggleTask}
              onPress={() => router.push({ pathname: '/task-editor', params: { id: task.id } })}
              showDate={
                tab === 'upcoming' && task.dueDate
                  ? formatShortDate(task.dueDate)
                  : tab === 'completed' && task.completedAt
                    ? formatShortDate(task.completedAt.slice(0, 10))
                    : undefined
              }
            />
          ))
        ) : (
          <Card>
            <EmptyState
              emoji={emptyCopy.emoji}
              title={emptyCopy.title}
              body={emptyCopy.body}
              actionLabel={tab === 'completed' ? undefined : 'Add task'}
              onAction={tab === 'completed' ? undefined : () => router.push('/task-editor')}
            />
          </Card>
        )}
      </View>

      {tab !== 'completed' ? (
        <View style={styles.block}>
          <Button
            label="Add task"
            icon="plus"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/task-editor')}
          />
        </View>
      ) : null}

      {tab === 'completed' && completed.length > 0 ? (
        <Text variant="meta" center style={styles.footnote}>
          Showing your {completed.length} most recent completions
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, marginBottom: spacing.lg },
  footnote: { color: colors.textTertiary },
});
