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
  Stepper,
  Text,
} from '@/components';
import { CATEGORY_META } from '@/domain/categories';
import { formatTime, minutesBetween, todayKey } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { accents, colors, MIN_TOUCH, radius, spacing } from '@/theme';
import { CATEGORIES, type Category } from '@/types';

const QUICK_LOGS = [
  { title: 'Workout', icon: '\u{1F3CB}️', category: 'HEALTH' as Category, minutes: 45, credits: 10 },
  { title: 'Deep work', icon: '\u{1F4BB}', category: 'WORK' as Category, minutes: 90, credits: 15 },
  { title: 'Reading', icon: '\u{1F4D6}', category: 'LEARNING' as Category, minutes: 30, credits: 5 },
  { title: 'Learning', icon: '\u{1F4DA}', category: 'LEARNING' as Category, minutes: 30, credits: 5 },
  { title: 'Meal', icon: '\u{1F371}', category: 'PERSONAL' as Category, minutes: 30, credits: 0 },
  { title: 'Family time', icon: '❤️', category: 'FAMILY' as Category, minutes: 60, credits: 5 },
  { title: 'Meeting', icon: '\u{1F465}', category: 'WORK' as Category, minutes: 45, credits: 5 },
  { title: 'Rest', icon: '\u{1F6CB}️', category: 'PERSONAL' as Category, minutes: 30, credits: 0 },
];

export default function ActivityEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    date?: string;
    startTime?: string;
    endTime?: string;
  }>();

  const activities = useAppStore((s) => s.activities);
  const addActivity = useAppStore((s) => s.addActivity);
  const updateActivity = useAppStore((s) => s.updateActivity);
  const deleteActivity = useAppStore((s) => s.deleteActivity);

  const existing = useMemo(
    () => activities.find((a) => a.id === params.id),
    [activities, params.id],
  );

  /** Pre-fill from a tapped timeline gap so filling one takes two taps. */
  const gapMinutes =
    params.startTime && params.endTime ? minutesBetween(params.startTime, params.endTime) : undefined;

  const [title, setTitle] = useState(existing?.title ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? '✨');
  const [category, setCategory] = useState<Category>(existing?.category ?? 'PERSONAL');
  const [duration, setDuration] = useState(existing?.durationMinutes ?? gapMinutes ?? 30);
  const [credits, setCredits] = useState(existing?.creditsEarned ?? 5);
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [error, setError] = useState<string | undefined>();

  const startTime =
    existing?.startTime ??
    params.startTime ??
    (params.date && params.date !== todayKey()
      ? `${params.date}T12:00:00.000Z`
      : new Date(Date.now() - duration * 60000).toISOString());

  const applyQuickLog = (preset: (typeof QUICK_LOGS)[number]) => {
    haptic.select();
    setTitle(preset.title);
    setIcon(preset.icon);
    setCategory(preset.category);
    setDuration(gapMinutes ?? preset.minutes);
    setCredits(preset.credits);
  };

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('What did you do?');
      return;
    }

    const endTime = new Date(new Date(startTime).getTime() + duration * 60000).toISOString();
    const payload = {
      title: trimmed,
      icon,
      category,
      startTime,
      endTime,
      durationMinutes: duration,
      creditsEarned: credits,
      notes: notes.trim() || undefined,
    };

    if (existing) updateActivity(existing.id, payload);
    else addActivity(payload);

    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Remove from your timeline?', 'Any credits it earned are removed with it.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteActivity(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <ScreenHeader
          title={existing ? 'Edit activity' : 'Log an activity'}
          subtitle={
            gapMinutes
              ? `Filling the ${gapMinutes} minute gap from ${formatTime(params.startTime!)}`
              : existing
                ? formatTime(existing.startTime)
                : 'What you actually did, not what you meant to do.'
          }
        />

        {!existing ? (
          <View style={styles.block}>
            <Text variant="smallStrong" color={colors.textSecondary} style={styles.quickLabel}>
              Quick log
            </Text>
            <View style={styles.quickGrid}>
              {QUICK_LOGS.map((preset) => (
                <Pressable
                  key={preset.title}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${preset.title}`}
                  onPress={() => applyQuickLog(preset)}
                  style={({ pressed }) => [
                    styles.quickChip,
                    title === preset.title && styles.quickChipActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.quickEmoji}>{preset.icon}</Text>
                  <Text variant="meta" weight="semibold" color={colors.text}>
                    {preset.title}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.form}>
          <Field
            label="Activity"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Deep work on the ERP module"
            error={error}
          />

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Category
            </Text>
            <OptionGrid
              value={category}
              onChange={(value) => {
                setCategory(value);
                if (!existing && !QUICK_LOGS.some((p) => p.title === title)) {
                  setIcon(CATEGORY_META[value].icon);
                }
              }}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: CATEGORY_META[c].label,
                icon: CATEGORY_META[c].icon,
                color: accents[CATEGORY_META[c].accent].base,
                tint: accents[CATEGORY_META[c].accent].tint,
              }))}
            />
          </View>

          <Card>
            <View style={styles.cardGroup}>
              <Stepper
                label="How long"
                value={duration}
                onChange={setDuration}
                step={15}
                min={5}
                max={600}
                suffix="min"
              />
              <View style={styles.divider} />
              <Stepper label="Credits" value={credits} onChange={setCredits} step={5} min={0} max={60} />
            </View>
          </Card>

          <Field
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Worth remembering when you look back"
            multiline
          />

          <Button
            label={existing ? 'Save changes' : 'Add to timeline'}
            fullWidth
            size="lg"
            onPress={save}
          />

          {existing ? (
            <Button label="Delete activity" variant="danger" fullWidth onPress={confirmDelete} />
          ) : null}
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { paddingHorizontal: SCREEN_PADDING, marginBottom: spacing.xl },
  form: { paddingHorizontal: SCREEN_PADDING, gap: spacing.xl, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  cardGroup: { gap: spacing.lg },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  quickLabel: { marginBottom: spacing.sm },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: MIN_TOUCH,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  quickEmoji: { fontSize: 15 },
  pressed: { opacity: 0.85 },
});
