import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Field,
  ProgressRing,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  SectionHeader,
  Text,
} from '@/components';
import { categoryColor, CATEGORY_META } from '@/domain/categories';
import { goalProgress, goalProgressLabel } from '@/domain/goals';
import { currentStreak } from '@/domain/habits';
import { daysUntil, formatShortDate, todayKey } from '@/lib/date';
import { formatNumber } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

export default function GoalDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const goal = useAppStore((s) => s.goals.find((g) => g.id === id));
  const tasks = useAppStore((s) => s.tasks);
  const habits = useAppStore((s) => s.habits);
  const transactions = useAppStore((s) => s.transactions);
  const addMilestone = useAppStore((s) => s.addMilestone);
  const toggleMilestone = useAppStore((s) => s.toggleMilestone);
  const removeMilestone = useAppStore((s) => s.removeMilestone);
  const updateGoal = useAppStore((s) => s.updateGoal);

  const [newMilestone, setNewMilestone] = useState('');
  const [valueDraft, setValueDraft] = useState('');

  const linkedTasks = useMemo(() => tasks.filter((t) => t.goalId === id), [tasks, id]);
  const linkedHabits = useMemo(() => habits.filter((h) => h.goalId === id), [habits, id]);

  const creditsEarned = useMemo(() => {
    if (!goal) return 0;
    const milestoneIds = new Set(goal.milestones.map((m) => m.id));
    const taskIds = new Set(linkedTasks.map((t) => t.id));
    return transactions
      .filter((t) => (t.sourceId && milestoneIds.has(t.sourceId)) || (t.sourceId && taskIds.has(t.sourceId)))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [goal, linkedTasks, transactions]);

  if (!goal) {
    return (
      <Screen>
        <ScreenHeader title="Goal not found" />
        <View style={styles.block}>
          <Card>
            <Text variant="body">This goal has been deleted.</Text>
          </Card>
          <Button label="Back to goals" style={styles.spaced} onPress={() => router.replace('/goals')} />
        </View>
      </Screen>
    );
  }

  const accent = categoryColor(goal.category);
  const progress = goalProgress(goal);
  const remaining = goal.deadline ? daysUntil(goal.deadline) : null;
  const completedTasks = linkedTasks.filter((t) => t.status === 'COMPLETED').length;

  const submitMilestone = () => {
    const trimmed = newMilestone.trim();
    if (!trimmed) return;
    haptic.tap();
    addMilestone(goal.id, trimmed);
    setNewMilestone('');
  };

  const logProgress = () => {
    const value = Number(valueDraft.replace(/[^0-9.]/g, ''));
    if (!value || Number.isNaN(value)) return;
    haptic.success();
    updateGoal(goal.id, { currentValue: (goal.currentValue ?? 0) + value });
    setValueDraft('');
  };

  return (
    <Screen>
      <ScreenHeader
        title={goal.title}
        subtitle={goal.why}
        right={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit goal"
            onPress={() => router.push({ pathname: '/goal-editor', params: { id: goal.id } })}
            style={({ pressed }) => [styles.editButton, pressed && styles.pressed]}
          >
            <Feather name="edit-2" size={15} color={colors.primaryDark} />
          </Pressable>
        }
      />

      {/* Progress hero */}
      <View style={styles.block}>
        <Card>
          <View style={styles.hero}>
            <ProgressRing
              value={progress}
              size={126}
              strokeWidth={12}
              color={accent.base}
              trackColor={accent.tint}
              label={`${goal.title} progress`}
            >
              <Text variant="screenTitle" weight="bold" color={accent.base}>
                {Math.round(progress)}%
              </Text>
            </ProgressRing>

            <View style={styles.heroBody}>
              <Text variant="cardTitle">{goalProgressLabel(goal)}</Text>
              <Text variant="small" color={colors.textSecondary}>
                {CATEGORY_META[goal.category].label}
              </Text>
              {goal.deadline ? (
                <Text
                  variant="small"
                  color={remaining !== null && remaining < 14 ? colors.warning : colors.textSecondary}
                >
                  {remaining !== null && remaining >= 0
                    ? `${remaining} days left · ${formatShortDate(goal.deadline)}`
                    : `Deadline passed · ${formatShortDate(goal.deadline)}`}
                </Text>
              ) : (
                <Text variant="small" color={colors.textSecondary}>
                  No deadline
                </Text>
              )}
              {creditsEarned > 0 ? (
                <Text variant="small" color={colors.primary} weight="medium">
                  {formatNumber(creditsEarned)} credits earned here
                </Text>
              ) : null}
            </View>
          </View>
        </Card>
      </View>

      {/* Numeric progress */}
      {typeof goal.targetValue === 'number' ? (
        <View style={styles.block}>
          <Card>
            <Text variant="cardTitle" style={styles.cardHeading}>
              Log progress
            </Text>
            <View style={styles.logRow}>
              <Field
                label={`Add ${goal.unit ?? 'amount'}`}
                value={valueDraft}
                onChangeText={setValueDraft}
                placeholder="0"
                keyboardType="numeric"
                containerStyle={styles.flex}
              />
              <Button label="Add" onPress={logProgress} style={styles.logButton} />
            </View>
          </Card>
        </View>
      ) : null}

      {/* Milestones */}
      <SectionHeader title="Milestones" />
      <View style={styles.block}>
        <Card padded={false}>
          {goal.milestones.length === 0 ? (
            <View style={styles.emptyMilestones}>
              <Text variant="small" color={colors.textSecondary}>
                Break this into steps you could finish in a week each. It makes the goal move.
              </Text>
            </View>
          ) : (
            goal.milestones.map((milestone, index) => (
              <View
                key={milestone.id}
                style={[styles.milestone, index < goal.milestones.length - 1 && styles.milestoneBorder]}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: milestone.isCompleted }}
                  accessibilityLabel={milestone.title}
                  hitSlop={8}
                  onPress={() => {
                    haptic.success();
                    toggleMilestone(goal.id, milestone.id);
                  }}
                  style={[
                    styles.checkbox,
                    milestone.isCompleted && { backgroundColor: accent.base, borderColor: accent.base },
                  ]}
                >
                  {milestone.isCompleted ? (
                    <Feather name="check" size={13} color={colors.textInverse} />
                  ) : null}
                </Pressable>

                <Text
                  variant="body"
                  style={[styles.milestoneTitle, milestone.isCompleted && styles.milestoneDone]}
                  color={milestone.isCompleted ? colors.textTertiary : colors.text}
                >
                  {milestone.title}
                </Text>

                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${milestone.title}`}
                  hitSlop={8}
                  onPress={() => removeMilestone(goal.id, milestone.id)}
                  style={({ pressed }) => pressed && styles.pressed}
                >
                  <Feather name="x" size={15} color={colors.textTertiary} />
                </Pressable>
              </View>
            ))
          )}

          <View style={styles.addMilestone}>
            <Field
              label="Add a milestone"
              value={newMilestone}
              onChangeText={setNewMilestone}
              placeholder="e.g. Ship the first working prototype"
              returnKeyType="done"
              onSubmitEditing={submitMilestone}
              containerStyle={styles.flex}
            />
            <Button label="Add" variant="secondary" onPress={submitMilestone} style={styles.logButton} />
          </View>
        </Card>
      </View>

      {/* Linked work */}
      {linkedHabits.length > 0 ? (
        <>
          <SectionHeader title="Habits feeding this" />
          <View style={styles.block}>
            <Card padded={false}>
              {linkedHabits.map((habit, index) => (
                <View
                  key={habit.id}
                  style={[styles.linkRow, index < linkedHabits.length - 1 && styles.milestoneBorder]}
                >
                  <Text style={styles.linkIcon}>{habit.icon}</Text>
                  <Text variant="bodyStrong" style={styles.flex} numberOfLines={1}>
                    {habit.name}
                  </Text>
                  <Text variant="meta">{currentStreak(habit, todayKey())} day streak</Text>
                </View>
              ))}
            </Card>
          </View>
        </>
      ) : null}

      {linkedTasks.length > 0 ? (
        <>
          <SectionHeader
            title="Tasks"
            action="All tasks"
            onAction={() => router.push('/tasks')}
          />
          <View style={styles.block}>
            <Card>
              <Text variant="body">
                {completedTasks} of {linkedTasks.length} linked tasks completed.
              </Text>
              <Text variant="small" color={colors.textSecondary} style={styles.spacedSmall}>
                Completed tasks add credits and show on your timeline. They do not move the percentage
                on their own — milestones and targets do that, so the number stays something you chose.
              </Text>
            </Card>
          </View>
        </>
      ) : null}

      <View style={styles.block}>
        <Button
          label={goal.status === 'COMPLETED' ? 'Reopen goal' : 'Mark as achieved'}
          variant={goal.status === 'COMPLETED' ? 'secondary' : 'primary'}
          fullWidth
          icon={goal.status === 'COMPLETED' ? 'rotate-ccw' : 'award'}
          onPress={() => {
            haptic.success();
            updateGoal(goal.id, { status: goal.status === 'COMPLETED' ? 'ACTIVE' : 'COMPLETED' });
          }}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.lg },
  spaced: { marginTop: spacing.lg },
  spacedSmall: { marginTop: spacing.sm },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  heroBody: { flex: 1, gap: 3 },
  cardHeading: { marginBottom: spacing.md },
  logRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-end' },
  logButton: { minWidth: 80 },
  emptyMilestones: { padding: spacing.lg },
  milestone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  milestoneBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneTitle: { flex: 1 },
  milestoneDone: { textDecorationLine: 'line-through' },
  addMilestone: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-end',
    padding: spacing.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  linkIcon: { fontSize: 18 },
  pressed: { opacity: 0.6 },
});
