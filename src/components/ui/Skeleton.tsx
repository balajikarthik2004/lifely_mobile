import { useEffect } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors, radius, spacing } from '@/theme';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}

/** Skeletons rather than spinners while the persisted store rehydrates. */
export function Skeleton({ width = '100%', height = 16, rounded = radius.xs, style }: SkeletonProps) {
  const pulse = useSharedValue(0.5);

  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 850 }), -1, true);
  }, [pulse]);

  const animated = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <Animated.View
      style={[{ width, height, borderRadius: rounded, backgroundColor: colors.surfaceSunken }, animated, style]}
    />
  );
}

export function CardSkeleton({ lines = 2 }: { lines?: number }) {
  return (
    <View style={styles.card}>
      <Skeleton width={44} height={44} rounded={radius.md} />
      <View style={styles.cardBody}>
        <Skeleton width="70%" height={15} />
        {Array.from({ length: lines - 1 }).map((_, i) => (
          <Skeleton key={i} width={i % 2 === 0 ? '45%' : '58%'} height={11} />
        ))}
      </View>
    </View>
  );
}

export function HomeSkeleton() {
  return (
    <View style={styles.home}>
      <Skeleton width="45%" height={26} />
      <Skeleton width="65%" height={14} />
      <Skeleton height={230} rounded={radius.xl} style={styles.block} />
      <View style={styles.row}>
        <Skeleton height={86} rounded={radius.lg} style={styles.flex} />
        <Skeleton height={86} rounded={radius.lg} style={styles.flex} />
      </View>
      <CardSkeleton />
      <CardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardBody: { flex: 1, gap: spacing.sm },
  home: { padding: spacing.xl, gap: spacing.lg },
  block: { marginTop: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
