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
import { ButtonSize, CardShadow, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { type Product, getProduct } from '@/services/api';
import { addToList, isInList } from '@/services/shoppingList';
import { formatPrice } from '@/utils/format';

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inList, setInList] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(id)
      .then((p) => {
        setProduct(p);
        isInList(p._id).then(setInList);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleAddToList = async () => {
    if (!product) return;
    await addToList({
      productId: product._id,
      name: product.name,
      brand: product.brand,
      estimatedPrice: product.estimated_price,
      imageUrl: product.image_url,
    });
    setInList(true);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1500);
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (error || !product) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {error || 'Product not found'}
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.tint }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
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
        <Pressable
          onPress={() => router.back()}
          style={styles.backNav}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={8}
        >
          <ThemedText style={[styles.backArrow, { color: colors.tint }]}>
            {'<'} Back
          </ThemedText>
        </Pressable>

        {product.image_url && !product.image_url.startsWith('data:image/svg') ? (
          <Image
            source={{ uri: product.image_url }}
            style={[styles.heroImage, { backgroundColor: colors.backgroundSecondary }]}
            contentFit="contain"
          />
        ) : (
          <View style={[styles.heroImage, { backgroundColor: colors.placeholder }]}>
            <ThemedText style={{ color: colors.placeholderText, fontSize: FontSize.md }}>
              No Image
            </ThemedText>
          </View>
        )}

        <View style={styles.details}>
          <ThemedText type="title" style={styles.name}>{product.name}</ThemedText>

          {product.brand && (
            <ThemedText style={[styles.brand, { color: colors.textSecondary }]}>
              {product.brand}
            </ThemedText>
          )}

          {product.size.value && (
            <ThemedText style={[styles.size, { color: colors.textSecondary }]}>
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
                <View key={tag} style={[styles.tag, { backgroundColor: colors.backgroundSecondary }]}>
                  <ThemedText style={[styles.tagText, { color: colors.textSecondary }]}>
                    {tag}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.estimatedPriceBox, { backgroundColor: colors.tint }]}>
            <ThemedText style={styles.estimatedLabel}>Estimated Price</ThemedText>
            <ThemedText style={styles.estimatedPrice}>
              {formatPrice(product.estimated_price)}
            </ThemedText>
          </View>

          <Pressable
            style={[
              styles.addToListButton,
              { backgroundColor: colors.tint },
              addedFeedback && { backgroundColor: colors.success },
            ]}
            onPress={handleAddToList}
            accessibilityRole="button"
            accessibilityLabel={
              addedFeedback
                ? 'Added to shopping list'
                : inList
                  ? 'Add another to shopping list'
                  : 'Add to shopping list'
            }
          >
            <ThemedText style={styles.addToListText}>
              {addedFeedback ? 'Added!' : inList ? '+ Add Another' : '+ Add to Shopping List'}
            </ThemedText>
          </Pressable>

          <ThemedText type="subtitle" style={styles.pricesHeader}>
            Prices by Store ({sortedPrices.length})
          </ThemedText>

          {sortedPrices.map((lp, index) => (
            <View
              key={lp.location_id}
              style={[
                styles.priceCard,
                { backgroundColor: colors.card },
                index === 0 && sortedPrices.length > 1 && {
                  borderWidth: 2,
                  borderColor: colors.success,
                },
              ]}
            >
              <View style={styles.priceCardContent}>
                <View>
                  <ThemedText style={styles.storeName}>
                    {lp.store_name || lp.location_id}
                  </ThemedText>
                  <ThemedText style={[styles.currency, { color: colors.textSecondary }]}>
                    {lp.currency}
                  </ThemedText>
                </View>
                <View style={styles.priceRight}>
                  <ThemedText
                    style={[
                      styles.priceAmount,
                      lp.amount === lowestPrice && { color: colors.success },
                    ]}
                  >
                    {formatPrice(lp.amount, lp.currency)}
                  </ThemedText>
                  {index === 0 && sortedPrices.length > 1 && (
                    <ThemedText style={[styles.bestLabel, { color: colors.success }]}>
                      Best Price
                    </ThemedText>
                  )}
                </View>
              </View>
            </View>
          ))}

          {sortedPrices.length === 0 && (
            <ThemedText style={[styles.noPrices, { color: colors.textSecondary }]}>
              No prices available yet
            </ThemedText>
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
    padding: Spacing.xl,
  },
  scroll: {
    paddingBottom: 40,
  },
  backNav: {
    paddingTop: Spacing.headerTop,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  backArrow: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  heroImage: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  details: {
    padding: Spacing.lg,
  },
  name: {
    fontSize: FontSize.xxl,
    marginBottom: Spacing.xs,
  },
  brand: {
    fontSize: FontSize.md,
    marginBottom: Spacing.xs,
  },
  size: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 10,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSize.sm,
    color: '#1565C0',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  tag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  tagText: {
    fontSize: FontSize.xs,
  },
  estimatedPriceBox: {
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  estimatedLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.sm,
    marginBottom: 6,
  },
  estimatedPrice: {
    color: '#fff',
    fontSize: FontSize.hero,
    fontWeight: '700',
    lineHeight: 34,
  },
  addToListButton: {
    borderRadius: Radius.sm,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  addToListText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  pricesHeader: {
    marginBottom: Spacing.md,
  },
  priceCard: {
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: Spacing.sm,
    ...CardShadow,
  },
  priceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  currency: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  priceRight: {
    alignItems: 'flex-end',
  },
  priceAmount: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  bestLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    marginTop: 2,
  },
  noPrices: {
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
