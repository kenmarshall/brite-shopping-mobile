import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { type Product, getAllProducts, searchProducts } from '@/services/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchProducts = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = searchQuery.trim()
        ? await searchProducts(searchQuery)
        : await getAllProducts();
      setProducts(results);
    } catch (err: any) {
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts('');
  }, [fetchProducts]);

  const handleSearch = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchProducts(text), 400);
  };

  const formatPrice = (price: number | null, currency = 'JMD') => {
    if (price == null) return 'Price unavailable';
    if (currency === 'USD') return `US$${price.toFixed(2)}`;
    return `$${price.toFixed(2)}`;
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <Pressable
      style={[styles.card, { backgroundColor: colorScheme === 'dark' ? '#1E2022' : '#fff' }]}
      onPress={() => router.push({ pathname: '/product/[id]', params: { id: item._id } })}
    >
      {item.image_url ? (
        <Image source={{ uri: item.image_url }} style={styles.productImage} contentFit="cover" />
      ) : (
        <View style={[styles.productImage, styles.placeholderImage]}>
          <ThemedText style={styles.placeholderText}>No Image</ThemedText>
        </View>
      )}
      <View style={styles.cardContent}>
        <ThemedText style={styles.productName} numberOfLines={2}>
          {item.name}
        </ThemedText>
        {item.brand && (
          <ThemedText style={styles.brand}>{item.brand}</ThemedText>
        )}
        <ThemedText style={styles.price}>
          {formatPrice(item.estimated_price)}
        </ThemedText>
        <ThemedText style={styles.storeCount}>
          {item.location_prices.length} store{item.location_prices.length !== 1 ? 's' : ''}
        </ThemedText>
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
              backgroundColor: colorScheme === 'dark' ? '#2A2D2F' : '#F0F0F0',
              color: Colors[colorScheme].text,
            },
          ]}
          placeholder="Search products..."
          placeholderTextColor={Colors[colorScheme].icon}
          value={query}
          onChangeText={handleSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading && products.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <ThemedText style={styles.errorText}>{error}</ThemedText>
          <Pressable onPress={() => fetchProducts(query)} style={styles.retryButton}>
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
              <ThemedText style={styles.emptyText}>
                {query ? 'No products found' : 'No products available'}
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
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    marginBottom: 12,
  },
  searchInput: {
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  list: {
    padding: 16,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  productImage: {
    width: 100,
    height: 100,
  },
  placeholderImage: {
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 12,
    color: '#999',
  },
  cardContent: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  brand: {
    fontSize: 13,
    color: '#888',
    marginBottom: 4,
  },
  price: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0a7ea4',
  },
  storeCount: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  },
});
