import { Feather } from '@expo/vector-icons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { categoryColor } from '@/domain/categories';
import { goalProgress, goalProgressLabel } from '@/domain/goals';
import { daysUntil, formatShortDate } from '@/lib/date';
import { colors, elevation, radius, spacing } from '@/theme';
import type { Goal } from '@/types';

import { ProgressBar } from './ui/Progress';
import { Text } from './ui/Text';

interface GoalCardProps {
  goal: Goal;
  onPress?: (goal: Goal) => void;
}

export const GoalCard = memo(function GoalCard({ goal, onPress }: GoalCardProps) {
  const accent = categoryColor(goal.category);
  const progress = goalProgress(goal);
  const remaining = goal.deadline ? daysUntil(goal.deadline) : null;

  const deadlineLabel =
    remaining === null
      ? null
      : remaining < 0
        ? 'Past deadline'
        : remaining === 0
          ? 'Due today'
          : remaining <= 30
            ? `${remaining} days left`
            : formatShortDate(goal.deadline!);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${goal.title}, ${Math.round(progress)} percent complete`}
      onPress={() => onPress?.(goal)}
      style={({ pressed }) => [styles.card, elevation.sm, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: accent.tint }]}>
          <Text style={styles.iconText}>{goal.icon}</Text>
        </View>
        <View style={styles.headerBody}>
          <Text variant="cardTitle" numberOfLines={2}>
            {goal.title}
          </Text>
          <Text variant="meta">{goalProgressLabel(goal)}</Text>
        </View>
        <View style={styles.percentBlock}>
          <Text variant="sectionTitle" weight="bold" color={accent.base}>
            {Math.round(progress)}%
          </Text>
        </View>
      </View>

      <ProgressBar
        value={progress}
        fillColor={accent.base}
        trackColor={accent.tint}
        label={`${goal.title} progress`}
        style={styles.bar}
      />

      {deadlineLabel ? (
        <View style={styles.footer}>
          <Feather
            name="calendar"
            size={12}
            color={remaining !== null && remaining < 7 ? colors.warning : colors.textTertiary}
          />
          <Text
            variant="meta"
            color={remaining !== null && remaining < 7 ? colors.warning : colors.textTertiary}
          >
            {deadlineLabel}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20, lineHeight: 25 },
  headerBody: { flex: 1, gap: 3 },
  percentBlock: { alignItems: 'flex-end' },
  bar: { marginTop: -2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pressed: { opacity: 0.93 },
});
