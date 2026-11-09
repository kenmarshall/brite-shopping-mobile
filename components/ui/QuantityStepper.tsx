import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Radius, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';

interface Props {
  quantity: number;
  /** Called with the new quantity; 0 means remove. */
  onChange: (quantity: number) => void;
  disabled?: boolean;
  /** Borderless, touch-height version for list rows. */
  compact?: boolean;
}

const S = Strings.product;

export function QuantityStepper({ quantity, onChange, disabled = false, compact = false }: Props) {
  const colors = useColors();
  const removes = quantity <= 1;

  return (
    <View
      style={[styles.box, compact ? styles.compact : { borderColor: colors.border }, disabled && styles.dimmed]}
      accessibilityRole="adjustable"
      accessibilityLabel={S.quantity(quantity)}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => onChange(e.nativeEvent.actionName === 'increment' ? quantity + 1 : quantity - 1)}
    >
      <Pressable
        onPress={() => onChange(quantity - 1)}
        disabled={disabled}
        style={[styles.step, compact && styles.compactStep]}
        accessibilityRole="button"
        accessibilityLabel={removes ? S.remove : S.decrease}
      >
        <IconSymbol name={removes ? 'trash' : 'minus'} size={18} color={removes ? colors.danger : colors.text} />
      </Pressable>
      <ThemedText style={styles.count}>{quantity}</ThemedText>
      <Pressable
        onPress={() => onChange(quantity + 1)}
        disabled={disabled}
        style={[styles.step, compact && styles.compactStep]}
        accessibilityRole="button"
        accessibilityLabel={S.increase}
      >
        <IconSymbol name="plus" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: ButtonSize.large, borderRadius: Radius.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center' },
  step: { width: ButtonSize.touch, minHeight: ButtonSize.large, alignItems: 'center', justifyContent: 'center' },
  count: { ...Type.headline, fontFamily: Type.price.fontFamily, minWidth: 24, textAlign: 'center', fontVariant: ['tabular-nums'] },
  compact: { minHeight: ButtonSize.touch, borderWidth: 0 },
  compactStep: { minHeight: ButtonSize.touch },
  dimmed: { opacity: 0.6 },
});
