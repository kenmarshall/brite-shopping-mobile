import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/services/api';
import { formatPrice, formatProductSize } from '@/utils/format';
import { comparesPerPound, estimateByWeight, pricesWithUnits, summarizePrices, unitPrice } from '@/utils/prices';

interface Props {
  product: Product;
  quantity: number;
  onOpen: (product: Product) => void;
  onQuantity: (product: Product, quantity: number) => void;
}

const S = Strings.card;
const THUMB = 72;

/** Search/browse result: lowest price with where it's from, unit price, and add-to-list. */
function ProductCardBase({ product, quantity, onOpen, onQuantity }: Props) {
  const colors = useColors();
  const summary = summarizePrices(pricesWithUnits(product));
  const lowest = summary.lowest;
  const estimate = lowest ? null : estimateByWeight(product);
  const amount = lowest?.price.amount ?? estimate?.lb ?? product.estimated_price;
  const weightUnit = lowest?.price.price_unit ?? (estimate ? 'lb' : null);
  const unit = amount != null && !weightUnit ? unitPrice(amount, product.size, comparesPerPound(product)) : null;
  const meta = [formatProductSize(product.size), unit ? S.perUnit(formatPrice(unit.amount), unit.per) : null]
    .filter(Boolean)
    .join(' · ');

  const tag: { label: string; tone: 'positive' | 'caution' | 'neutral' } = !lowest
    ? { label: S.estimate, tone: 'neutral' }
    : lowest.isStale
      ? { label: S.outdated, tone: 'caution' }
      : summary.rows.length > 1
        ? { label: S.lowestOf(summary.rows.length), tone: 'positive' }
        : { label: S.onlyAt(lowest.price.store_name ?? lowest.price.location_id), tone: 'neutral' };
  const hasImage = !!product.image_url && !product.image_url.startsWith('data:image/svg');
  const price = formatPrice(amount) + (weightUnit ? ` ${Strings.product.perWeight[weightUnit]}` : '');

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Pressable
        onPress={() => onOpen(product)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
        accessibilityRole="link"
        accessibilityLabel={S.label(product.name, price, tag.label)}
      >
        <View style={[styles.thumb, { backgroundColor: hasImage ? colors.surface : colors.placeholder }]}>
          {hasImage ? (
            <Image source={{ uri: product.image_url ?? undefined }} style={styles.thumbImage} contentFit="contain" recyclingKey={product._id} />
          ) : (
            <IconSymbol name="photo" size={24} color={colors.placeholderIcon} />
          )}
        </View>
        <View style={styles.text}>
          <ThemedText style={styles.name} numberOfLines={2}>{product.name}</ThemedText>
          {meta ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>{meta}</ThemedText> : null}
          <View style={styles.priceRow}>
            <ThemedText style={styles.price}>{price}</ThemedText>
            <Tag label={tag.label} tone={tag.tone} />
          </View>
        </View>
      </Pressable>

      <View style={styles.action}>
        {quantity > 0 ? (
          <QuantityStepper compact quantity={quantity} onChange={(n) => onQuantity(product, n)} />
        ) : (
          <Pressable
            onPress={() => onQuantity(product, 1)}
            style={({ pressed }) => [styles.add, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={Strings.cart.addLabel(product.name)}
          >
            <IconSymbol name="cart.badge.plus" size={20} color={colors.onPrimary} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

export const ProductCard = memo(ProductCardBase);

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: Radius.lg, paddingRight: Spacing.sm },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.md },
  pressed: { opacity: 0.7 },
  thumb: { width: THUMB, height: THUMB, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: THUMB, height: THUMB },
  text: { flex: 1, minWidth: 0, gap: Spacing.xs / 2 },
  name: { ...Type.body, fontFamily: Fonts.semibold },
  meta: { ...Type.callout, fontVariant: ['tabular-nums'] },
  priceRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  price: { ...Type.headline, fontFamily: Fonts.display, fontVariant: ['tabular-nums'] },
  action: { alignSelf: 'flex-end', paddingBottom: Spacing.sm },
  add: { width: ButtonSize.touch, height: ButtonSize.touch, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
