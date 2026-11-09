import { useBottomTabBarHeight } from 'expo-router/js-tabs';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Platform, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SearchField } from '@/components/home/SearchField';
import { ProductCard } from '@/components/product/ProductCard';
import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { ChipRow } from '@/components/ui/ChipRow';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Snackbar } from '@/components/ui/Snackbar';
import { Strings } from '@/constants/Strings';
import { Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import { useListActions } from '@/hooks/useListActions';
import { useShoppingList } from '@/hooks/useShoppingList';
import { useSnackbar } from '@/hooks/useSnackbar';
import { type Product, getAllProducts, getCategories, searchProducts } from '@/services/api';
import { calculateTotal } from '@/services/shoppingList';
import { formatPrice } from '@/utils/format';

const S = Strings.home;
const ALL = '__all__';
const SEARCH_DEBOUNCE_MS = 400;

type Results = { status: 'loading' } | { status: 'error' } | { status: 'ready'; products: Product[] };

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  // The tab bar floats over content only on iOS (see the tabs layout).
  const tabBarHeight = useBottomTabBarHeight();
  const barInset = Platform.OS === 'ios' ? tabBarHeight : 0;
  const snackbar = useSnackbar();
  const listActions = useListActions(snackbar, () => router.push('/list'));
  const list = useShoppingList();

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState(ALL);
  const [categories, setCategories] = useState<string[]>([]);
  const [results, setResults] = useState<Results>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Loads products for a query and category; responses to superseded requests are ignored. */
  const load = useCallback(async (q: string, cat: string): Promise<void> => {
    const id = ++requestId.current;
    setResults((r) => (r.status === 'ready' ? r : { status: 'loading' }));
    try {
      const filters = cat === ALL ? {} : { category: cat };
      const products = q.trim() || cat !== ALL ? await searchProducts(q, filters) : await getAllProducts();
      if (id === requestId.current) setResults({ status: 'ready', products });
    } catch {
      if (id === requestId.current) setResults({ status: 'error' });
    }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => load(query, category), query ? SEARCH_DEBOUNCE_MS : 0);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [query, category, load]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const refresh = async (): Promise<void> => {
    setRefreshing(true);
    await load(query, category);
    setRefreshing(false);
  };

  const openProduct = useCallback((p: Product) => router.push({ pathname: '/product/[id]', params: { id: p._id } }), [router]);
  const toGet = (list ?? []).filter((i) => !i.checked);
  const products = results.status === 'ready' ? results.products : [];
  const searching = query.trim().length > 0;
  const sectionTitle = searching ? S.results(products.length) : category === ALL ? S.browse : category;

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
      <View style={styles.titleBlock}>
        <ThemedText style={[styles.eyebrow, { color: colors.textSecondary }]}>{S.eyebrow}</ThemedText>
        <ThemedText style={styles.title} accessibilityRole="header">{S.title}</ThemedText>
      </View>
      <View style={styles.padded}>
        <SearchField value={query} onChange={setQuery} onScan={() => router.push('/scanner')} />
      </View>
      {categories.length > 0 ? (
        <ChipRow
          options={[ALL, ...categories].map((c) => ({
            key: c,
            label: c === ALL ? S.all : c,
            accessibilityLabel: S.categoryLabel(c === ALL ? S.all : c),
          }))}
          selected={category}
          onSelect={setCategory}
        />
      ) : null}
      {!searching && toGet.length > 0 ? (
        <Pressable
          onPress={() => router.push('/list')}
          style={({ pressed }) => [styles.listCard, { backgroundColor: colors.primaryContainer }, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={S.openList}
        >
          <IconSymbol name="cart.fill" size={22} color={colors.onPrimaryContainer} />
          <View style={styles.listText}>
            <ThemedText style={[styles.listTitle, { color: colors.onPrimaryContainer }]}>{S.yourList(toGet.length)}</ThemedText>
            <ThemedText style={[styles.listMeta, { color: colors.onPrimaryContainer }]}>
              {S.listEstimate(formatPrice(calculateTotal(toGet)))}
            </ThemedText>
          </View>
          <IconSymbol name="chevron.right" size={18} color={colors.onPrimaryContainer} />
        </Pressable>
      ) : null}
      {results.status === 'ready' && products.length > 0 ? (
        <ThemedText style={[styles.section, styles.padded]} accessibilityRole="header">{sectionTitle}</ThemedText>
      ) : null}
    </View>
  );

  const empty =
    results.status === 'loading' ? (
      <ActivityIndicator style={styles.state} size="large" color={colors.primary} />
    ) : results.status === 'error' ? (
      <View style={styles.state}>
        <ThemedText style={[styles.stateBody, { color: colors.textSecondary }]}>{S.loadError}</ThemedText>
        <View style={styles.stateAction}>
          <Button label={S.retry} variant="secondary" onPress={() => load(query, category)} />
        </View>
      </View>
    ) : (
      <View style={styles.state}>
        {searching ? <ThemedText style={styles.stateTitle}>{S.noResultsTitle(query.trim())}</ThemedText> : null}
        <ThemedText style={[styles.stateBody, { color: colors.textSecondary }]}>
          {searching ? S.noResultsBody : S.emptyCategory}
        </ThemedText>
        {searching ? (
          <View style={styles.stateAction}>
            <Button label={S.scan} variant="secondary" icon="barcode.viewfinder" onPress={() => router.push('/scanner')} />
          </View>
        ) : null}
      </View>
    );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={products}
        keyExtractor={(p) => p._id}
        renderItem={({ item }) => (
          <View style={styles.padded}>
            <ProductCard
              product={item}
              quantity={listActions.quantityOf(item._id)}
              onOpen={openProduct}
              onQuantity={listActions.setProductQuantity}
            />
          </View>
        )}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        contentContainerStyle={[styles.content, { paddingBottom: barInset + Spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} colors={[colors.primary]} />}
      />
      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={barInset + Spacing.sm} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: Spacing.md },
  header: { gap: Spacing.lg, paddingBottom: Spacing.xs },
  padded: { paddingHorizontal: Spacing.lg },
  titleBlock: { paddingHorizontal: Spacing.lg, gap: Spacing.xs },
  eyebrow: { ...Type.callout },
  title: { ...Type.display },
  listCard: {
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  pressed: { opacity: 0.85 },
  listText: { flex: 1 },
  listTitle: { ...Type.headline },
  listMeta: { ...Type.callout },
  section: { ...Type.section, marginBottom: -Spacing.xs },
  state: { alignItems: 'center', padding: Spacing.xxl, gap: Spacing.sm },
  stateTitle: { ...Type.headline, fontFamily: Fonts.semibold, textAlign: 'center' },
  stateBody: { ...Type.body, textAlign: 'center' },
  stateAction: { flexDirection: 'row', alignSelf: 'stretch', marginTop: Spacing.md },
});
