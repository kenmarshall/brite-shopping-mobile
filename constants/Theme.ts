import { StyleSheet } from 'react-native';

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 32,
  headerTop: 60,
} as const;

export const Radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  sheet: 24,
  pill: 999,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  hero: 28,
} as const;

/** Plus Jakarta Sans for display and prices, Inter for UI. RN needs one family per weight. */
export const Fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
  display: 'PlusJakartaSans_800ExtraBold',
  displayBold: 'PlusJakartaSans_700Bold',
} as const;

/** Inter file for a fontWeight, so existing `fontWeight` styles render in the right Inter cut. */
export function interForWeight(weight: string | number | undefined): string {
  const w = Number(weight === 'bold' ? 700 : weight === 'normal' || weight == null ? 400 : weight);
  if (w >= 800) return Fonts.extrabold;
  if (w >= 700) return Fonts.bold;
  if (w >= 600) return Fonts.semibold;
  if (w >= 500) return Fonts.medium;
  return Fonts.regular;
}

/** Type scale from the design system (size / line height). */
export const Type = StyleSheet.create({
  display: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 40, letterSpacing: -0.5 },
  title: { fontFamily: Fonts.displayBold, fontSize: 22, lineHeight: 28 },
  section: { fontFamily: Fonts.display, fontSize: 20, lineHeight: 26 },
  headline: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22 },
  callout: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  caption: { fontFamily: Fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
  price: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, fontVariant: ['tabular-nums'] },
});

export const CardShadow = StyleSheet.create({
  base: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
}).base;

export const ButtonSize = {
  touch: 44,
  small: 36,
  /** Primary actions in a bottom bar. */
  large: 52,
} as const;
