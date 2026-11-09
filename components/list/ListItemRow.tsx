import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { ShoppingListItem } from '@/services/shoppingList';
import { formatPrice } from '@/utils/format';

interface Props {
  item: ShoppingListItem;
  onToggle: (item: ShoppingListItem) => void;
  onQuantity: (item: ShoppingListItem, quantity: number) => void;
  onOpen: (item: ShoppingListItem) => void;
}

const S = Strings.list;
const THUMB = 44;

/** One list line: tick-off circle, product (tap to open), and a quantity stepper until it's in the cart. */
export function ListItemRow({ item, onToggle, onQuantity, onOpen }: Props) {
  const colors = useColors();
  const checked = !!item.checked;
  const price = item.estimatedPrice;
  const meta =
    price == null
      ? S.noPrice
      : item.quantity > 1
        ? S.each(formatPrice(price), item.quantity, formatPrice(price * item.quantity))
        : formatPrice(price);
  const hasImage = !!item.imageUrl && !item.imageUrl.startsWith('data:image/svg');

  return (
    <View style={[styles.row, checked && styles.checkedRow]}>
      <Pressable
        onPress={() => onToggle(item)}
        style={styles.check}
        accessibilityRole="checkbox"
        aria-checked={checked}
        accessibilityLabel={checked ? S.uncheck(item.name) : S.check(item.name)}
      >
        <IconSymbol
          name={checked ? 'checkmark.circle.fill' : 'circle'}
          size={26}
          color={checked ? colors.positive : colors.textTertiary}
        />
      </Pressable>

      <Pressable
        onPress={() => onOpen(item)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={S.open(item.name)}
      >
        {checked ? null : (
          <View style={[styles.thumb, { backgroundColor: hasImage ? colors.surface : colors.placeholder }]}>
            {hasImage ? (
              <Image source={{ uri: item.imageUrl ?? undefined }} style={styles.thumbImage} contentFit="contain" />
            ) : (
              <IconSymbol name="photo" size={18} color={colors.placeholderIcon} />
            )}
          </View>
        )}
        <View style={styles.text}>
          <ThemedText
            style={[styles.name, checked && { color: colors.textSecondary, textDecorationLine: 'line-through' }]}
            numberOfLines={2}
          >
            {item.name}
          </ThemedText>
          {checked ? null : <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{meta}</ThemedText>}
        </View>
      </Pressable>

      {checked ? (
        <ThemedText style={[styles.checkedPrice, { color: colors.textSecondary }]}>
          {price == null ? '' : formatPrice(price * item.quantity)}
        </ThemedText>
      ) : (
        <QuantityStepper compact quantity={item.quantity} onChange={(n) => onQuantity(item, n)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingLeft: Spacing.xs, paddingRight: Spacing.xs, minHeight: THUMB + Spacing.xl },
  checkedRow: { minHeight: ButtonSize.large },
  check: { width: ButtonSize.touch, height: ButtonSize.touch, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, minHeight: ButtonSize.touch },
  pressed: { opacity: 0.7 },
  thumb: { width: THUMB, height: THUMB, borderRadius: Radius.sm, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: THUMB, height: THUMB },
  text: { flex: 1, minWidth: 0 },
  name: { ...Type.body, fontFamily: Fonts.semibold },
  meta: { ...Type.callout, fontVariant: ['tabular-nums'] },
  checkedPrice: { ...Type.callout, fontFamily: Fonts.semibold, fontVariant: ['tabular-nums'], paddingHorizontal: Spacing.md },
});
