import { Feather } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { haptic } from '@/lib/haptics';
import { colors, elevation, MIN_TOUCH, radius, spacing } from '@/theme';

import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Feather.glyphMap;
  iconRight?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading = false,
  fullWidth = false,
  disabled,
  onPress,
  style,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const fg = foreground(variant, isDisabled);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(isDisabled), busy: loading }}
      accessibilityLabel={label}
      disabled={isDisabled}
      onPress={(e) => {
        haptic.tap();
        onPress?.(e);
      }}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        sizes[size],
        variants[variant],
        variant === 'primary' && !isDisabled && elevation.xs,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        pressed && !isDisabled && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
          <Text
            variant={size === 'sm' ? 'smallStrong' : 'bodyStrong'}
            weight="semibold"
            color={fg}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconRight ? <Feather name={iconRight} size={size === 'sm' ? 15 : 17} color={fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

function foreground(variant: Variant, disabled?: boolean): string {
  if (disabled) return colors.textTertiary;
  switch (variant) {
    case 'primary':
      return colors.textInverse;
    case 'secondary':
      return colors.primaryDark;
    case 'danger':
      return colors.danger;
    default:
      return colors.text;
  }
}

const sizes = StyleSheet.create({
  sm: { minHeight: 38, paddingHorizontal: spacing.lg, borderRadius: radius.sm },
  md: { minHeight: MIN_TOUCH + 4, paddingHorizontal: spacing.xl, borderRadius: radius.md },
  lg: { minHeight: 54, paddingHorizontal: spacing.xxl, borderRadius: radius.md },
});

const variants = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primaryTint },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: colors.dangerTint },
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: { alignSelf: 'stretch' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { backgroundColor: colors.surfaceSunken },
});
