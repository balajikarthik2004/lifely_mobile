import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  EmptyState,
  HabitCard,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Text,
} from '@/components';
import { completedCount, scheduledHabits } from '@/domain/habits';
import { todayKey } from '@/lib/date';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

export default function HabitsScreen() {
  const router = useRouter();
  const today = todayKey();

  const habits = useAppStore((s) => s.habits);
  const toggleHabitDay = useAppStore((s) => s.toggleHabitDay);
  const skipHabitDay = useAppStore((s) => s.skipHabitDay);

  const scheduled = useMemo(() => scheduledHabits(habits, today), [habits, today]);
  const unscheduled = habits.filter((h) => !scheduled.includes(h));
  const done = completedCount(habits, today);

  const openHabit = (habitId: string, name: string) => {
    Alert.alert(name, undefined, [
      { text: 'Edit', onPress: () => router.push({ pathname: '/habit-editor', params: { id: habitId } }) },
      {
        text: 'Mark as rest day',
        onPress: () => skipHabitDay(habitId),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <ScreenHeader
        title="Habits"
        subtitle={
          scheduled.length > 0
            ? `${done} of ${scheduled.length} kept today`
            : 'The things you want to be true every week.'
        }
      />

      {scheduled.length > 0 ? (
        <View style={styles.banner}>
          <Text variant="small" color={colors.primaryDark}>
            {done === scheduled.length
              ? 'Everything scheduled for today is done. That is the whole job.'
              : 'A rest day is not a missed day — long-press a habit to mark one.'}
          </Text>
        </View>
      ) : null}

      <View style={styles.list}>
        {habits.length === 0 ? (
          <Card>
            <EmptyState
              emoji={'\u{1F501}'}
              title="No habits yet"
              body="Pick two or three. More than that and they tend to collapse together."
              actionLabel="Add habit"
              onAction={() => router.push('/habit-editor')}
            />
          </Card>
        ) : (
          <>
            {scheduled.map((habit) => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onToggle={toggleHabitDay}
                onPress={() => openHabit(habit.id, habit.name)}
              />
            ))}

            {unscheduled.length > 0 ? (
              <>
                <Text variant="overline" style={styles.sectionLabel}>
                  Not scheduled today
                </Text>
                {unscheduled.map((habit) => (
                  <View key={habit.id} style={styles.dimmed}>
                    <HabitCard
                      habit={habit}
                      onToggle={toggleHabitDay}
                      onPress={() => openHabit(habit.id, habit.name)}
                    />
                  </View>
                ))}
              </>
            ) : null}
          </>
        )}
      </View>

      {habits.length > 0 ? (
        <View style={styles.block}>
          <Button
            label="Add habit"
            icon="plus"
            variant="secondary"
            fullWidth
            onPress={() => router.push('/habit-editor')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: SCREEN_PADDING,
    marginBottom: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.primaryTint,
  },
  list: { paddingHorizontal: SCREEN_PADDING, gap: spacing.md, marginBottom: spacing.lg },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.xs },
  dimmed: { opacity: 0.62 },
});
