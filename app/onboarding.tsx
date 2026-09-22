import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInRight } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Field, ProgressBar, Text } from '@/components';
import { CATEGORY_META } from '@/domain/categories';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { accents, colors, MIN_TOUCH, radius, spacing } from '@/theme';
import { CATEGORIES, type Category, type Habit } from '@/types';

type HabitSeed = Omit<Habit, 'id' | 'log' | 'createdAt' | 'updatedAt'>;

const SUGGESTED_HABITS: { name: string; icon: string; category: Category; credit: number }[] = [
  { name: 'Wake before 7am', icon: '☀️', category: 'PERSONAL', credit: 5 },
  { name: 'Exercise', icon: '\u{1F3CB}️', category: 'HEALTH', credit: 10 },
  { name: 'Read 20 pages', icon: '\u{1F4D6}', category: 'LEARNING', credit: 5 },
  { name: 'Meditate 10 min', icon: '\u{1F9D8}', category: 'PERSONAL', credit: 5 },
  { name: 'Deep work block', icon: '\u{1F4BB}', category: 'WORK', credit: 10 },
  { name: 'Drink 3L water', icon: '\u{1F4A7}', category: 'HEALTH', credit: 3 },
  { name: 'No phone before noon', icon: '\u{1F4F5}', category: 'PERSONAL', credit: 5 },
  { name: 'Lights out by 11', icon: '\u{1F634}', category: 'HEALTH', credit: 5 },
];

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState(0);
  // Setting up an account is several writes; the last screen waits for them.
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [focusAreas, setFocusAreas] = useState<Category[]>([]);
  const [goalTitle, setGoalTitle] = useState('');
  const [selectedHabits, setSelectedHabits] = useState<string[]>([]);
  const [wakeTime, setWakeTime] = useState('06:30');
  const [workStart, setWorkStart] = useState('09:00');
  const [workEnd, setWorkEnd] = useState('18:00');

  const next = () => {
    haptic.tap();
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  };

  const back = () => {
    haptic.tap();
    setStep((s) => Math.max(0, s - 1));
  };

  const toggleArea = (area: Category) => {
    haptic.select();
    setFocusAreas((current) =>
      current.includes(area)
        ? current.filter((a) => a !== area)
        : current.length >= 5
          ? current
          : [...current, area],
    );
  };

  const toggleHabit = (habitName: string) => {
    haptic.select();
    setSelectedHabits((current) =>
      current.includes(habitName)
        ? current.filter((h) => h !== habitName)
        : [...current, habitName],
    );
  };

  const finish = async (withSampleData: boolean) => {
    if (saving) return;
    setSaving(true);
    haptic.success();
    const habits: HabitSeed[] = SUGGESTED_HABITS.filter((h) => selectedHabits.includes(h.name)).map(
      (h) => ({
        name: h.name,
        icon: h.icon,
        category: h.category,
        frequency: 'DAILY',
        days: [0, 1, 2, 3, 4, 5, 6],
        targetCount: 1,
        creditValue: h.credit,
        isActive: true,
      }),
    );

    await completeOnboarding({
      profile: {
        name: name.trim() || 'Friend',
        focusAreas: focusAreas.length ? focusAreas : ['WORK', 'HEALTH', 'LEARNING'],
        wakeTime,
        workStart,
        workEnd,
      },
      habits,
      goal: goalTitle.trim()
        ? {
            title: goalTitle.trim(),
            category: focusAreas[0] ?? 'PERSONAL',
            icon: CATEGORY_META[focusAreas[0] ?? 'PERSONAL'].icon,
            why: undefined,
            deadline: undefined,
          }
        : undefined,
      withSampleData,
    });

    setSaving(false);
    router.replace('/(tabs)');
  };

  const canContinue = [
    true, // welcome
    name.trim().length > 0,
    focusAreas.length > 0,
    true, // goal is optional
    true, // habits optional
  ][step];

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        {/* Progress */}
        {step > 0 ? (
          <View style={styles.progressRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              hitSlop={10}
              onPress={back}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Feather name="chevron-left" size={20} color={colors.text} />
            </Pressable>
            <ProgressBar
              value={(step / (TOTAL_STEPS - 1)) * 100}
              height={4}
              style={styles.progressBar}
              label="Setup progress"
            />
            <Text variant="meta">
              {step} / {TOTAL_STEPS - 1}
            </Text>
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? (
            <Animated.View entering={FadeIn.duration(400)} style={styles.welcome}>
              <View style={styles.logo}>
                <Text style={styles.logoEmoji}>{'\u{1F331}'}</Text>
              </View>
              <Text variant="display" center style={styles.welcomeTitle}>
                Lifely
              </Text>
              <Text variant="sectionTitle" center color={colors.primaryDark}>
                Track today. Build tomorrow.
              </Text>
              <Text variant="body" center color={colors.textSecondary} style={styles.welcomeBody}>
                Most apps track one slice of your life. This one tracks the system: what you planned,
                what you actually did, and what that adds up to.
              </Text>

              <View style={styles.loop}>
                {['Capture', 'Do', 'Earn', 'Reflect', 'Improve'].map((label, index) => (
                  <Animated.View
                    key={label}
                    entering={FadeInRight.delay(200 + index * 90)}
                    style={styles.loopItem}
                  >
                    <View style={styles.loopDot} />
                    <Text variant="smallStrong" color={colors.textSecondary}>
                      {label}
                    </Text>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {step === 1 ? (
            <Animated.View entering={FadeIn.duration(280)} style={styles.step}>
              <Text variant="screenTitle">What should I call you?</Text>
              <Text variant="body" color={colors.textSecondary}>
                Just a first name is fine. It only ever shows up on your own screen.
              </Text>
              <Field
                label="Name"
                value={name}
                onChangeText={setName}
                placeholder="e.g. Karthik"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={() => canContinue && next()}
              />
            </Animated.View>
          ) : null}

          {step === 2 ? (
            <Animated.View entering={FadeIn.duration(280)} style={styles.step}>
              <Text variant="screenTitle">What are you trying to improve?</Text>
              <Text variant="body" color={colors.textSecondary}>
                Pick up to five. You can change these whenever you like.
              </Text>
              <View style={styles.areaGrid}>
                {CATEGORIES.filter((c) => c !== 'OTHER').map((category) => {
                  const active = focusAreas.includes(category);
                  const accent = accents[CATEGORY_META[category].accent];
                  return (
                    <Pressable
                      key={category}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={CATEGORY_META[category].label}
                      onPress={() => toggleArea(category)}
                      style={[
                        styles.area,
                        active && { backgroundColor: accent.tint, borderColor: accent.base },
                      ]}
                    >
                      <Text style={styles.areaIcon}>{CATEGORY_META[category].icon}</Text>
                      <Text
                        variant="bodyStrong"
                        weight="semibold"
                        color={active ? accent.base : colors.text}
                      >
                        {CATEGORY_META[category].label}
                      </Text>
                      {active ? <Feather name="check" size={15} color={accent.base} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          ) : null}

          {step === 3 ? (
            <Animated.View entering={FadeIn.duration(280)} style={styles.step}>
              <Text variant="screenTitle">What is the one big thing?</Text>
              <Text variant="body" color={colors.textSecondary}>
                Name a goal you want to be measurably closer to in six months. You can skip this and
                add it later.
              </Text>
              <Field
                label="Your first goal"
                value={goalTitle}
                onChangeText={setGoalTitle}
                placeholder="e.g. Become a full-stack developer"
                autoFocus
              />
              <Text variant="meta">
                Milestones and targets come next, on the goal itself.
              </Text>
            </Animated.View>
          ) : null}

          {step === 4 ? (
            <Animated.View entering={FadeIn.duration(280)} style={styles.step}>
              <Text variant="screenTitle">Pick a few habits</Text>
              <Text variant="body" color={colors.textSecondary}>
                Two or three is the right number to start. More than that and they tend to collapse
                together.
              </Text>

              <View style={styles.habitGrid}>
                {SUGGESTED_HABITS.map((habit) => {
                  const active = selectedHabits.includes(habit.name);
                  return (
                    <Pressable
                      key={habit.name}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                      accessibilityLabel={habit.name}
                      onPress={() => toggleHabit(habit.name)}
                      style={[styles.habit, active && styles.habitActive]}
                    >
                      <Text style={styles.habitIcon}>{habit.icon}</Text>
                      <Text
                        variant="smallStrong"
                        weight="semibold"
                        color={active ? colors.primaryDark : colors.text}
                        style={styles.flex}
                      >
                        {habit.name}
                      </Text>
                      <Text variant="meta" color={active ? colors.primaryDark : colors.textTertiary}>
                        +{habit.credit}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.scheduleRow}>
                <Field
                  label="Wake"
                  value={wakeTime}
                  onChangeText={setWakeTime}
                  maxLength={5}
                  containerStyle={styles.flex}
                />
                <Field
                  label="Work starts"
                  value={workStart}
                  onChangeText={setWorkStart}
                  maxLength={5}
                  containerStyle={styles.flex}
                />
                <Field
                  label="Work ends"
                  value={workEnd}
                  onChangeText={setWorkEnd}
                  maxLength={5}
                  containerStyle={styles.flex}
                />
              </View>
            </Animated.View>
          ) : null}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          {step < TOTAL_STEPS - 1 ? (
            <>
              <Button
                label={step === 0 ? 'Get started' : 'Continue'}
                size="lg"
                fullWidth
                disabled={!canContinue}
                onPress={next}
              />
              {step === 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Explore with sample data"
                  disabled={saving}
                  onPress={() => void finish(true)}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text variant="smallStrong" color={colors.textSecondary}>
                    Just show me around with sample data
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Skip this step"
                  onPress={next}
                  style={({ pressed }) => [styles.secondaryAction, pressed && styles.pressed]}
                >
                  <Text variant="smallStrong" color={colors.textSecondary}>
                    Skip
                  </Text>
                </Pressable>
              )}
            </>
          ) : (
            <>
              <Button
                label={selectedHabits.length > 0 ? 'Start tracking' : 'Start without habits'}
                size="lg"
                fullWidth
                icon="arrow-right"
                loading={saving}
                onPress={() => void finish(false)}
              />
              <Text variant="meta" center style={styles.footnote}>
                Everything is saved to your account, so it follows you to any device.
              </Text>
            </>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: { flex: 1, backgroundColor: colors.background },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  progressBar: { flex: 1 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, flexGrow: 1 },

  welcome: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  logo: {
    width: 84,
    height: 84,
    borderRadius: radius.xxl,
    backgroundColor: colors.primaryTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  logoEmoji: { fontSize: 40, lineHeight: 48 },
  welcomeTitle: { letterSpacing: -1.2 },
  welcomeBody: { maxWidth: 320, marginTop: spacing.lg, lineHeight: 23 },
  loop: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.xxxl },
  loopItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  loopDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primarySoft },

  step: { gap: spacing.lg, paddingTop: spacing.sm },
  areaGrid: { gap: spacing.sm },
  area: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  areaIcon: { fontSize: 20 },

  habitGrid: { gap: spacing.sm },
  habit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: MIN_TOUCH + 6,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitActive: { backgroundColor: colors.primaryTint, borderColor: colors.primary },
  habitIcon: { fontSize: 18 },
  scheduleRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },

  footer: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.sm },
  secondaryAction: { alignItems: 'center', paddingVertical: spacing.md, minHeight: MIN_TOUCH },
  footnote: { paddingVertical: spacing.sm },
  pressed: { opacity: 0.7 },
});
