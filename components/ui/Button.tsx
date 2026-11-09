import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol, type IconSymbolName } from '@/components/ui/IconSymbol';
import { ButtonSize, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  icon?: IconSymbolName;
  busy?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', icon, busy = false, disabled = false }: Props) {
  const colors = useColors();
  const primary = variant === 'primary';
  const fg = primary ? colors.onPrimary : colors.primaryStrong;
  const inactive = disabled || busy;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy }}
      style={({ pressed }) => [
        styles.base,
        primary ? { backgroundColor: colors.primary } : { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 },
        pressed && styles.pressed,
        inactive && styles.dimmed,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <IconSymbol name={icon} size={20} color={fg} /> : null}
          <ThemedText style={[styles.label, { color: fg }]} numberOfLines={1}>{label}</ThemedText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flex: 1,
    minHeight: ButtonSize.large,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  label: { ...Type.headline },
  pressed: { opacity: 0.85 },
  dimmed: { opacity: 0.6 },
});
