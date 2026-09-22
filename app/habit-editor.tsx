import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

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
import { CATEGORY_META } from '@/domain/categories';
import { currentStreak, longestStreak } from '@/domain/habits';
import { todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { accents, colors, MIN_TOUCH, radius, spacing } from '@/theme';
import { CATEGORIES, type Category, type HabitFrequency } from '@/types';

const ICONS = [
  '☀️', '\u{1F3CB}️', '\u{1F4D6}', '\u{1F9D8}', '\u{1F4BB}', '\u{1F4A7}',
  '\u{1F4F5}', '\u{1F634}', '\u{1F957}', '\u{1F3C3}', '✍️', '\u{1F3B8}',
];

const WEEKDAYS = [
  { value: 1, label: 'M' },
  { value: 2, label: 'T' },
  { value: 3, label: 'W' },
  { value: 4, label: 'T' },
  { value: 5, label: 'F' },
  { value: 6, label: 'S' },
  { value: 0, label: 'S' },
];

export default function HabitEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const habits = useAppStore((s) => s.habits);
  const goals = useAppStore((s) => s.goals);
  const addHabit = useAppStore((s) => s.addHabit);
  const updateHabit = useAppStore((s) => s.updateHabit);
  const deleteHabit = useAppStore((s) => s.deleteHabit);

  const existing = useMemo(() => habits.find((h) => h.id === id), [habits, id]);

  const [name, setName] = useState(existing?.name ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]);
  const [category, setCategory] = useState<Category>(existing?.category ?? 'PERSONAL');
  const [frequency, setFrequency] = useState<HabitFrequency>(existing?.frequency ?? 'DAILY');
  const [days, setDays] = useState<number[]>(existing?.days ?? [0, 1, 2, 3, 4, 5, 6]);
  const [credits, setCredits] = useState(existing?.creditValue ?? 5);
  const [reminder, setReminder] = useState(existing?.reminderTime ?? '');
  const [goalId, setGoalId] = useState<string | undefined>(existing?.goalId);
  const [error, setError] = useState<string | undefined>();

  const toggleDay = (day: number) => {
    haptic.select();
    setDays((current) =>
      current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort(),
    );
  };

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name it so you recognise it at 6am.');
      return;
    }
    if (frequency === 'CUSTOM' && days.length === 0) {
      setError('Pick at least one day.');
      return;
    }

    const payload = {
      name: trimmed,
      icon,
      category,
      frequency,
      days: frequency === 'DAILY' ? [0, 1, 2, 3, 4, 5, 6] : days,
      creditValue: credits,
      reminderTime: reminder.trim() || undefined,
      goalId,
    };

    if (existing) updateHabit(existing.id, payload);
    else addHabit(payload);

    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(
      'Delete this habit?',
      'Its streak history and the credits it earned are removed too.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteHabit(existing.id);
            router.back();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <ScreenHeader
          title={existing ? 'Edit habit' : 'New habit'}
          subtitle={
            existing
              ? `${currentStreak(existing, todayKey())} day streak · best ${longestStreak(existing)}`
              : 'Small and repeatable beats ambitious and occasional.'
          }
        />

        <View style={styles.form}>
          <Field
            label="Habit"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Read 20 pages"
            autoFocus={!existing}
            error={error}
          />

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Icon
            </Text>
            <View style={styles.iconGrid}>
              {ICONS.map((option) => (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected: option === icon }}
                  accessibilityLabel={`Icon ${option}`}
                  onPress={() => {
                    haptic.select();
                    setIcon(option);
                  }}
                  style={[styles.iconOption, option === icon && styles.iconOptionActive]}
                >
                  <Text style={styles.iconText}>{option}</Text>
                </Pressable>
              ))}
            </View>
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
              How often
            </Text>
            <Segmented
              value={frequency}
              onChange={(value) => {
                setFrequency(value);
                if (value === 'DAILY') setDays([0, 1, 2, 3, 4, 5, 6]);
                if (value === 'WEEKLY' && days.length === 7) setDays([1]);
              }}
              options={[
                { value: 'DAILY', label: 'Every day' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'CUSTOM', label: 'Chosen days' },
              ]}
            />
          </View>

          {frequency !== 'DAILY' ? (
            <View style={styles.group}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                Which days
              </Text>
              <View style={styles.dayRow}>
                {WEEKDAYS.map((day, index) => {
                  const active = days.includes(day.value);
                  return (
                    <Pressable
                      key={`${day.value}-${index}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={`Day ${day.label}`}
                      onPress={() => toggleDay(day.value)}
                      style={[styles.day, active && styles.dayActive]}
                    >
                      <Text
                        variant="smallStrong"
                        weight="semibold"
                        color={active ? colors.textInverse : colors.textSecondary}
                      >
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <Card>
            <Stepper label="Credits per day" value={credits} onChange={setCredits} step={1} min={0} max={50} />
          </Card>

          <Field
            label="Reminder time (optional)"
            value={reminder}
            onChangeText={setReminder}
            placeholder="07:00"
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            hint="Reminders are scheduled locally and can be turned off in Settings."
          />

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

          <Button label={existing ? 'Save changes' : 'Add habit'} fullWidth size="lg" onPress={save} />

          {existing ? (
            <Button label="Delete habit" variant="danger" fullWidth onPress={confirmDelete} />
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
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  iconOption: {
    width: MIN_TOUCH + 4,
    height: MIN_TOUCH + 4,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconOptionActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  iconText: { fontSize: 20, lineHeight: 25 },
  dayRow: { flexDirection: 'row', gap: spacing.sm },
  day: {
    flex: 1,
    height: MIN_TOUCH,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
});
