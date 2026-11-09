import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export type ThemeColors = (typeof Colors)['light'];

/** The active theme's palette. */
export function useColors(): ThemeColors {
  return Colors[useColorScheme()];
}
