import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, elevation, radius, spacing } from '@/theme';

import { Text } from './ui/Text';

interface MetricCardProps {
  icon: keyof typeof Feather.glyphMap;
  value: string;
  label: string;
  tint?: string;
  color?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Compact stat tile — a number and its name, nothing else. */
export function MetricCard({
  icon,
  value,
  label,
  tint = colors.primaryTint,
  color = colors.primaryDark,
  onPress,
  style,
}: MetricCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${label}: ${value}`}
      disabled={!onPress}
      onPress={() => {
        haptic.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.card, elevation.xs, pressed && styles.pressed, style]}
    >
      <View style={[styles.icon, { backgroundColor: tint }]}>
        <Feather name={icon} size={14} color={color} />
      </View>
      <Text variant="sectionTitle" weight="bold" numberOfLines={1} style={styles.value}>
        {value}
      </Text>
      <Text variant="meta" numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md + 2,
    gap: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  icon: {
    width: 28,
    height: 28,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: { marginTop: 2 },
  pressed: { opacity: 0.9 },
});
