// Design system v1: one teal brand color, a quiet neutral ground, and color
// reserved for meaning (green = lowest price, amber = may be outdated).
// Legacy names (tint, card, success, error) map onto the semantic palette so
// screens not yet redesigned pick up the new values.

const light = {
  // Brand
  primary: '#0A7EA4',
  onPrimary: '#FFFFFF',
  primaryStrong: '#086483',
  primaryContainer: '#E3F3F9',
  onPrimaryContainer: '#054A61',
  // Neutrals
  text: '#1F2D38',
  textSecondary: '#4E5D6A',
  textTertiary: '#6B7884',
  background: '#F5F7F8',
  backgroundSecondary: '#E9EDF0',
  surface: '#FFFFFF',
  border: '#E3E8EC',
  // Meaning
  positive: '#15803D',
  positiveContainer: '#E7F6EC',
  caution: '#92400E',
  cautionContainer: '#FEF3C7',
  danger: '#B42318',
  dangerContainer: '#FDECEA',
  // Product image placeholder
  placeholder: '#EAF4F1',
  placeholderIcon: '#3F7F6E',
  placeholderText: '#6B7884',
  // Dims the screen behind a bottom sheet
  backdrop: 'rgba(15, 27, 36, 0.4)',
};

type Palette = typeof light;

const dark: Palette = {
  primary: '#4DC9F6',
  // Near-black on the light dark-mode primary; white would be about 1.9:1.
  onPrimary: '#04222E',
  primaryStrong: '#7FD6F8',
  primaryContainer: '#0E3443',
  onPrimaryContainer: '#BDE9FA',
  text: '#ECF1F4',
  textSecondary: '#A9B4BC',
  textTertiary: '#7D8A93',
  background: '#0E1316',
  backgroundSecondary: '#222A2F',
  surface: '#171D21',
  border: '#2A343A',
  positive: '#4ADE80',
  positiveContainer: '#0F2E1B',
  caution: '#FBBF24',
  cautionContainer: '#3A2A0C',
  danger: '#F97066',
  dangerContainer: '#3B1512',
  placeholder: '#1A2A26',
  placeholderIcon: '#7FC4B0',
  placeholderText: '#7D8A93',
  backdrop: 'rgba(0, 0, 0, 0.6)',
};

function withLegacyNames(p: Palette) {
  return {
    ...p,
    tint: p.primary,
    onTint: p.onPrimary,
    icon: p.textSecondary,
    tabIconDefault: p.textTertiary,
    tabIconSelected: p.primary,
    card: p.surface,
    error: p.danger,
    success: p.positive,
  };
}

export const Colors = {
  light: withLegacyNames(light),
  dark: withLegacyNames(dark),
};
