import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PriceHero } from '@/components/product/PriceHero';
import { StorePriceList } from '@/components/product/StorePriceList';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { QuantityStepper } from '@/components/ui/QuantityStepper';
import { Snackbar } from '@/components/ui/Snackbar';
import { StateView } from '@/components/ui/StateView';
import { Strings } from '@/constants/Strings';
import { ButtonSize, CardShadow, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useListActions } from '@/hooks/useListActions';
import { useSnackbar } from '@/hooks/useSnackbar';
import { type Product, getProduct } from '@/services/api';
import { formatProductSize } from '@/utils/format';
import { pricesWithUnits, summarizePrices } from '@/utils/prices';

const S = Strings.product;
const HERO_HEIGHT = 300;

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; product: Product };

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const snackbar = useSnackbar();
  const listActions = useListActions(snackbar, () => router.push('/list'), true);

  const fetchProduct = useCallback(async (): Promise<void> => {
    if (!id) return setLoad({ status: 'error' });
    setLoad({ status: 'loading' });
    try {
      setLoad({ status: 'ready', product: await getProduct(id) });
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
  const summary = useMemo(() => summarizePrices(product ? pricesWithUnits(product) : []), [product]);

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
  const quantity = listActions.quantityOf(product._id);
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
            <QuantityStepper quantity={quantity} onChange={(n) => listActions.setProductQuantity(product, n)} disabled={listActions.busy} />
            <Button label={S.viewList} variant="secondary" icon="cart.fill" onPress={() => router.push('/list')} />
          </>
        ) : (
          <Button label={S.addToList} icon="cart.badge.plus" busy={listActions.busy} onPress={() => listActions.setProductQuantity(product, 1)} />
        )}
      </View>

      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={barHeight + Spacing.sm} />
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
