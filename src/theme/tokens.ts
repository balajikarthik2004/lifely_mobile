import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { palette } from './colors';

/** 4pt spacing scale. */
export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

/** Card radii (spec §5.2 — 16–24px). */
export const radius = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  pill: 999,
} as const;

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

/**
 * Type scale (spec §5.3). Sizes are base values — they scale with the OS
 * text-size setting because we never disable `allowFontScaling`.
 */
export const type = {
  display: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: palette.text,
  },
  screenTitle: {
    fontFamily: fonts.bold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.6,
    color: palette.text,
  },
  sectionTitle: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: palette.text,
  },
  cardTitle: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: -0.2,
    color: palette.text,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  bodyStrong: {
    fontFamily: fonts.medium,
    fontSize: 15,
    lineHeight: 22,
    color: palette.text,
  },
  small: {
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  smallStrong: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 18,
    color: palette.textSecondary,
  },
  meta: {
    fontFamily: fonts.medium,
    fontSize: 11.5,
    lineHeight: 16,
    letterSpacing: 0.2,
    color: palette.textTertiary,
  },
  overline: {
    fontFamily: fonts.semibold,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: palette.textTertiary,
  },
} satisfies Record<string, TextStyle>;

/** Soft elevation — iOS shadow + Android elevation, never both visible. */
function shadow(y: number, blur: number, opacity: number, elevation: number): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1F17',
      shadowOffset: { width: 0, height: y },
      shadowOpacity: opacity,
      shadowRadius: blur,
    },
    android: { elevation },
    default: {
      boxShadow: `0px ${y}px ${blur}px rgba(11, 31, 23, ${opacity})`,
    },
  }) as ViewStyle;
}

export const elevation = {
  none: {} as ViewStyle,
  xs: shadow(1, 3, 0.04, 1),
  sm: shadow(2, 8, 0.05, 2),
  md: shadow(6, 18, 0.07, 5),
  lg: shadow(12, 28, 0.1, 10),
} as const;

/** Minimum touch target (spec §40). */
export const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const MIN_TOUCH = 44;
