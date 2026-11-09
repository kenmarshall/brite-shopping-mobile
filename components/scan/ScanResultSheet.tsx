import { Image } from 'expo-image';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Tag } from '@/components/ui/Tag';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/services/api';
import { formatPrice, formatProductSize } from '@/utils/format';
import { pricesWithUnits, summarizePrices } from '@/utils/prices';
import { scanInsight } from '@/utils/scan';

const S = Strings.scanSheet;
const THUMB = ButtonSize.large + Spacing.xs;

export type ScanResult = { status: 'looking' } | { status: 'found'; product: Product } | { status: 'notFound' } | { status: 'error' };
export type ScanSheetAction = 'next' | 'retry' | 'details' | 'help';

interface Props {
  result: ScanResult;
  quantity: number;
  onQuantity: (product: Product, quantity: number) => void;
  onAction: (action: ScanSheetAction) => void;
  onLayoutHeight: (height: number) => void;
}

/** Slides up over the camera after a scan: lowest price, where it's cheaper, and add to list. */
export function ScanResultSheet({ result, quantity, onQuantity, onAction, onLayoutHeight }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      onLayout={(e) => onLayoutHeight(e.nativeEvent.layout.height)}
      style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: insets.bottom + Spacing.lg }]}
      accessibilityLabel={S.resultLabel}
      accessibilityViewIsModal={false}
    >
      <View style={[styles.handle, { backgroundColor: colors.border }]} />
      {result.status === 'looking' ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.primary} />
          <ThemedText style={styles.body}>{S.looking}</ThemedText>
        </View>
      ) : result.status === 'found' ? (
        <Found product={result.product} quantity={quantity} onQuantity={onQuantity} onAction={onAction} />
      ) : (
        <View style={styles.block}>
          <ThemedText style={styles.title}>{result.status === 'notFound' ? S.notFoundTitle : S.errorTitle}</ThemedText>
          <ThemedText style={[styles.body, { color: colors.textSecondary }]}>
            {result.status === 'notFound' ? S.notFoundBody : S.errorBody}
          </ThemedText>
          <View style={styles.actions}>
            <Button label={S.scanNext} variant="secondary" onPress={() => onAction('next')} />
            {result.status === 'notFound' ? (
              <Button label={S.helpAdd} onPress={() => onAction('help')} />
            ) : (
              <Button label={S.retry} onPress={() => onAction('retry')} />
            )}
          </View>
        </View>
      )}
    </View>
  );
}

interface FoundProps {
  product: Product;
  quantity: number;
  onQuantity: (product: Product, quantity: number) => void;
  onAction: (action: ScanSheetAction) => void;
}

function Found({ product, quantity, onQuantity, onAction }: FoundProps) {
  const colors = useColors();
  const summary = useMemo(() => summarizePrices(pricesWithUnits(product)), [product]);
  const insight = scanInsight(summary);
  const lowest = summary.lowest;
  const unit = lowest?.price.price_unit;
  const hasImage = !!product.image_url && !product.image_url.startsWith('data:');
  const size = formatProductSize(product.size);
  const meta = [size, summary.rows.length > 0 ? S.storeCount(summary.rows.length) : null].filter(Boolean).join(' · ');
  const insightText =
    insight.kind === 'cheaper'
      ? S.cheaper(formatPrice(insight.amount), insight.store, insight.than)
      : insight.kind === 'onlyAt'
        ? S.onlyAt(insight.store)
        : insight.kind === 'same'
          ? S.same(insight.stores)
          : S.noPrices;
  const positive = insight.kind === 'cheaper';

  return (
    <View style={styles.block}>
      <Pressable onPress={() => onAction('details')} style={styles.row} accessibilityRole="button" accessibilityLabel={S.seeAll}>
        <View style={[styles.thumb, { backgroundColor: hasImage ? colors.surface : colors.placeholder }]}>
          {hasImage ? (
            <Image source={{ uri: product.image_url ?? undefined }} style={styles.thumbImage} contentFit="contain" accessibilityLabel={S.productImage(product.name)} />
          ) : (
            <IconSymbol name="photo" size={22} color={colors.placeholderIcon} />
          )}
        </View>
        <View style={styles.text}>
          <ThemedText style={styles.name} numberOfLines={2}>{product.name}</ThemedText>
          {meta ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{meta}</ThemedText> : null}
        </View>
        {lowest ? (
          <View style={styles.price}>
            <ThemedText style={styles.amount}>
              {formatPrice(lowest.price.amount)}
              {unit ? ` ${Strings.product.perWeight[unit]}` : ''}
            </ThemedText>
            <Tag label={S.lowest} tone="positive" />
          </View>
        ) : null}
      </Pressable>

      <View style={[styles.insight, { backgroundColor: positive ? colors.positiveContainer : colors.backgroundSecondary }]}>
        <IconSymbol name={positive ? 'arrow.down.right' : 'info.circle'} size={18} color={positive ? colors.positive : colors.textSecondary} />
        <View style={styles.text}>
          <ThemedText style={[styles.body, styles.insightText]}>{insightText}</ThemedText>
          {lowest?.isStale ? <ThemedText style={[styles.meta, { color: colors.caution }]}>{S.outdated}</ThemedText> : null}
        </View>
      </View>

      <View style={styles.actions}>
        <Button label={S.seeAll} variant="secondary" onPress={() => onAction('details')} />
        {quantity > 0 ? (
          <View style={styles.stepper}>
            <QuantityStepper quantity={quantity} onChange={(q) => onQuantity(product, q)} />
          </View>
        ) : (
          <Button label={S.addToList} icon="cart.badge.plus" onPress={() => onQuantity(product, 1)} />
        )}
      </View>
      <Pressable onPress={() => onAction('next')} style={styles.next} accessibilityRole="button" accessibilityLabel={S.scanNext}>
        <IconSymbol name="barcode.viewfinder" size={18} color={colors.primaryStrong} />
        <ThemedText style={[styles.nextText, { color: colors.primaryStrong }]}>{S.scanNext}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },
  handle: { width: Spacing.xxl, height: Spacing.xs + 1, borderRadius: Radius.pill, alignSelf: 'center' },
  block: { gap: Spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  thumb: { width: THUMB, height: THUMB, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImage: { width: THUMB, height: THUMB },
  text: { flex: 1, minWidth: 0, gap: Spacing.xs / 2 },
  name: { ...Type.headline },
  meta: { ...Type.callout },
  price: { alignItems: 'flex-end', gap: Spacing.xs },
  amount: { ...Type.title, fontFamily: Fonts.display, fontVariant: ['tabular-nums'] },
  insight: { flexDirection: 'row', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, alignItems: 'flex-start' },
  insightText: { fontFamily: Fonts.semibold },
  title: { ...Type.headline },
  body: { ...Type.body },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  stepper: { flex: 1, justifyContent: 'center' },
  next: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, minHeight: ButtonSize.touch },
  nextText: { ...Type.callout, fontFamily: Fonts.semibold },
});
