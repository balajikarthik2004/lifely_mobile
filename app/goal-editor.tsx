import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import {
  Button,
  Field,
  OptionGrid,
  Screen,
  ScreenHeader,
  SCREEN_PADDING,
  Segmented,
  Text,
} from '@/components';
import { CATEGORY_META } from '@/domain/categories';
import { addDays, format } from '@/lib/date';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { accents, colors, MIN_TOUCH, radius, spacing } from '@/theme';
import { CATEGORIES, type Category } from '@/types';

const ICONS = [
  '\u{1F3AF}', '\u{1F4BB}', '\u{1F4B0}', '\u{1F3CB}️', '\u{1F4DA}', '\u{1F680}',
  '❤️', '✈️', '\u{1F3E0}', '\u{1F3A8}',
];

type Track = 'milestones' | 'number';
type Horizon = '90' | '180' | '365' | 'none';

export default function GoalEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const goals = useAppStore((s) => s.goals);
  const addGoal = useAppStore((s) => s.addGoal);
  const updateGoal = useAppStore((s) => s.updateGoal);
  const deleteGoal = useAppStore((s) => s.deleteGoal);

  const existing = useMemo(() => goals.find((g) => g.id === id), [goals, id]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [why, setWhy] = useState(existing?.why ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]);
  const [category, setCategory] = useState<Category>(existing?.category ?? 'PERSONAL');
  const [track, setTrack] = useState<Track>(existing?.targetValue ? 'number' : 'milestones');
  const [target, setTarget] = useState(existing?.targetValue ? String(existing.targetValue) : '');
  const [current, setCurrent] = useState(existing?.currentValue ? String(existing.currentValue) : '');
  const [unit, setUnit] = useState(existing?.unit ?? '');
  const [horizon, setHorizon] = useState<Horizon>(existing?.deadline ? '180' : '365');
  const [error, setError] = useState<string | undefined>();

  const deadline =
    horizon === 'none'
      ? undefined
      : existing?.deadline && horizon === '180'
        ? existing.deadline
        : format(addDays(new Date(), Number(horizon)), 'yyyy-MM-dd');

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('What is the goal?');
      return;
    }

    const numericTarget = track === 'number' ? Number(target.replace(/[^0-9.]/g, '')) : undefined;
    if (track === 'number' && (!numericTarget || Number.isNaN(numericTarget))) {
      setError('Give the target a number to aim at.');
      return;
    }

    const payload = {
      title: trimmed,
      why: why.trim() || undefined,
      icon,
      category,
      deadline,
      targetValue: numericTarget,
      currentValue: track === 'number' ? Number(current.replace(/[^0-9.]/g, '')) || 0 : undefined,
      unit: track === 'number' ? unit.trim() || undefined : undefined,
    };

    if (existing) updateGoal(existing.id, payload);
    else addGoal(payload);

    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this goal?', 'Tasks and habits linked to it are kept, just unlinked.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteGoal(existing.id);
          router.dismissAll();
          router.replace('/goals');
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <ScreenHeader
          title={existing ? 'Edit goal' : 'New goal'}
          subtitle={existing ? undefined : 'Write it as something you could recognise as done.'}
        />

        <View style={styles.form}>
          <Field
            label="The goal"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Become a full-stack developer"
            autoFocus={!existing}
            error={error}
          />

          <Field
            label="Why it matters"
            value={why}
            onChangeText={setWhy}
            placeholder="The reason you will still care about this in four months"
            multiline
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
              Area of life
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
              How you will measure it
            </Text>
            <Segmented
              value={track}
              onChange={setTrack}
              options={[
                { value: 'milestones', label: 'Milestones' },
                { value: 'number', label: 'A number' },
              ]}
            />
            <Text variant="meta">
              {track === 'milestones'
                ? 'Add the steps on the goal page once it is created.'
                : 'Progress is current ÷ target.'}
            </Text>
          </View>

          {track === 'number' ? (
            <View style={styles.row}>
              <Field
                label="Current"
                value={current}
                onChangeText={setCurrent}
                placeholder="0"
                keyboardType="numeric"
                containerStyle={styles.flex}
              />
              <Field
                label="Target"
                value={target}
                onChangeText={(text) => {
                  setTarget(text);
                  if (error) setError(undefined);
                }}
                placeholder="500000"
                keyboardType="numeric"
                containerStyle={styles.flex}
              />
              <Field
                label="Unit"
                value={unit}
                onChangeText={setUnit}
                placeholder="books"
                containerStyle={styles.unitField}
              />
            </View>
          ) : null}

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              Deadline
            </Text>
            <Segmented
              value={horizon}
              onChange={setHorizon}
              options={[
                { value: '90', label: '3 months' },
                { value: '180', label: '6 months' },
                { value: '365', label: 'A year' },
                { value: 'none', label: 'Open' },
              ]}
            />
          </View>

          <Button label={existing ? 'Save changes' : 'Create goal'} fullWidth size="lg" onPress={save} />

          {existing ? (
            <Button label="Delete goal" variant="danger" fullWidth onPress={confirmDelete} />
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
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  unitField: { width: 92 },
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
});
