import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';

import { colors, elevation, radius, spacing } from '@/theme';

type Tone = 'plain' | 'tinted' | 'outline';

interface CardProps extends ViewProps {
  tone?: Tone;
  tint?: string;
  padded?: boolean;
  raised?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Card({
  tone = 'plain',
  tint,
  padded = true,
  raised = true,
  style,
  children,
  ...rest
}: CardProps) {
  return (
    <View
      {...rest}
      style={[
        styles.base,
        padded && styles.padded,
        tone === 'plain' && styles.plain,
        tone === 'outline' && styles.outline,
        tone === 'tinted' && { backgroundColor: tint ?? colors.primaryTint, borderWidth: 0 },
        raised && tone === 'plain' && elevation.sm,
        style,
      ]}
    >
      {children}
    </View>
  );
}

interface PressableCardProps extends PressableProps {
  tone?: Tone;
  tint?: string;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Card that visibly depresses on touch — used for anything navigable. */
export const PressableCard = forwardRef<View, PressableCardProps>(function PressableCard(
  { tone = 'plain', tint, padded = true, style, children, ...rest },
  ref,
) {
  return (
    <Pressable
      ref={ref}
      {...rest}
      style={({ pressed }) => [
        styles.base,
        padded && styles.padded,
        tone === 'plain' && styles.plain,
        tone === 'outline' && styles.outline,
        tone === 'tinted' && { backgroundColor: tint ?? colors.primaryTint, borderWidth: 0 },
        tone === 'plain' && elevation.sm,
        pressed && styles.pressed,
        style as ViewStyle,
      ]}
    >
      {children as React.ReactNode}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padded: {
    padding: spacing.lg,
  },
  plain: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  outline: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.988 }],
  },
});
