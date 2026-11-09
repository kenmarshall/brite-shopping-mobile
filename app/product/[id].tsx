import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceHero } from '@/components/product/PriceHero';
import { StorePriceList } from '@/components/product/StorePriceList';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Snackbar, type SnackbarMessage } from '@/components/ui/Snackbar';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, CardShadow, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { type Product, getProduct } from '@/services/api';
import { addToList, getShoppingList, updateQuantity } from '@/services/shoppingList';
import { formatProductSize } from '@/utils/format';
import { summarizePrices } from '@/utils/prices';

const S = Strings.product;
const HERO_HEIGHT = 300;

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; product: Product };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [quantity, setQuantityState] = useState(0);
  const [updating, setUpdating] = useState(false);
  // Refs so undo callbacks, created on an earlier render, see the current values.
  const quantityRef = useRef(0);
  const updatingRef = useRef(false);
  const setQuantity = (n: number) => {
    quantityRef.current = n;
    setQuantityState(n);
  };
  const [snack, setSnack] = useState<SnackbarMessage | null>(null);
  const snackId = useRef(0);

  const fetchProduct = useCallback(async (): Promise<void> => {
    if (!id) return setLoad({ status: 'error' });
    setLoad({ status: 'loading' });
    try {
      const [product, list] = await Promise.all([getProduct(id), getShoppingList()]);
      setLoad({ status: 'ready', product });
      setQuantity(list.find((i) => i.productId === product._id)?.quantity ?? 0);
    } catch {
      setLoad({ status: 'error' });
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      fetchProduct();
    }, [fetchProduct]),
  );

  const product = load.status === 'ready' ? load.product : null;
  const summary = useMemo(() => summarizePrices(product?.location_prices ?? []), [product]);

  const showSnack = (text: string, onAction?: () => void) => {
    snackId.current += 1;
    setSnack({ id: snackId.current, text, actionLabel: onAction ? S.undo : undefined, onAction });
  };
  const dismissSnack = useCallback(() => setSnack(null), []);

  /** Sets the list quantity for this product; 0 removes it. */
  const setListQuantity = async (next: number, undoable: boolean): Promise<void> => {
    if (!product || updatingRef.current) return;
    const previous = quantityRef.current;
    updatingRef.current = true;
    setUpdating(true);
    try {
      if (previous === 0) {
        await addToList({ productId: product._id, name: product.name, estimatedPrice: product.estimated_price, imageUrl: product.image_url });
        if (next > 1) await updateQuantity(product._id, next);
      } else {
        await updateQuantity(product._id, next);
      }
      setQuantity(next);
      if (!undoable) return;
      if (previous === 0) showSnack(S.added, () => setListQuantity(0, false));
      else if (next === 0) showSnack(S.removed, () => setListQuantity(previous, false));
    } catch {
      showSnack(S.listError);
    } finally {
      updatingRef.current = false;
      setUpdating(false);
    }
  };

  if (load.status === 'loading') return <StateView />;
  if (!product) {
    return (
      <StateView
        title={S.notFound}
        body={S.loadError}
        action={id ? { label: S.retry, onPress: fetchProduct } : { label: S.goBack, onPress: () => router.back() }}
      />
    );
  }

  const meta = [formatProductSize(product.size), product.category].filter(Boolean).join(' · ');
  const hasImage = !!product.image_url && !product.image_url.startsWith('data:image/svg');
  const barHeight = ButtonSize.large + Spacing.md * 2 + insets.bottom;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: barHeight + Spacing.xl }]}>
        <View style={[styles.hero, { backgroundColor: hasImage ? colors.surface : colors.placeholder }]}>
          {hasImage ? (
            <Image
              source={{ uri: product.image_url ?? undefined }}
              style={styles.heroImage}
              contentFit="contain"
              accessibilityLabel={S.imageLabel(product.name)}
            />
          ) : (
            <IconSymbol name="photo" size={72} color={colors.placeholderIcon} />
          )}
        </View>

        <View style={styles.titleBlock}>
          <ThemedText style={styles.name} accessibilityRole="header">{product.name}</ThemedText>
          {meta ? <ThemedText style={[styles.meta, { color: colors.textSecondary }]}>{meta}</ThemedText> : null}
        </View>

        <PriceHero product={product} summary={summary} />

        <View style={styles.sectionHeader}>
          <ThemedText style={styles.sectionTitle} accessibilityRole="header">{S.pricesByStore}</ThemedText>
          {summary.rows.length > 1 ? (
            <ThemedText style={[styles.sectionNote, { color: colors.textSecondary }]}>{S.lowestFirst}</ThemedText>
          ) : null}
        </View>
        {summary.rows.length > 0 ? (
          <StorePriceList rows={summary.rows} />
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <ThemedText style={styles.emptyTitle}>{S.noPricesTitle}</ThemedText>
            <ThemedText style={[styles.sectionNote, { color: colors.textSecondary }]}>{S.noPricesBody}</ThemedText>
          </View>
        )}

        <Pressable
          onPress={() => router.push({ pathname: '/product/edit', params: { id: product._id } })}
          style={({ pressed }) => [
            styles.linkRow,
            { backgroundColor: pressed ? colors.backgroundSecondary : colors.surface, borderColor: colors.border },
          ]}
          accessibilityRole="button"
          accessibilityLabel={S.suggestCorrection}
        >
          <IconSymbol name="pencil" size={20} color={colors.primaryStrong} />
          <ThemedText style={styles.linkText}>{S.suggestCorrection}</ThemedText>
          <IconSymbol name="chevron.right" size={18} color={colors.textTertiary} />
        </Pressable>
        <ThemedText style={[styles.disclaimer, { color: colors.textSecondary }]}>{S.disclaimer}</ThemedText>
      </ScrollView>

      <Pressable
        onPress={() => router.back()}
        style={[styles.navButton, { top: insets.top + Spacing.sm, backgroundColor: colors.surface }]}
        accessibilityRole="button"
        accessibilityLabel={S.back}
      >
        <IconSymbol name="chevron.left" size={20} color={colors.text} />
      </Pressable>

      <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: insets.bottom + Spacing.md }]}>
        {quantity > 0 ? (
          <>
            <QuantityStepper quantity={quantity} onChange={(n) => setListQuantity(n, true)} disabled={updating} />
            <Button label={S.viewList} variant="secondary" icon="cart.fill" onPress={() => router.push('/explore')} />
          </>
        ) : (
          <Button label={S.addToList} icon="cart.badge.plus" busy={updating} onPress={() => setListQuantity(1, true)} />
        )}
      </View>

      <Snackbar message={snack} onDismiss={dismissSnack} bottom={barHeight + Spacing.sm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { gap: Spacing.lg },
  hero: { height: HERO_HEIGHT, alignItems: 'center', justifyContent: 'center' },
  heroImage: { width: '100%', height: '100%' },
  titleBlock: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  name: { ...Type.title },
  meta: { ...Type.body },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: -Spacing.sm,
  },
  sectionTitle: { ...Type.section },
  sectionNote: { ...Type.callout },
  emptyCard: { marginHorizontal: Spacing.lg, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, gap: Spacing.xs },
  emptyTitle: { ...Type.headline },
  linkRow: {
    marginHorizontal: Spacing.lg,
    minHeight: ButtonSize.large,
    borderWidth: 1,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  linkText: { ...Type.body, fontFamily: Fonts.medium, flex: 1 },
  disclaimer: { ...Type.callout, paddingHorizontal: Spacing.lg, marginTop: -Spacing.sm },
  navButton: {
    position: 'absolute',
    left: Spacing.lg,
    width: ButtonSize.touch,
    height: ButtonSize.touch,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    ...CardShadow,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    flexDirection: 'row',
    gap: Spacing.md,
  },
});
