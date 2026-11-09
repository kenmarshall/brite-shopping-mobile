import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  searches: string[];
  onSelect: (query: string) => void;
  onClear: () => void;
}

const S = Strings.home;

/** The shopper's last few searches, one tap to run again. */
export function RecentSearches({ searches, onSelect, onClear }: Props) {
  const colors = useColors();
  return (
    <View style={styles.block}>
      <View style={styles.heading}>
        <ThemedText style={styles.title} accessibilityRole="header">{S.recentTitle}</ThemedText>
        <Pressable onPress={onClear} hitSlop={Spacing.sm} style={styles.clear} accessibilityRole="button" accessibilityLabel={S.recentClearLabel}>
          <ThemedText style={[styles.clearText, { color: colors.primaryStrong }]}>{S.recentClear}</ThemedText>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} keyboardShouldPersistTaps="handled">
        {searches.map((q) => (
          <Pressable
            key={q}
            onPress={() => onSelect(q)}
            style={[styles.chip, { backgroundColor: colors.surface, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel={S.recentSearchLabel(q)}
          >
            <IconSymbol name="clock" size={16} color={colors.textTertiary} />
            <ThemedText style={[styles.label, { color: colors.text }]}>{q}</ThemedText>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg },
  title: { ...Type.section },
  clear: { minHeight: ButtonSize.touch, justifyContent: 'center' },
  clearText: { ...Type.callout, fontFamily: Fonts.semibold },
  row: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: {
    minHeight: ButtonSize.touch,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  label: { ...Type.callout },
});
