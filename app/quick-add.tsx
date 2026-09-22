import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui';
import { haptic } from '@/lib/haptics';
import { colors, elevation, radius, spacing } from '@/theme';

interface Action {
  icon: string;
  label: string;
  caption: string;
  href: Href;
  tint: string;
}

const ACTIONS: Action[] = [
  { icon: '✓', label: 'Task', caption: 'Something to finish', href: '/task-editor', tint: colors.infoTint },
  { icon: '◷', label: 'Activity', caption: 'Something you did', href: '/activity-editor', tint: colors.primaryTint },
  { icon: '⏱', label: 'Focus', caption: 'Start a timed block', href: '/focus', tint: colors.accentTintCool },
  { icon: '\u{1F501}', label: 'Habit', caption: 'Something to repeat', href: '/habit-editor', tint: colors.accentTintWarm },
  { icon: '\u{1F3AF}', label: 'Goal', caption: 'Something bigger', href: '/goal-editor', tint: colors.successTint },
  { icon: '\u{1F381}', label: 'Reward', caption: 'Something to earn', href: '/reward-editor', tint: colors.warningTint },
  { icon: '\u{1F4D3}', label: 'Reflection', caption: 'Close out your day', href: '/reflection', tint: colors.primaryTint },
];

/**
 * The global quick-add sheet (spec section 16). Everything here is one tap from
 * anywhere in the app, and each destination opens with sensible defaults so a
 * capture takes seconds rather than a form-filling session.
 */
export default function QuickAddScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const close = () => router.back();

  const go = (href: Href) => {
    haptic.tap();
    router.replace(href);
  };

  return (
    <View style={styles.root}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(150)} style={StyleSheet.absoluteFill}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close"
          onPress={close}
          style={styles.backdrop}
        />
      </Animated.View>

      <Animated.View
        entering={SlideInDown.springify().damping(20)}
        exiting={SlideOutDown.duration(180)}
        style={[styles.sheet, elevation.lg, { paddingBottom: insets.bottom + spacing.xl }]}
      >
        <View style={styles.grabber} />
        <Text variant="sectionTitle" style={styles.title}>
          Add something
        </Text>
        <Text variant="small" color={colors.textSecondary} style={styles.subtitle}>
          Capture it now, tidy it later.
        </Text>

        <View style={styles.grid}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.label}
              accessibilityRole="button"
              accessibilityLabel={`${action.label}. ${action.caption}`}
              onPress={() => go(action.href)}
              style={({ pressed }) => [styles.action, pressed && styles.pressed]}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.tint }]}>
                <Text style={styles.actionEmoji}>{action.icon}</Text>
              </View>
              <View style={styles.actionBody}>
                <Text variant="bodyStrong" weight="semibold">
                  {action.label}
                </Text>
                <Text variant="meta" numberOfLines={1}>
                  {action.caption}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          onPress={close}
          style={({ pressed }) => [styles.cancel, pressed && styles.pressed]}
        >
          <Text variant="bodyStrong" color={colors.textSecondary}>
            Cancel
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  title: { marginBottom: 2 },
  subtitle: { marginBottom: spacing.lg },
  grid: { gap: spacing.sm },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    minHeight: 60,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 17, lineHeight: 22 },
  actionBody: { flex: 1, gap: 1 },
  cancel: { alignItems: 'center', paddingVertical: spacing.lg, marginTop: spacing.sm },
  pressed: { opacity: 0.85 },
});
