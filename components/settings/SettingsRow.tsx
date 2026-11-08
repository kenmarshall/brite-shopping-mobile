import { type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';

export const ROW_ICON_TILE = 30;

interface Props {
  icon: ComponentProps<typeof IconSymbol>['name'];
  label: string;
  /** Secondary text shown on the right */
  value?: string;
  /** Makes the row tappable and shows a chevron */
  onPress?: () => void;
  /** Custom right-side control (e.g. a segmented picker); replaces value/chevron */
  accessory?: ReactNode;
}

export function SettingsRow({ icon, label, value, onPress, accessory }: Props) {
  const colors = Colors[useColorScheme() ?? 'light'];

  const content = (
    <>
      <View style={[styles.iconTile, { backgroundColor: colors.tint + '18' }]}>
        <IconSymbol name={icon} size={18} color={colors.tint} />
      </View>
      <ThemedText style={styles.label} numberOfLines={1}>
        {label}
      </ThemedText>
      {accessory ?? (
        <View style={styles.trailing}>
          {value ? (
            <ThemedText style={[styles.value, { color: colors.textSecondary }]} numberOfLines={1}>
              {value}
            </ThemedText>
          ) : null}
          {onPress ? (
            <IconSymbol name="chevron.right" size={16} color={colors.textTertiary} />
          ) : null}
        </View>
      )}
    </>
  );

  if (!onPress) {
    return (
      <View
        style={styles.row}
        accessible={!accessory}
        accessibilityLabel={value ? `${label}, ${value}` : label}
      >
        {content}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.backgroundSecondary }]}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: ButtonSize.touch + Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  iconTile: {
    width: ROW_ICON_TILE,
    height: ROW_ICON_TILE,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
    fontSize: FontSize.md,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flexShrink: 1,
    maxWidth: '55%',
  },
  value: {
    fontSize: FontSize.md,
  },
});
