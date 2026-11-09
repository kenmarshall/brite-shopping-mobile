import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { BasketItem } from '@/services/curator';
import { formatPrice, formatProductSize } from '@/utils/format';

const S = Strings.curator;
const TONE = { needed: 'neutral', outdated: 'caution', done: 'positive' } as const;

interface Props {
  item: BasketItem;
  onPress: (item: BasketItem) => void;
}

/** One basket slot at a store: what it is, the product it maps to, and whether it's priced here. */
export function BasketRow({ item, onPress }: Props) {
  const colors = useColors();
  const product = item.product;
  const size = product ? formatProductSize(product.size) : null;
  const price = item.price
    ? formatPrice(item.price.amount) + (item.price.price_unit ? ` ${Strings.product.perWeight[item.price.price_unit]}` : '')
    : null;

  return (
    <Pressable
      onPress={() => onPress(item)}
      style={({ pressed }) => [styles.row, { borderBottomColor: colors.border }, pressed && { backgroundColor: colors.backgroundSecondary }]}
      accessibilityRole="button"
      accessibilityLabel={S.basketItemLabel(item.label, product?.name ?? null, S.basketStatus[item.status])}
    >
      <View style={styles.text}>
        <ThemedText style={[styles.label, { color: colors.textSecondary }]}>{item.label}</ThemedText>
        <ThemedText style={styles.name} numberOfLines={2}>
          {product ? [product.name, size].filter(Boolean).join(' · ') : S.notInCatalog}
        </ThemedText>
      </View>
      <View style={styles.right}>
        <Tag label={S.basketStatus[item.status]} tone={TONE[item.status]} />
        {price ? <ThemedText style={[styles.price, { color: colors.textSecondary }]}>{price}</ThemedText> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    minHeight: ButtonSize.large + Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { flex: 1, minWidth: 0 },
  label: { ...Type.caption, textTransform: 'uppercase' },
  name: { ...Type.body, fontFamily: Fonts.semibold },
  right: { alignItems: 'flex-end', gap: Spacing.xs },
  price: { ...Type.callout, fontVariant: ['tabular-nums'] },
});
