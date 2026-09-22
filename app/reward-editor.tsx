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
import { REWARD_CATEGORY_META } from '@/domain/categories';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { colors, MIN_TOUCH, radius, spacing } from '@/theme';
import type { RewardCategory } from '@/types';

const ICONS = [
  '\u{1F37F}', '\u{1F37D}️', '\u{1F3AE}', '\u{1F6CD}️', '\u{1F3D6}️',
  '\u{1F3AC}', '☕', '\u{1F3A7}', '\u{1F6B4}', '\u{1F381}',
];

const CATEGORIES = Object.keys(REWARD_CATEGORY_META) as RewardCategory[];

export default function RewardEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const rewards = useAppStore((s) => s.rewards);
  const addReward = useAppStore((s) => s.addReward);
  const updateReward = useAppStore((s) => s.updateReward);
  const deleteReward = useAppStore((s) => s.deleteReward);

  const existing = useMemo(() => rewards.find((r) => r.id === id), [rewards, id]);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [icon, setIcon] = useState(existing?.icon ?? ICONS[0]);
  const [category, setCategory] = useState<RewardCategory>(existing?.category ?? 'ENTERTAINMENT');
  const [cost, setCost] = useState(existing?.creditCost ?? 500);
  const [error, setError] = useState<string | undefined>();

  const save = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setError('What are you giving yourself?');
      return;
    }

    const payload = {
      title: trimmed,
      description: description.trim() || undefined,
      icon,
      category,
      creditCost: cost,
    };

    if (existing) updateReward(existing.id, payload);
    else addReward(payload);

    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete this reward?', 'Past redemptions stay in your credit history.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteReward(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <Screen>
        <ScreenHeader
          title={existing ? 'Edit reward' : 'New reward'}
          subtitle={existing ? undefined : 'Price it so it feels earned but reachable.'}
        />

        <View style={styles.form}>
          <Field
            label="The reward"
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(undefined);
            }}
            placeholder="e.g. Movie night"
            autoFocus={!existing}
            error={error}
          />

          <Field
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="What makes it worth saving for"
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
              Category
            </Text>
            <OptionGrid
              value={category}
              onChange={setCategory}
              options={CATEGORIES.map((c) => ({
                value: c,
                label: REWARD_CATEGORY_META[c].label,
                icon: REWARD_CATEGORY_META[c].icon,
              }))}
            />
          </View>

          <Card>
            <Stepper label="Credit cost" value={cost} onChange={setCost} step={100} min={50} max={20000} />
            <Text variant="meta" style={styles.hint}>
              A useful rule: roughly a week of solid days for something small, a month for something
              big.
            </Text>
          </Card>

          <Button
            label={existing ? 'Save changes' : 'Create reward'}
            fullWidth
            size="lg"
            onPress={save}
          />

          {existing ? (
            <Button label="Delete reward" variant="danger" fullWidth onPress={confirmDelete} />
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
  hint: { marginTop: spacing.md },
});
