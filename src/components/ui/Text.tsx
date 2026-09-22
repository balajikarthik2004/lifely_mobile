import { Text as RNText, StyleSheet, type TextProps as RNTextProps } from 'react-native';

import { colors, type as typeScale } from '@/theme';

type Variant = keyof typeof typeScale;

export interface AppTextProps extends RNTextProps {
  variant?: Variant;
  color?: string;
  center?: boolean;
  /** Visual weight override without changing the size step. */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

const families = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Every piece of text in the app goes through here so the type scale stays
 * honest. Font scaling is deliberately left on (spec section 40) but capped so
 * the largest accessibility sizes do not shred the layout.
 */
export function Text({ variant = 'body', color, center, weight, style, ...rest }: AppTextProps) {
  return (
    <RNText
      maxFontSizeMultiplier={1.45}
      {...rest}
      style={[
        typeScale[variant],
        weight && { fontFamily: families[weight] },
        color ? { color } : null,
        center && styles.center,
        style,
      ]}
    />
  );
}

export function Muted(props: AppTextProps) {
  return <Text variant="small" color={colors.textSecondary} {...props} />;
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
