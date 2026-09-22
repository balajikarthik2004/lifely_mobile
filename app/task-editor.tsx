import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Field,
  OptionGrid,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Segmented,
  Stepper,
  Text,
} from '@/components';
import { CATEGORY_META, PRIORITY_META } from '@/domain/categories';
import { creditsForPriority } from '@/domain/credits';
import { addDays, format, todayKey } from '@/lib/date';
import { accents, colors, spacing } from '@/theme';
import { useAppStore } from '@/store/useAppStore';
import { CATEGORIES, PRIORITIES, type Category, type Priority } from '@/types';

type Due = 'today' | 'tomorrow' | 'week' | 'none';

export default function TaskEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const tasks = useAppStore((s) => s.tasks);
  const goals = useAppStore((s) => s.goals);
  const rules = useAppStore((s) => s.creditRules);
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);
  const deleteTask = useAppStore((s) => s.deleteTask);

  const existing = useMemo(() => tasks.find((t) => t.id === id), [tasks, id]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'WORK');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'MEDIUM');
  const [dueTime, setDueTime] = useState(existing?.dueTime ?? '');
  const [estimate, setEstimate] = useState(existing?.estimatedMinutes ?? 30);
  const [goalId, setGoalId] = useState<string | undefined>(existing?.goalId);
  const [credits, setCredits] = useState(
    existing?.creditValue ?? creditsForPriority('MEDIUM', rules),
  );
  const [creditsTouched, setCreditsTouched] = useState(Boolean(existing));
  const [due, setDue] = useState<Due>(() => {
    if (!existing?.dueDate) return 'today';
    if (existing.dueDate === todayKey()) return 'today';
    if (existing.dueDate === format(addDays(new Date(), 1), 'yyyy-MM-dd')) return 'tomorrow';
    return 'week';
  });
  const [error, setError] = useState<string | undefined>();

  const changePriority = (next: Priority) => {
    setPriority(next);
    // Credits follow priority until the user overrides them by hand.
    if (!creditsTouched) setCredits(creditsForPriority(next, rules));
  };

  const dueDate = (() => {
    switch (due) {
      case 'today':
        return todayKey();
      case 'tomorrow':
        return format(addDays(new Date(), 1), 'yyyy-MM-dd');
      case 'week':
        return format(addDays(new Date(), 7), 'yyyy-MM-dd');
      default:
        return undefined;
    }
  })();

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('Give it a name you will recognise later.');
      return;
    }

    const payload = {
      title: trimmed,
      description: description.trim() || undefined,
      category,
      priority,
      dueDate,
      dueTime: dueTime.trim() || undefined,
      estimatedMinutes: estimate,
      creditValue: credits,
      goalId,
    };

    if (existing) updateTask(existing.id, payload);
    else addTask(payload);

    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this task?', 'Its credits and timeline entry go with it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteTask(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.flex}
    >
      <Screen>
        <ScreenHeader
          title={existing ? 'Edit task' : 'New task'}
          subtitle={existing ? undefined : 'Only the title is required.'}
        />

        <View style={styles.form}>
          <Field
            label="What needs doing?"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Finish the ERP testing round"
            autoFocus={!existing}
            returnKeyType="next"
            error={error}
          />

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Priority
            </Text>
            <OptionGrid
              value={priority}
              onChange={changePriority}
              options={PRIORITIES.map((p) => ({
                value: p,
                label: PRIORITY_META[p].label,
                color: accents[PRIORITY_META[p].accent].base,
                tint: accents[PRIORITY_META[p].accent].tint,
              }))}
            />
          </View>

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Category
            </Text>
            <OptionGrid
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_META[c].label,
                icon: CATEGORY_META[c].icon,
                color: accents[CATEGORY_META[c].accent].base,
                tint: accents[CATEGORY_META[c].accent].tint,
              }))}
            />
          </View>

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              When
            </Text>
            <Segmented
              value={due}
              onChange={setDue}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'tomorrow', label: 'Tomorrow' },
                { value: 'week', label: 'In a week' },
                { value: 'none', label: 'Someday' },
              ]}
            />
          </View>

          <Field
            label="Time of day (optional)"
            value={dueTime}
            onChangeText={setDueTime}
            placeholder="09:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
          />

          <Card>
            <View style={styles.cardGroup}>
              <Stepper
                label="Estimated time"
                value={estimate}
                onChange={setEstimate}
                step={15}
                min={5}
                max={480}
                suffix="min"
              />
              <View style={styles.divider} />
              <Stepper
                label="Credits"
                value={credits}
                onChange={(value) => {
                  setCreditsTouched(true);
                  setCredits(value);
                }}
                step={5}
                min={0}
                max={100}
              />
            </View>
          </Card>

          {goals.length > 0 ? (
            <View style={styles.group}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Connect to a goal (optional)
              </Text>
              <OptionGrid
                value={goalId ?? ''}
                onChange={(value) => setGoalId(value === goalId ? undefined : value)}
                options={goals
                  .filter((g) => g.status === 'ACTIVE')
                  .map((g) => ({ value: g.id, label: g.title, icon: g.icon }))}
              />
            </View>
          ) : null}

          <Field
            label="Notes (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Anything you will want to remember when you start"
            multiline
          />

          <Button label={existing ? 'Save changes' : 'Add task'} fullWidth size="lg" onPress={save} />

          {existing ? (
            <Button label="Delete task" variant="danger" fullWidth onPress={confirmDelete} />
          ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  form: { paddingHorizontal: SCREEN_PADDING, gap: spacing.xl, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  cardGroup: { gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
