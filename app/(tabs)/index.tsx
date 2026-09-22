import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import {
  Button,
  Card,
  EmptyState,
  LifeScoreCard,
  MetricCard,
  ProgressBar,
  Screen,
  SCREEN_PADDING,
  SectionHeader,
  TaskCard,
  Text,
} from '@/components';
import { categoryColor } from '@/domain/categories';
import { scheduledHabits } from '@/domain/habits';
import { quoteForDate } from '@/domain/quotes';
import {
  formatDuration,
  formatLongDate,
  greetingEmoji,
  greetingFor,
  todayKey,
} from '@/lib/date';
import { formatCredits } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useLifeScore, useRecordsForRange, useToday } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, radius, spacing } from '@/theme';

export default function HomeScreen() {
  const router = useRouter();
  const today = todayKey();

  const profile = useAppStore((s) => s.profile);
  const habits = useAppStore((s) => s.habits);
  const tasks = useAppStore((s) => s.tasks);
  const focusSession = useAppStore((s) => s.focusSession);
  const toggleHabitDay = useAppStore((s) => s.toggleHabitDay);
  const toggleTask = useAppStore((s) => s.toggleTask);
  const reflections = useAppStore((s) => s.reflections);

  const breakdown = useLifeScore(today);
  const record = useToday();
  const week = useRecordsForRange(7);

  const averageScore = useMemo(() => {
    const past = week.filter((r) => r.date < today && r.lifeScore > 0);
    if (past.length === 0) return undefined;
    return past.reduce((sum, r) => sum + r.lifeScore, 0) / past.length;
  }, [week, today]);

  const todaysHabits = useMemo(() => scheduledHabits(habits, today), [habits, today]);
  const pendingHabits = todaysHabits.filter((h) => h.log[today] !== 'COMPLETED');

  const priorityTasks = useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'TODO' && (!t.dueDate || t.dueDate <= today))
        .sort((a, b) => {
          const rank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
          return rank[a.priority] - rank[b.priority];
        })
        .slice(0, 3),
    [tasks, today],
  );

  const nextUp = priorityTasks[0];
  const hasReflection = reflections.some((r) => r.date === today);
  const progress =
    record.tasksTotal + record.habitsTotal > 0
      ? ((record.tasksCompleted + record.habitsCompleted) /
          (record.tasksTotal + record.habitsTotal)) *
        100
      : 0;

  const isEmpty = habits.length === 0 && tasks.length === 0 && record.creditsEarned === 0;

  return (
    <Screen tabBarPadding>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open profile"
          onPress={() => router.push('/(tabs)/profile')}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          <Text style={styles.avatarText}>{profile.avatarEmoji}</Text>
        </Pressable>

        <View style={styles.headerBody}>
          <Text variant="screenTitle" numberOfLines={1}>
            {greetingFor()}, {profile.name.split(' ')[0]} {greetingEmoji()}
          </Text>
          <Text variant="small" color={colors.textSecondary}>
            {formatLongDate()}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open assistant"
          onPress={() => {
            haptic.tap();
            router.push('/assistant');
          }}
          style={({ pressed }) => [styles.headerAction, pressed && styles.pressed]}
        >
          <Feather name="message-circle" size={18} color={colors.primaryDark} />
        </Pressable>
      </View>

      <Animated.View entering={FadeInDown.duration(320)} style={styles.block}>
        <Text variant="small" color={colors.textSecondary} style={styles.quote}>
          {'“'}
          {quoteForDate(today)}
          {'”'}
        </Text>
      </Animated.View>

      {isEmpty ? (
        <View style={styles.block}>
          <Card>
            <EmptyState
              emoji={'\u{1F331}'}
              title="Your day is a blank page"
              body="Add one task or one habit and Lifely starts keeping score with you. It takes about ten seconds."
              actionLabel="Add something"
              onAction={() => router.push('/quick-add')}
            />
          </Card>
        </View>
      ) : null}

      {/* Life Score */}
      <Animated.View entering={FadeInDown.duration(360).delay(60)} style={styles.block}>
        <LifeScoreCard
          breakdown={breakdown}
          delta={averageScore !== undefined ? record.lifeScore - averageScore : undefined}
          onPress={() => router.push('/(tabs)/insights')}
        />
      </Animated.View>

      {/* Today's metrics */}
      <Animated.View entering={FadeInDown.duration(360).delay(120)} style={styles.block}>
        <View style={styles.metricRow}>
          <MetricCard
            icon="zap"
            value={formatCredits(record.creditsEarned)}
            label="Credits today"
            onPress={() => router.push('/credits')}
          />
          <MetricCard
            icon="repeat"
            value={`${record.habitsCompleted}/${record.habitsTotal}`}
            label="Habits"
            tint={colors.accentTintWarm}
            color={colors.warning}
            onPress={() => router.push('/habits')}
          />
        </View>
        <View style={styles.metricRow}>
          <MetricCard
            icon="check-square"
            value={`${record.tasksCompleted}/${record.tasksTotal}`}
            label="Tasks"
            tint={colors.infoTint}
            color={colors.info}
            onPress={() => router.push('/tasks')}
          />
          <MetricCard
            icon="target"
            value={formatDuration(record.focusMinutes)}
            label="Focused"
            tint={colors.accentTintCool}
            color={colors.accentCool}
            onPress={() => router.push('/(tabs)/timeline')}
          />
        </View>
      </Animated.View>

      {/* Today's progress */}
      <Animated.View entering={FadeInDown.duration(360).delay(180)} style={styles.block}>
        <Card>
          <View style={styles.progressHeader}>
            <Text variant="cardTitle">Today{'’'}s progress</Text>
            <Text variant="cardTitle" weight="bold" color={colors.primary}>
              {Math.round(progress)}%
            </Text>
          </View>
          <ProgressBar value={progress} height={10} label="Today's progress" />
          <Text variant="meta" style={styles.progressCaption}>
            {record.tasksCompleted + record.habitsCompleted} of{' '}
            {record.tasksTotal + record.habitsTotal} things done today
          </Text>
        </Card>
      </Animated.View>

      {/* Current focus */}
      <Animated.View entering={FadeInDown.duration(360).delay(220)} style={styles.block}>
        <View style={[styles.focusCard, elevation.md]}>
          <View style={styles.focusHeader}>
            <View style={styles.focusBadge}>
              <Feather name="target" size={13} color={colors.textInverse} />
            </View>
            <Text variant="overline" color={colors.primaryTintStrong}>
              {focusSession ? 'Session running' : 'Next up'}
            </Text>
          </View>

          <Text variant="sectionTitle" color={colors.textInverse} numberOfLines={2}>
            {focusSession?.title ?? nextUp?.title ?? 'Nothing scheduled'}
          </Text>
          <Text variant="small" color={colors.primaryTintStrong}>
            {focusSession
              ? `${focusSession.targetMinutes} minute block`
              : nextUp
                ? `${nextUp.dueTime ? `${nextUp.dueTime} · ` : ''}${
                    nextUp.estimatedMinutes ? formatDuration(nextUp.estimatedMinutes) : 'Unscheduled'
                  }`
                : 'Pick something worth two uninterrupted hours.'}
          </Text>

          <Button
            label={focusSession ? 'Return to session' : 'Start focus'}
            icon={focusSession ? 'play-circle' : 'play'}
            variant="secondary"
            fullWidth
            style={styles.focusButton}
            onPress={() => router.push('/focus')}
          />
        </View>
      </Animated.View>

      {/* Habits */}
      {todaysHabits.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader
            title={pendingHabits.length > 0 ? 'Habits to keep' : 'All habits kept'}
            action="See all"
            onAction={() => router.push('/habits')}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.habitStrip}
          >
            {todaysHabits.map((habit) => {
              const done = habit.log[today] === 'COMPLETED';
              const accent = categoryColor(habit.category);
              return (
                <Pressable
                  key={habit.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                  accessibilityLabel={`${habit.name}, ${done ? 'completed' : 'not done'}`}
                  onPress={() => toggleHabitDay(habit.id)}
                  style={({ pressed }) => [
                    styles.habitPill,
                    done && { backgroundColor: accent.tint, borderColor: accent.base },
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.habitEmoji}>{habit.icon}</Text>
                  <Text
                    variant="meta"
                    weight="semibold"
                    color={done ? accent.base : colors.textSecondary}
                    numberOfLines={1}
                    style={styles.habitLabel}
                  >
                    {habit.name}
                  </Text>
                  {done ? <Feather name="check" size={12} color={accent.base} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {/* Priority tasks */}
      <View style={styles.section}>
        <SectionHeader
          title="What matters today"
          action="All tasks"
          onAction={() => router.push('/tasks')}
        />
        <View style={styles.list}>
          {priorityTasks.length > 0 ? (
            priorityTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={toggleTask}
                onPress={() => router.push({ pathname: '/task-editor', params: { id: task.id } })}
              />
            ))
          ) : (
            <Card>
              <EmptyState
                compact
                emoji={'✅'}
                title="Nothing left on the list"
                body="Either you finished everything, or today deserves a plan. Both are fine."
                actionLabel="Add a task"
                onAction={() => router.push('/task-editor')}
              />
            </Card>
          )}
        </View>
      </View>

      {/* Close the loop */}
      <View style={styles.block}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hasReflection ? 'Edit today’s reflection' : 'Write today’s reflection'}
          onPress={() => router.push('/reflection')}
          style={({ pressed }) => [styles.insightCard, pressed && styles.pressed]}
        >
          <View style={styles.insightIcon}>
            <Text style={styles.insightEmoji}>{hasReflection ? '\u{1F31F}' : '\u{1F319}'}</Text>
          </View>
          <View style={styles.insightBody}>
            <Text variant="cardTitle">
              {hasReflection ? 'Reflection saved' : 'Close out your day'}
            </Text>
            <Text variant="small" color={colors.textSecondary}>
              {hasReflection
                ? 'Tap to revisit what you wrote tonight.'
                : 'Two minutes now makes tomorrow easier to plan.'}
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.textTertiary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: SCREEN_PADDING,
    marginBottom: spacing.md,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 22, lineHeight: 28 },
  headerBody: { flex: 1, gap: 1 },
  headerAction: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  section: { marginBottom: spacing.lg },
  quote: { fontStyle: 'italic', lineHeight: 20 },
  metricRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  progressCaption: { marginTop: spacing.sm },
  focusCard: {
    backgroundColor: colors.primaryDeep,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.xs,
  },
  focusHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  focusBadge: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  focusButton: { marginTop: spacing.lg },
  habitStrip: { paddingHorizontal: SCREEN_PADDING, gap: spacing.sm },
  habitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 44,
    maxWidth: 190,
  },
  habitEmoji: { fontSize: 15 },
  habitLabel: { flexShrink: 1 },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  insightIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightEmoji: { fontSize: 20, lineHeight: 25 },
  insightBody: { flex: 1, gap: 2 },
  pressed: { opacity: 0.9 },
});
