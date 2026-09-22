import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { scoreLabel, type LifeScoreBreakdown } from '@/domain/lifeScore';
import { haptic } from '@/lib/haptics';
import { colors, elevation, radius, spacing } from '@/theme';

import { ProgressRing } from './ui/Progress';
import { Text } from './ui/Text';

interface LifeScoreCardProps {
  breakdown: LifeScoreBreakdown;
  delta?: number;
  onPress?: () => void;
}

/**
 * The Home hero (spec section 6). The ring carries the headline number and the
 * component bars underneath explain where it came from — the score is never a
 * number without a reason.
 */
export function LifeScoreCard({ breakdown, delta, onPress }: LifeScoreCardProps) {
  const { score, components } = breakdown;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`Life Score ${score} out of 100. ${scoreLabel(score)}.`}
      onPress={() => {
        if (!onPress) return;
        haptic.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.card, elevation.md, pressed && onPress && styles.pressed]}
    >
      <View style={styles.ringWrap}>
        <ProgressRing
          value={score}
          size={184}
          strokeWidth={15}
          gradient={[colors.primarySoft, colors.primary]}
          trackColor={colors.primaryTint}
          label="Life Score"
        >
          <Text variant="display" style={styles.score}>
            {score}
          </Text>
          <Text variant="overline">Life Score</Text>
        </ProgressRing>
      </View>

      <View style={styles.labelRow}>
        <Text variant="cardTitle">{scoreLabel(score)}</Text>
        {typeof delta === 'number' && delta !== 0 ? (
          <View style={[styles.delta, delta > 0 ? styles.deltaUp : styles.deltaDown]}>
            <Feather
              name={delta > 0 ? 'trending-up' : 'trending-down'}
              size={11}
              color={delta > 0 ? colors.primaryDark : colors.warning}
            />
            <Text variant="meta" weight="semibold" color={delta > 0 ? colors.primaryDark : colors.warning}>
              {delta > 0 ? '+' : ''}
              {Math.round(delta)} vs avg
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.components}>
        {components.map((component) => (
          <View key={component.key} style={styles.component}>
            <View style={styles.componentTrack}>
              <View
                style={[
                  styles.componentFill,
                  {
                    height: `${Math.max(4, component.value)}%`,
                    backgroundColor: component.value >= 60 ? colors.primary : colors.primarySoft,
                  },
                ]}
              />
            </View>
            <Text variant="meta" numberOfLines={1} style={styles.componentLabel}>
              {component.label}
            </Text>
          </View>
        ))}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  ringWrap: { marginBottom: spacing.lg },
  score: { fontSize: 46, lineHeight: 52, letterSpacing: -1.6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xl },
  delta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  deltaUp: { backgroundColor: colors.primaryTint },
  deltaDown: { backgroundColor: colors.warningTint },
  components: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch', justifyContent: 'space-between' },
  component: { flex: 1, alignItems: 'center', gap: 6 },
  componentTrack: {
    width: 6,
    height: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSunken,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  componentFill: { width: '100%', borderRadius: radius.pill },
  componentLabel: { fontSize: 9.5, lineHeight: 12 },
  pressed: { opacity: 0.95, transform: [{ scale: 0.995 }] },
});
