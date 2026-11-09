import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { IconSymbol } from '@/components/ui/IconSymbol';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  value: string;
  onChange: (text: string) => void;
  onSubmit: () => void;
  onScan: () => void;
}

const S = Strings.home;

export function SearchField({ value, onChange, onSubmit, onScan }: Props) {
  const colors = useColors();
  return (
    <View style={[styles.field, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <IconSymbol name="magnifyingglass" size={20} color={colors.textSecondary} />
      <TextInput
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSubmit}
        placeholder={S.searchPlaceholder}
        placeholderTextColor={colors.placeholderText}
        accessibilityLabel={S.searchLabel}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.input, { color: colors.text }]}
      />
      {value ? (
        <Pressable onPress={() => onChange('')} style={styles.button} accessibilityRole="button" accessibilityLabel={S.clearSearch}>
          <IconSymbol name="xmark" size={18} color={colors.textSecondary} />
        </Pressable>
      ) : null}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <Pressable onPress={onScan} style={styles.button} accessibilityRole="button" accessibilityLabel={S.scan}>
        <IconSymbol name="barcode.viewfinder" size={22} color={colors.primaryStrong} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ButtonSize.large,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingLeft: Spacing.md,
    gap: Spacing.sm,
  },
  input: { ...Type.body, fontFamily: Fonts.regular, flex: 1, minHeight: ButtonSize.touch },
  divider: { width: StyleSheet.hairlineWidth, height: Spacing.xl },
  button: { width: ButtonSize.touch, height: ButtonSize.touch, alignItems: 'center', justifyContent: 'center' },
});
