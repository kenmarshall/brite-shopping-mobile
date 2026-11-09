import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  options: { key: string; label: string; accessibilityLabel: string }[];
  selected: string;
  onSelect: (key: string) => void;
}

/** Single-select, horizontally scrolling filter chips. */
export function ChipRow({ options, selected, onSelect }: Props) {
  const colors = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.key === selected;
        return (
          <Pressable
            key={o.key}
            onPress={() => onSelect(o.key)}
            style={[
              styles.chip,
              on ? { backgroundColor: colors.primaryContainer, borderColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
            accessibilityRole="tab"
            aria-selected={on}
            accessibilityLabel={o.accessibilityLabel}
          >
            <ThemedText style={[styles.label, { color: on ? colors.onPrimaryContainer : colors.text }]}>{o.label}</ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  chip: { minHeight: ButtonSize.touch, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill, borderWidth: 1, justifyContent: 'center' },
  label: { ...Type.callout, fontFamily: Fonts.semibold },
});
