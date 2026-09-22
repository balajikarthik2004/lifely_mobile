import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, OptionGrid, ProgressRing, Text } from '@/components';
import { CATEGORY_META } from '@/domain/categories';
import { creditsForFocus } from '@/domain/credits';
import { haptic } from '@/lib/haptics';
import { useAppStore } from '@/store/useAppStore';
import { accents, colors, radius, spacing } from '@/theme';
import { CATEGORIES, type Category } from '@/types';

const DURATIONS = [25, 50, 90];

export default function FocusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const session = useAppStore((s) => s.focusSession);
  const tasks = useAppStore((s) => s.tasks);
  const rules = useAppStore((s) => s.creditRules);
  const startFocus = useAppStore((s) => s.startFocus);
  const pauseFocus = useAppStore((s) => s.pauseFocus);
  const resumeFocus = useAppStore((s) => s.resumeFocus);
  const finishFocus = useAppStore((s) => s.finishFocus);
  const cancelFocus = useAppStore((s) => s.cancelFocus);

  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'TODO').slice(0, 6), [tasks]);

  const [title, setTitle] = useState('Deep work');
  const [category, setCategory] = useState<Category>('WORK');
  const [minutes, setMinutes] = useState(50);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const running = session?.status === 'RUNNING';

  // The timer counts from the stored start time, so a backgrounded app still
  // reports the real elapsed duration when it comes back.
  useEffect(() => {
    if (!session) {
      setElapsedSeconds(0);
      return;
    }

    const compute = () =>
      Math.max(0, Math.round((Date.now() - new Date(session.startedAt).getTime()) / 1000));

    setElapsedSeconds(compute());

    if (session.status !== 'RUNNING') return;
    tickRef.current = setInterval(() => setElapsedSeconds(compute()), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [session]);

  const targetSeconds = (session?.targetMinutes ?? minutes) * 60;
  const progress = Math.min(100, (elapsedSeconds / targetSeconds) * 100);
  const elapsedMinutes = elapsedSeconds / 60;
  const projectedCredits = creditsForFocus(Math.round(elapsedMinutes), rules);

  useEffect(() => {
    if (session && running && elapsedSeconds >= targetSeconds) {
      haptic.success();
    }
  }, [session, running, elapsedSeconds, targetSeconds]);

  const begin = () => {
    haptic.heavy();
    void startFocus({ title: title.trim() || 'Deep work', category, targetMinutes: minutes });
  };

  const finish = () => {
    // The server times the block and decides the payout, so nothing is passed
    // up from here; the screen only needs to get out of the way.
    haptic.success();
    void finishFocus();
    router.back();
  };

  const abandon = () => {
    Alert.alert('End without logging?', 'Nothing will be added to your timeline or credits.', [
      { text: 'Keep going', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          void cancelFocus();
          router.back();
        },
      },
    ]);
  };

  /* ------------------------------------------------------------------- */
  /* Setup                                                                */
  /* ------------------------------------------------------------------- */

  if (!session) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + spacing.lg }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            hitSlop={10}
            onPress={() => router.back()}
            style={({ pressed }) => [styles.close, pressed && styles.pressed]}
          >
            <Feather name="x" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.setup}>
          <Text variant="screenTitle">Start a focus block</Text>
          <Text variant="small" color={colors.textSecondary}>
            One thing, no tabs, no phone. The timer keeps counting if you leave the app.
          </Text>

          <View style={styles.group}>
            <Text variant="smallStrong" color={colors.textSecondary}>
              How long
            </Text>
            <View style={styles.durationRow}>
              {DURATIONS.map((option) => {
                const active = option === minutes;
                return (
                  <Pressable
                    key={option}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${option} minutes`}
                    onPress={() => {
                      haptic.select();
                      setMinutes(option);
                    }}
                    style={[styles.duration, active && styles.durationActive]}
                  >
                    <Text
                      variant="sectionTitle"
                      weight="bold"
                      color={active ? colors.textInverse : colors.text}
                    >
                      {option}
                    </Text>
                    <Text
                      variant="meta"
                      color={active ? colors.primaryTintStrong : colors.textTertiary}
                    >
                      minutes
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {openTasks.length > 0 ? (
            <View style={styles.group}>
              <Text variant="smallStrong" color={colors.textSecondary}>
                What are you working on?
              </Text>
              <OptionGrid
                value={title}
                onChange={(value) => {
                  setTitle(value);
                  const task = openTasks.find((t) => t.title === value);
                  if (task) setCategory(task.category);
                }}
                options={[
                  { value: 'Deep work', label: 'Deep work', icon: '\u{1F4BB}' },
                  ...openTasks.map((task) => ({
                    value: task.title,
                    label: task.title,
                    icon: CATEGORY_META[task.category].icon,
                  })),
                ]}
              />
            </View>
          ) : null}

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

          <Text variant="meta">
            A full {minutes} minute block earns about {creditsForFocus(minutes, rules)} credits.
          </Text>

          <Button label="Start" icon="play" size="lg" fullWidth onPress={begin} />
        </View>
      </View>
    );
  }

  /* ------------------------------------------------------------------- */
  /* Running                                                              */
  /* ------------------------------------------------------------------- */

  const remaining = Math.max(0, targetSeconds - elapsedSeconds);
  const overtime = elapsedSeconds > targetSeconds;

  return (
    <View style={[styles.root, styles.runningRoot, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Minimise"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.close, styles.closeDark, pressed && styles.pressed]}
        >
          <Feather name="chevron-down" size={20} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.running}>
        <ProgressRing
          value={progress}
          size={260}
          strokeWidth={10}
          color={colors.primarySoft}
          trackColor="rgba(255,255,255,0.14)"
          label="Focus progress"
        >
          <Text variant="display" color={colors.textInverse} style={styles.clock}>
            {formatClockDuration(overtime ? elapsedSeconds - targetSeconds : remaining)}
          </Text>
          <Text variant="meta" color={colors.primaryTintStrong}>
            {overtime ? 'OVERTIME' : 'REMAINING'}
          </Text>
        </ProgressRing>

        <View style={styles.runningBody}>
          <Text variant="sectionTitle" color={colors.textInverse} center numberOfLines={2}>
            {session.title}
          </Text>
          <Text variant="small" color={colors.primaryTintStrong} center>
            {CATEGORY_META[session.category].label} · {session.targetMinutes} minute block
          </Text>
          <Text variant="small" color={colors.primarySoft} center>
            {projectedCredits > 0 ? `+${projectedCredits} credits so far` : 'Ten minutes in, credits start'}
          </Text>
        </View>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={running ? 'Pause' : 'Resume'}
            onPress={() => {
              haptic.tap();
              if (running) void pauseFocus();
              else void resumeFocus();
            }}
            style={({ pressed }) => [styles.controlSecondary, pressed && styles.pressed]}
          >
            <Feather name={running ? 'pause' : 'play'} size={22} color={colors.textInverse} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Finish and log this session"
            onPress={finish}
            style={({ pressed }) => [styles.controlPrimary, pressed && styles.pressed]}
          >
            <Feather name="check" size={26} color={colors.primaryDeep} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Discard this session"
            onPress={abandon}
            style={({ pressed }) => [styles.controlSecondary, pressed && styles.pressed]}
          >
            <Feather name="x" size={22} color={colors.textInverse} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function formatClockDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, paddingHorizontal: spacing.xl },
  runningRoot: { backgroundColor: colors.primaryDeep },
  header: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: spacing.xl },
  close: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSunken,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeDark: { backgroundColor: 'rgba(255,255,255,0.14)' },
  setup: { gap: spacing.xl, paddingBottom: spacing.xxl },
  group: { gap: spacing.sm },
  durationRow: { flexDirection: 'row', gap: spacing.md },
  duration: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  durationActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  running: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xxxl },
  clock: { fontSize: 54, lineHeight: 62, letterSpacing: -2 },
  runningBody: { gap: 4, alignItems: 'center', paddingHorizontal: spacing.xl },
  controls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  controlSecondary: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlPrimary: {
    width: 72,
    height: 72,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.82 },
});
