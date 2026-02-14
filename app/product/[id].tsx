import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { type Product, getProduct } from '@/services/api';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(id)
      .then(setProduct)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const formatPrice = (amount: number, currency = 'JMD') => {
    if (currency === 'USD') return `US$${amount.toFixed(2)}`;
    return `$${amount.toFixed(2)}`;
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
      </ThemedView>
    );
  }

  if (error || !product) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.errorText}>{error || 'Product not found'}</ThemedText>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backButtonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const sortedPrices = [...product.location_prices].sort((a, b) => a.amount - b.amount);
  const lowestPrice = sortedPrices.length > 0 ? sortedPrices[0].amount : null;

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Pressable onPress={() => router.back()} style={styles.backNav}>
          <ThemedText style={styles.backArrow}>{'<'} Back</ThemedText>
        </Pressable>

        {product.image_url ? (
          <Image source={{ uri: product.image_url }} style={styles.heroImage} contentFit="contain" />
        ) : (
          <View style={[styles.heroImage, styles.placeholderImage]}>
            <ThemedText style={{ color: '#999', fontSize: 16 }}>No Image</ThemedText>
          </View>
        )}

        <View style={styles.details}>
          <ThemedText type="title" style={styles.name}>{product.name}</ThemedText>

          {product.brand && (
            <ThemedText style={styles.brand}>{product.brand}</ThemedText>
          )}

          {product.size.value && (
            <ThemedText style={styles.size}>
              {product.size.value} {product.size.unit}
            </ThemedText>
          )}

          {product.category && (
            <View style={styles.categoryBadge}>
              <ThemedText style={styles.categoryText}>{product.category}</ThemedText>
            </View>
          )}

          {product.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {product.tags.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <ThemedText style={styles.tagText}>{tag}</ThemedText>
                </View>
              ))}
            </View>
          )}

          <View style={styles.estimatedPriceBox}>
            <ThemedText style={styles.estimatedLabel}>Estimated Price</ThemedText>
            <ThemedText style={styles.estimatedPrice}>
              {product.estimated_price != null
                ? formatPrice(product.estimated_price)
                : 'Unavailable'}
            </ThemedText>
          </View>

          <ThemedText type="subtitle" style={styles.pricesHeader}>
            Prices by Store ({sortedPrices.length})
          </ThemedText>

          {sortedPrices.map((lp, index) => (
            <View
              key={lp.location_id}
              style={[
                styles.priceCard,
                { backgroundColor: colorScheme === 'dark' ? '#1E2022' : '#fff' },
                index === 0 && styles.bestPriceCard,
              ]}
            >
              <View style={styles.priceCardContent}>
                <View>
                  <ThemedText style={styles.storeName}>
                    {lp.store_name || lp.location_id}
                  </ThemedText>
                  <ThemedText style={styles.currency}>{lp.currency}</ThemedText>
                </View>
                <View style={styles.priceRight}>
                  <ThemedText
                    style={[
                      styles.priceAmount,
                      lp.amount === lowestPrice && styles.bestPrice,
                    ]}
                  >
                    {formatPrice(lp.amount, lp.currency)}
                  </ThemedText>
                  {index === 0 && sortedPrices.length > 1 && (
                    <ThemedText style={styles.bestLabel}>Best Price</ThemedText>
                  )}
                </View>
              </View>
            </View>
          ))}

          {sortedPrices.length === 0 && (
            <ThemedText style={styles.noPrices}>No prices available yet</ThemedText>
          )}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scroll: {
    paddingBottom: 40,
  },
  backNav: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backArrow: {
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  heroImage: {
    width: '100%',
    height: 250,
    backgroundColor: '#F5F5F5',
  },
  placeholderImage: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    padding: 16,
  },
  name: {
    fontSize: 24,
    marginBottom: 4,
  },
  brand: {
    fontSize: 16,
    color: '#888',
    marginBottom: 4,
  },
  size: {
    fontSize: 14,
    color: '#888',
    marginBottom: 8,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 13,
    color: '#1565C0',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 12,
    color: '#555',
  },
  estimatedPriceBox: {
    backgroundColor: '#0a7ea4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  estimatedLabel: {
    color: '#D4EEF5',
    fontSize: 13,
    marginBottom: 4,
  },
  estimatedPrice: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  pricesHeader: {
    marginBottom: 12,
  },
  priceCard: {
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  bestPriceCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  priceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: 15,
    fontWeight: '600',
  },
  currency: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  bestPrice: {
    color: '#4CAF50',
  },
  bestLabel: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  noPrices: {
    color: '#888',
    textAlign: 'center',
    marginTop: 20,
  },
  errorText: {
    color: '#D32F2F',
    textAlign: 'center',
    marginBottom: 12,
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#0a7ea4',
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
