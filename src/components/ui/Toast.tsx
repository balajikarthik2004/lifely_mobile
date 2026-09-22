import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { formatCredits } from '@/lib/format';
import { useAppStore } from '@/store/useAppStore';
import { colors, elevation, radius, spacing } from '@/theme';

import { Text } from './Text';

const DURATION_MS = 2600;

/**
 * The single celebratory moment in the app (spec section 41) — small, quiet,
 * and gone in under three seconds.
 */
export function ToastHost() {
  const toast = useAppStore((s) => s.toast);
  const dismiss = useAppStore((s) => s.dismissToast);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  const accent =
    toast.tone === 'success'
      ? colors.primary
      : toast.tone === 'warning'
        ? colors.warning
        : colors.info;

  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + spacing.sm }]}>
      <Animated.View
        entering={FadeInUp.springify().damping(18)}
        exiting={FadeOutUp.duration(180)}
        accessibilityLiveRegion="polite"
        accessible
        accessibilityLabel={`${toast.title}. ${toast.subtitle ?? ''} ${
          toast.credits ? `${formatCredits(toast.credits)} credits` : ''
        }`}
        style={[styles.toast, elevation.lg]}
      >
        <View style={[styles.dot, { backgroundColor: accent }]} />
        <View style={styles.body}>
          <Text variant="smallStrong" weight="semibold" color={colors.text} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.subtitle ? (
            <Text variant="meta" numberOfLines={1}>
              {toast.subtitle}
            </Text>
          ) : null}
        </View>
        {typeof toast.credits === 'number' && toast.credits !== 0 ? (
          <View style={[styles.credits, { backgroundColor: accent }]}>
            <Text variant="meta" weight="bold" color={colors.textInverse}>
              {formatCredits(toast.credits)}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 100,
    paddingHorizontal: spacing.xl,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    minWidth: 240,
    maxWidth: 420,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  body: { flex: 1 },
  credits: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
});
