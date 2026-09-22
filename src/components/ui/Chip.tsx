import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, radius, spacing } from '@/theme';

import { Text } from './Text';

interface ChipProps {
  label: string;
  icon?: string;
  color?: string;
  background?: string;
  selected?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md';
  style?: StyleProp<ViewStyle>;
}

/** Small status / category pill. Selectable when `onPress` is supplied. */
export function Chip({
  label,
  icon,
  color = colors.textSecondary,
  background = colors.surfaceSunken,
  selected,
  onPress,
  size = 'sm',
  style,
}: ChipProps) {
  const body = (
    <View
      style={[
        styles.chip,
        size === 'md' && styles.chipMd,
        { backgroundColor: selected === false ? colors.surfaceSunken : background },
        selected && { borderColor: color, borderWidth: 1 },
        style,
      ]}
    >
      {icon ? <Text variant="meta" style={styles.icon}>{icon}</Text> : null}
      <Text
        variant="meta"
        weight="semibold"
        color={selected === false ? colors.textSecondary : color}
        numberOfLines={1}
        style={size === 'md' ? styles.labelMd : undefined}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(selected) }}
      onPress={() => {
        haptic.select();
        onPress();
      }}
      style={({ pressed }) => (pressed ? styles.pressed : undefined)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  chipMd: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  labelMd: {
    fontSize: 13,
    lineHeight: 18,
  },
  icon: { fontSize: 11 },
  pressed: { opacity: 0.7 },
});
