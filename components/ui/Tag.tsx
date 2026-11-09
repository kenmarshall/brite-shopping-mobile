import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  tone?: 'positive' | 'caution' | 'neutral';
  icon?: IconSymbolName;
}

/** Small status label: green for the lowest price, amber for outdated. */
export function Tag({ label, tone = 'neutral', icon }: Props) {
  const colors = useColors();
  const palette = {
    positive: { bg: colors.positiveContainer, fg: colors.positive },
    caution: { bg: colors.cautionContainer, fg: colors.caution },
    neutral: { bg: colors.backgroundSecondary, fg: colors.textSecondary },
  }[tone];

  return (
    <View style={[styles.tag, { backgroundColor: palette.bg }]}>
      {icon ? <IconSymbol name={icon} size={14} color={palette.fg} /> : null}
      <ThemedText style={[styles.text, { color: palette.fg }]}>{label}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.xs,
  },
  text: { ...Type.callout, fontFamily: Fonts.semibold },
});
