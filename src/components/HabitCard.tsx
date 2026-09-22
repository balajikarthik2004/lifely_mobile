import { Feather } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { categoryColor } from '@/domain/categories';
import { currentStreak, dayState, isScheduled } from '@/domain/habits';
import { lastNDays, todayKey, weekdayLetter } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { colors, elevation, radius, spacing } from '@/theme';
import type { Habit } from '@/types';

import { Text } from './ui/Text';

interface HabitCardProps {
  habit: Habit;
  onToggle: (id: string) => void;
  onPress?: (habit: Habit) => void;
}

const WEEK_LENGTH = 7;

export const HabitCard = memo(function HabitCard({ habit, onToggle, onPress }: HabitCardProps) {
  const today = todayKey();
  const accent = categoryColor(habit.category);
  const scale = useSharedValue(1);

  const week = useMemo(() => lastNDays(WEEK_LENGTH), []);
  const streak = currentStreak(habit, today);
  const done = habit.log[today] === 'COMPLETED';
  const skipped = habit.log[today] === 'SKIPPED';
  const scheduledToday = isScheduled(habit, today);

  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const toggle = () => {
    if (!done) {
      haptic.success();
      scale.value = withSequence(withSpring(1.15, { damping: 11 }), withSpring(1, { damping: 14 }));
    } else {
      haptic.tap();
    }
    onToggle(habit.id);
  };

  const stateLabel = done
    ? 'Completed'
    : skipped
      ? 'Rest day'
      : scheduledToday
        ? 'Not done yet'
        : 'Not scheduled today';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${habit.name}. ${stateLabel}. ${streak} day streak.`}
      onPress={() => onPress?.(habit)}
      style={({ pressed }) => [styles.card, elevation.sm, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: accent.tint }]}>
        <Text style={styles.iconText}>{habit.icon}</Text>
      </View>

      <View style={styles.body}>
        <Text variant="cardTitle" numberOfLines={1}>
          {habit.name}
        </Text>

        <View style={styles.metaRow}>
          {streak > 0 ? (
            <View style={styles.streak}>
              <Text variant="meta" weight="semibold" color={colors.warning}>
                {'\u{1F525}'} {streak} day{streak === 1 ? '' : 's'}
              </Text>
            </View>
          ) : (
            <Text variant="meta">{scheduledToday ? 'Start a streak today' : 'Rest day'}</Text>
          )}
          <Text variant="meta">·</Text>
          <Text variant="meta">+{habit.creditValue}</Text>
        </View>

        <View style={styles.week} accessibilityLabel={`Last ${WEEK_LENGTH} days`}>
          {week.map((key) => {
            const state = dayState(habit, key, today);
            return (
              <View key={key} style={styles.dayColumn}>
                <View
                  style={[
                    styles.dot,
                    state === 'COMPLETED' && { backgroundColor: accent.base, borderColor: accent.base },
                    state === 'MISSED' && styles.dotMissed,
                    state === 'SKIPPED' && styles.dotSkipped,
                  ]}
                />
                <Text variant="meta" style={styles.dayLabel}>
                  {weekdayLetter(key)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <Animated.View style={animated}>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done }}
          accessibilityLabel={done ? `Undo ${habit.name}` : `Complete ${habit.name}`}
          hitSlop={10}
          onPress={toggle}
          style={[
            styles.check,
            done && { backgroundColor: accent.base, borderColor: accent.base },
            skipped && styles.checkSkipped,
          ]}
        >
          {done ? (
            <Feather name="check" size={17} color={colors.textInverse} />
          ) : skipped ? (
            <Feather name="minus" size={17} color={colors.textTertiary} />
          ) : null}
        </Pressable>
      </Animated.View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 21, lineHeight: 26 },
  body: { flex: 1, gap: 5 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streak: { flexDirection: 'row', alignItems: 'center' },
  week: { flexDirection: 'row', gap: spacing.sm, marginTop: 3 },
  dayColumn: { alignItems: 'center', gap: 3 },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: 'transparent',
  },
  dotMissed: { borderColor: colors.border, backgroundColor: colors.surfaceSunken },
  dotSkipped: { borderStyle: 'dashed', borderColor: colors.borderStrong },
  dayLabel: { fontSize: 9, lineHeight: 12 },
  check: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkSkipped: { borderStyle: 'dashed' },
  pressed: { opacity: 0.93 },
});
