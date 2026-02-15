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
  sm: 8,
  md: 12,
  lg: 18,
  pill: 24,
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
} as const;
