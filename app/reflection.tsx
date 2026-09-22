import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Field,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Text,
} from '@/components';
import { formatDuration, formatShortDate, todayKey } from '@/lib/date';
import { formatCredits } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { dailyRecord } from '@/store/selectors';
import { useAppStore } from '@/store/useAppStore';
import { colors, radius, spacing } from '@/theme';

const MOODS = [
  { value: 1, emoji: '\u{1F622}', label: 'Rough' },
  { value: 2, emoji: '\u{1F615}', label: 'Off' },
  { value: 3, emoji: '\u{1F610}', label: 'Fine' },
  { value: 4, emoji: '\u{1F642}', label: 'Good' },
  { value: 5, emoji: '\u{1F604}', label: 'Great' },
];

const ENERGY = [
  { value: 1, label: 'Drained' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Steady' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Charged' },
];

export default function ReflectionScreen() {
  const router = useRouter();
  const { date } = useLocalSearchParams<{ date?: string }>();
  const dateKey = date ?? todayKey();

  const state = useAppStore();
  const saveReflection = useAppStore((s) => s.saveReflection);
  const existing = useMemo(
    () => state.reflections.find((r) => r.date === dateKey),
    [state.reflections, dateKey],
  );
  const record = useMemo(() => dailyRecord(state, dateKey), [state, dateKey]);

  const [wentWell, setWentWell] = useState(existing?.wentWell ?? '');
  const [couldBeBetter, setCouldBeBetter] = useState(existing?.couldBeBetter ?? '');
  const [learned, setLearned] = useState(existing?.learned ?? '');
  const [tomorrow, setTomorrow] = useState(existing?.tomorrow ?? '');
  const [mood, setMood] = useState(existing?.mood ?? 3);
  const [energy, setEnergy] = useState(existing?.energy ?? 3);

  const save = () => {
    haptic.success();
    saveReflection({
      date: dateKey,
      wentWell: wentWell.trim() || undefined,
      couldBeBetter: couldBeBetter.trim() || undefined,
      learned: learned.trim() || undefined,
      tomorrow: tomorrow.trim() || undefined,
      mood,
      energy,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <ScreenHeader
          title={existing ? 'Your reflection' : 'How was today?'}
          subtitle={
            dateKey === todayKey()
              ? 'Two minutes now makes tomorrow easier to plan.'
              : formatShortDate(dateKey)
          }
        />

        {/* The day in numbers, so the writing has something to sit against */}
        <View style={styles.block}>
          <Card tone="tinted">
            <Text variant="overline" color={colors.primaryDark} style={styles.recapLabel}>
              Your day, on the record
            </Text>
            <View style={styles.recap}>
              <Recap value={String(record.lifeScore)} label="Life Score" />
              <Recap value={formatCredits(record.creditsEarned)} label="Credits" />
              <Recap value={`${record.tasksCompleted}/${record.tasksTotal}`} label="Tasks" />
              <Recap value={`${record.habitsCompleted}/${record.habitsTotal}`} label="Habits" />
              <Recap value={formatDuration(record.focusMinutes)} label="Focus" />
            </View>
          </Card>
        </View>

        <View style={styles.form}>
          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              How do you feel?
            </Text>
            <View style={styles.moodRow}>
              {MOODS.map((option) => {
                const active = option.value === mood;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={option.label}
                    onPress={() => {
                      haptic.select();
                      setMood(option.value);
                    }}
                    style={[styles.mood, active && styles.moodActive]}
                  >
                    <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    <Text
                      variant="meta"
                      weight={active ? 'semibold' : 'medium'}
                      color={active ? colors.primaryDark : colors.textTertiary}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Energy
            </Text>
            <View style={styles.energyRow}>
              {ENERGY.map((option) => {
                const active = option.value <= energy;
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: option.value === energy }}
                    accessibilityLabel={`Energy ${option.label}`}
                    onPress={() => {
                      haptic.select();
                      setEnergy(option.value);
                    }}
                    style={[styles.energyBar, active && styles.energyBarActive]}
                  />
                );
              })}
            </View>
            <Text variant="meta">{ENERGY[energy - 1].label}</Text>
          </View>

          <Field
            label="What went well today?"
            value={wentWell}
            onChangeText={setWentWell}
            placeholder="Even one thing counts."
            multiline
          />

          <Field
            label="What could be better?"
            value={couldBeBetter}
            onChangeText={setCouldBeBetter}
            placeholder="Describe it plainly, without the self-criticism."
            multiline
          />

          <Field
            label="What did you learn?"
            value={learned}
            onChangeText={setLearned}
            placeholder="About the work, or about yourself."
            multiline
          />

          <Field
            label="Tomorrow I will..."
            value={tomorrow}
            onChangeText={setTomorrow}
            placeholder="One sentence. The first thing you will do."
            multiline
          />

          <Button
            label={existing ? 'Update reflection' : 'Save reflection'}
            fullWidth
            size="lg"
            icon="check"
            onPress={save}
          />

          <Text variant="meta" center>
            {existing
              ? 'Updating does not award credits twice.'
              : `Completing a reflection earns ${state.creditRules.reflection} credits.`}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Recap({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.recapItem}>
      <Text variant="bodyStrong" weight="semibold">
        {value}
      </Text>
      <Text variant="meta">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.xl },
  form: { paddingHorizontal: SCREEN_PADDING, gap: spacing.xl, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  recapLabel: { marginBottom: spacing.md },
  recap: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  recapItem: { alignItems: 'center', gap: 1, flex: 1 },
  moodRow: { flexDirection: 'row', gap: spacing.sm },
  mood: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 64,
  },
  moodActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  moodEmoji: { fontSize: 22, lineHeight: 27 },
  energyRow: { flexDirection: 'row', gap: spacing.sm },
  energyBar: {
    flex: 1,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSunken,
  },
  energyBarActive: { backgroundColor: colors.primarySoft },
});
