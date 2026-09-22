/**
 * Lifely colour system.
 *
 * Light-mode only for v1 (spec §5.1). Calm warm-white canvas, white cards,
 * a single emerald accent, and a small set of pale category tints. Every
 * colour used anywhere in the app must come from this file.
 */

export const palette = {
  // Canvas
  background: '#F6F7F5',
  backgroundElevated: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceMuted: '#FAFBFA',
  surfaceSunken: '#F1F3F0',

  // Lines
  border: '#EAECE8',
  borderStrong: '#DCE0DA',

  // Text
  text: '#121A17',
  textSecondary: '#5F6B66',
  textTertiary: '#98A29D',
  textInverse: '#FFFFFF',

  // Brand
  primary: '#0E9F6E',
  primaryDark: '#0A7A54',
  primaryDeep: '#075E41',
  primarySoft: '#5FC8A3',
  primaryTint: '#E7F5EF',
  primaryTintStrong: '#CFEBDF',

  // Feedback
  success: '#0E9F6E',
  successTint: '#E7F5EF',
  warning: '#D9871F',
  warningTint: '#FBF1E2',
  danger: '#DC5B57',
  dangerTint: '#FBEBEA',
  info: '#4C6FFF',
  infoTint: '#ECF0FF',

  // Secondary accents used for stat tiles
  accentWarm: '#B87E00',
  accentTintWarm: '#FAF0DE',
  accentCool: '#1195AD',
  accentTintCool: '#E2F3F7',

  // Neutral overlays
  overlay: 'rgba(12, 22, 18, 0.42)',
  scrim: 'rgba(12, 22, 18, 0.06)',
} as const;

/**
 * Category accents.
 *
 * The `base` values are also the categorical series colours used by every
 * chart, so a category keeps one identity across chips, cards and plots. The
 * set was validated as an ordered palette (see `CATEGORY_SERIES_ORDER` in
 * `domain/categories.ts`) and passes the lightness band, chroma floor,
 * adjacent-pair CVD separation, normal-vision floor and 3:1 contrast on white.
 * Re-run the validator before changing any of these hexes or their order.
 */
export const accents = {
  sky: { base: '#2F6BD8', tint: '#E9EFFC' },
  mint: { base: '#0E9F6E', tint: '#E7F5EF' },
  violet: { base: '#6D4AC4', tint: '#EFEAFA' },
  amber: { base: '#B87E00', tint: '#FAF0DE' },
  rose: { base: '#D8477F', tint: '#FBE9F0' },
  teal: { base: '#1195AD', tint: '#E2F3F7' },
  coral: { base: '#E2703A', tint: '#FCEEE7' },
  slate: { base: '#8E6FAF', tint: '#F1ECF7' },
} as const;

export type AccentName = keyof typeof accents;

/**
 * Sequential ramp (one hue, light to dark) for magnitude encodings such as the
 * habit consistency heatmap. Never use the categorical set for magnitude.
 */
export const sequential = ['#EAF6F1', '#C2E7D8', '#8FD4BB', '#4CBD9A', '#0E9F6E', '#0A7A54'] as const;

export const colors = palette;
