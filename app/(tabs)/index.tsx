import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  LayoutAnimation,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  UIManager,
  Platform,
  View,
} from 'react-native';

import BarcodeScanner from '@/components/BarcodeScanner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ButtonSize, CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  type Product,
  type Store,
  getAllProducts,
  getCategories,
  getStores,
  searchProducts,
} from '@/services/api';
import { addToList } from '@/services/shoppingList';
import { formatMeasure, formatPackInfo, formatPrice, formatStoreCount } from '@/utils/format';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const CARD_HEIGHT = 108;
const IMAGE_SIZE = CARD_HEIGHT;

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeStore, setActiveStore] = useState<string | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasActiveFilter = activeCategory !== null || activeStore !== null;

  const fetchProducts = useCallback(
    async (searchQuery: string, category?: string | null, storeId?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        let results: Product[];
        const filters: { category?: string; store_id?: string } = {};
        if (category) filters.category = category;
        if (storeId) filters.store_id = storeId;

        if (searchQuery.trim() || Object.keys(filters).length > 0) {
          results = await searchProducts(searchQuery, filters);
        } else {
          results = await getAllProducts();
        }
        setProducts(results);
      } catch (err: any) {
        setError(err.message || 'Failed to load products');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchProducts('');
    getCategories()
      .then(setCategories)
      .catch(() => {});
    getStores()
      .then(setStores)
      .catch(() => {});
  }, [fetchProducts]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim()) {
      setActiveCategory(null);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchProducts(text, text.trim() ? null : activeCategory, activeStore),
      400,
    );
  };

  const handleCategoryPress = (category: string) => {
    const next = activeCategory === category ? null : category;
    setActiveCategory(next);
    setQuery('');
    fetchProducts('', next, activeStore);
  };

  const handleStorePress = (storeId: string) => {
    const next = activeStore === storeId ? null : storeId;
    setActiveStore(next);
    fetchProducts(query, activeCategory, next);
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchProducts(query, activeCategory, activeStore),
      getCategories().then(setCategories).catch(() => {}),
      getStores().then(setStores).catch(() => {}),
    ]);
    setRefreshing(false);
  }, [fetchProducts, query, activeCategory, activeStore]);

  const toggleFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setFiltersVisible((v) => !v);
  };

  const handleQuickAdd = async (item: Product) => {
    await addToList({
      productId: item._id,
      name: item.name,
      estimatedPrice: item.estimated_price,
      imageUrl: item.image_url,
    });
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const packLabel = formatPackInfo(item.size);
    const measureLabel = formatMeasure(item.size);
    return (
      <Pressable
        style={[styles.card, { backgroundColor: colors.card }]}
        onPress={() =>
          router.push({ pathname: '/product/[id]', params: { id: item._id } })
        }
        accessibilityRole="button"
        accessibilityLabel={`${item.name}${packLabel ? `, ${packLabel}` : ''}${measureLabel ? `, ${measureLabel}` : ''}, ${formatPrice(item.estimated_price)}`}
      >
      <View style={[styles.imageContainer, { backgroundColor: colors.placeholder }]}>
        {item.image_url && !item.image_url.startsWith('data:image/svg') ? (
          <Image
            source={{ uri: item.image_url }}
            style={styles.productImage}
            contentFit="cover"
          />
        ) : (
          <IconSymbol name="photo" size={28} color={colors.placeholderText} />
        )}
      </View>
      <View style={styles.cardContent}>
        <ThemedText style={styles.productName} numberOfLines={1}>
          {item.name}
        </ThemedText>
        <View style={styles.sizeRow}>
          {packLabel ? (
            <View style={[styles.packBadge, { backgroundColor: colors.tint + '18' }]}>
              <ThemedText style={[styles.packBadgeText, { color: colors.tint }]}>
                {packLabel}
              </ThemedText>
            </View>
          ) : null}
          {measureLabel ? (
            <ThemedText style={[styles.sizeLabel, { color: colors.textSecondary }]}>
              {measureLabel}
            </ThemedText>
          ) : null}
          {!packLabel && !measureLabel && (
            <ThemedText style={[styles.sizeLabel, { color: 'transparent' }]}>{'\u00A0'}</ThemedText>
          )}
        </View>
        <View style={styles.priceRow}>
          <View>
            <ThemedText style={[styles.price, { color: colors.tint }]}>
              {formatPrice(item.estimated_price)}
            </ThemedText>
            <ThemedText style={[styles.storeCount, { color: colors.textSecondary }]}>
              {formatStoreCount(item.location_prices.length)}
            </ThemedText>
          </View>
          <Pressable
            style={[styles.quickAddButton, { backgroundColor: colors.tint }]}
            onPress={(e) => {
              e.stopPropagation?.();
              handleQuickAdd(item);
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Add ${item.name} to shopping list`}
          >
            <ThemedText style={styles.quickAddText}>+</ThemedText>
          </Pressable>
        </View>
      </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Brite Shopping
        </ThemedText>
        <View style={styles.searchRow}>
          <TextInput
            style={[
              styles.searchInput,
              {
                backgroundColor: colors.backgroundSecondary,
                color: colors.text,
              },
            ]}
            placeholder="Search products, brands, categories..."
            placeholderTextColor={colors.icon}
            value={query}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search products"
          />
          <Pressable
            onPress={() => setScannerVisible(true)}
            style={[styles.filterButton, { backgroundColor: colors.backgroundSecondary }]}
            accessibilityRole="button"
            accessibilityLabel="Scan barcode"
          >
            <IconSymbol name="barcode.viewfinder" size={20} color={colors.icon} />
          </Pressable>
          <Pressable
            onPress={toggleFilters}
            style={[
              styles.filterButton,
              { backgroundColor: hasActiveFilter ? colors.tint : colors.backgroundSecondary },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Toggle filters"
            accessibilityState={{ expanded: filtersVisible }}
          >
            <IconSymbol
              name="line.3.horizontal.decrease"
              size={20}
              color={hasActiveFilter ? '#fff' : colors.icon}
            />
            {hasActiveFilter && <View style={styles.filterDot} />}
          </Pressable>
        </View>
        {filtersVisible && (
          <View style={styles.filterPanel}>
            {categories.length > 0 && (
              <View>
                <ThemedText style={[styles.filterSectionLabel, { color: colors.textSecondary }]}>Category</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipContent}
                >
                  {categories.map((cat) => (
                    <Pressable
                      key={cat}
                      style={[
                        styles.chip,
                        activeCategory === cat
                          ? { backgroundColor: colors.tint }
                          : { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => handleCategoryPress(cat)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${cat}`}
                      accessibilityState={{ selected: activeCategory === cat }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          activeCategory === cat && styles.chipTextActive,
                        ]}
                      >
                        {cat}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
            {stores.length > 0 && (
              <View>
                <ThemedText style={[styles.filterSectionLabel, { color: colors.textSecondary }]}>Store</ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipContent}
                >
                  {stores.map((store) => (
                    <Pressable
                      key={store.store_id}
                      style={[
                        styles.chip,
                        activeStore === store.store_id
                          ? { backgroundColor: colors.success }
                          : { backgroundColor: colors.backgroundSecondary },
                      ]}
                      onPress={() => handleStorePress(store.store_id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${store.store_name}`}
                      accessibilityState={{ selected: activeStore === store.store_id }}
                    >
                      <ThemedText
                        style={[
                          styles.chipText,
                          activeStore === store.store_id && styles.chipTextActive,
                        ]}
                      >
                        {store.store_name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        )}
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText style={[styles.errorText, { color: colors.error }]}>{error}</ThemedText>
          <Pressable
            onPress={() => fetchProducts(query, activeCategory, activeStore)}
            style={[styles.retryButton, { backgroundColor: colors.tint }]}
            accessibilityRole="button"
            accessibilityLabel="Retry loading products"
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={products}
          renderItem={renderProduct}
          keyExtractor={(item) => item._id}
          style={{ backgroundColor: colors.backgroundSecondary }}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {query || activeCategory || activeStore
                  ? 'No products found'
                  : 'No products available'}
              </ThemedText>
            </View>
          }
        />
      )}

      <Modal visible={scannerVisible} animationType="slide" presentationStyle="fullScreen">
        <BarcodeScanner
          onScanned={(barcodeValue) => {
            setScannerVisible(false);
            router.push({ pathname: '/scan', params: { barcode: barcodeValue } });
          }}
          onClose={() => setScannerVisible(false)}
        />
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: Spacing.headerTop,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerTitle: {
    marginBottom: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.md,
  },
  filterButton: {
    width: ButtonSize.touch,
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
  },
  filterPanel: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  filterSectionLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
  },
  chipContent: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radius.lg,
  },
  chipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
  },
  list: {
    padding: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: 152,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    overflow: 'hidden',
    paddingLeft: Spacing.md,
    ...CardShadow,
  },
  imageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: Radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  cardContent: {
    flex: 1,
    padding: Spacing.md,
    justifyContent: 'center',
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    marginBottom: 2,
  },
  sizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  packBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  packBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  sizeLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  price: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  storeCount: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  quickAddButton: {
    width: ButtonSize.small,
    height: ButtonSize.small,
    borderRadius: ButtonSize.small / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickAddText: {
    color: '#fff',
    fontSize: FontSize.xl,
    fontWeight: '700',
    lineHeight: 22,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: FontSize.md,
  },
});
