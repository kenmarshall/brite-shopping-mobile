import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ButtonSize, CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  type Product,
  getAllProducts,
  getCategories,
  searchProducts,
} from '@/services/api';
import { addToList } from '@/services/shoppingList';
import { formatPrice, formatStoreCount } from '@/utils/format';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(
    async (searchQuery: string, category?: string | null) => {
      setLoading(true);
      setError(null);
      try {
        let results: Product[];
        if (searchQuery.trim()) {
          results = await searchProducts(searchQuery);
        } else if (category) {
          results = await searchProducts('', { category });
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
  }, [fetchProducts]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (text.trim()) {
      setActiveCategory(null);
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => fetchProducts(text, text.trim() ? null : activeCategory),
      400,
    );
  };

  const handleCategoryPress = (category: string) => {
    const next = activeCategory === category ? null : category;
    setActiveCategory(next);
    setQuery('');
    fetchProducts('', next);
  };

  const handleQuickAdd = async (item: Product) => {
    await addToList({
      productId: item._id,
      name: item.name,
      brand: item.brand,
      estimatedPrice: item.estimated_price,
      imageUrl: item.image_url,
    });
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={() =>
        router.push({ pathname: '/product/[id]', params: { id: item._id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${item.name}, ${formatPrice(item.estimated_price)}`}
    >
      {item.image_url && !item.image_url.startsWith('data:image/svg') ? (
        <Image
          source={{ uri: item.image_url }}
          style={styles.productImage}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.productImage, { backgroundColor: colors.placeholder }]}>
          <ThemedText style={{ fontSize: FontSize.xs, color: colors.placeholderText }}>
            No Image
          </ThemedText>
        </View>
      )}
      <View style={styles.cardContent}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        {item.brand && (
          <ThemedText style={[styles.secondaryText, { color: colors.textSecondary }]}>
            {item.brand}
          </ThemedText>
        )}
        {item.category && (
          <ThemedText style={[styles.categoryLabel, { color: colors.tint }]}>
            {item.category}
          </ThemedText>
        )}
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

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.headerTitle}>
          Brite Shopping
        </ThemedText>
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
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipRow}
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
            onPress={() => fetchProducts(query, activeCategory)}
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
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.centered}>
              <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                {query || activeCategory
                  ? 'No products found'
                  : 'No products available'}
              </ThemedText>
            </View>
          }
        />
      )}
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
  searchInput: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.md,
  },
  chipRow: {
    marginTop: Spacing.sm,
    maxHeight: 36,
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
  },
  card: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    overflow: 'hidden',
    ...CardShadow,
  },
  productImage: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
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
  secondaryText: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.xs,
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
