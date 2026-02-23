import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  type OpenFoodFactsProduct,
  type Product,
  linkBarcode,
  lookupBarcode,
  lookupOpenFoodFacts,
  searchProducts,
} from '@/services/api';

type ScanState =
  | { phase: 'looking_up' }
  | { phase: 'found_in_db'; product: Product }
  | { phase: 'found_in_off'; offProduct: OpenFoodFactsProduct }
  | { phase: 'not_found' }
  | { phase: 'linking'; selectedProduct: Product }
  | { phase: 'linked'; product: Product }
  | { phase: 'error'; message: string };

export default function ScanResultScreen() {
  const { barcode } = useLocalSearchParams<{ barcode: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const lookedUp = useRef(false);

  const [state, setState] = useState<ScanState>({ phase: 'looking_up' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const performLookup = useCallback(async () => {
    if (!barcode) {
      setState({ phase: 'error', message: 'No barcode provided' });
      return;
    }
    setState({ phase: 'looking_up' });

    try {
      // Step 1: Check our DB
      const result = await lookupBarcode(barcode);
      if (result.found && result.product) {
        setState({ phase: 'found_in_db', product: result.product });
        return;
      }
    } catch {
      // Continue to OFF lookup
    }

    try {
      // Step 2: Check Open Food Facts
      const offProduct = await lookupOpenFoodFacts(barcode);
      if (offProduct?.product_name) {
        setState({ phase: 'found_in_off', offProduct });
        return;
      }
    } catch {
      // Continue to not found
    }

    setState({ phase: 'not_found' });
  }, [barcode]);

  useEffect(() => {
    if (!lookedUp.current) {
      lookedUp.current = true;
      performLookup();
    }
  }, [performLookup]);

  const handleSearch = (text: string) => {
    setSearchQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchProducts(text, { limit: 20 });
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
  };

  const handleLinkProduct = async (product: Product) => {
    if (!barcode) return;
    setState({ phase: 'linking', selectedProduct: product });
    try {
      await linkBarcode(barcode, product._id);
      setState({ phase: 'linked', product });
    } catch {
      setState({ phase: 'error', message: 'Failed to link barcode. Please try again.' });
    }
  };

  const navigateToProduct = (productId: string) => {
    router.replace({ pathname: '/product/[id]', params: { id: productId } });
  };

  const navigateToAddWithPrefill = (offProduct: OpenFoodFactsProduct) => {
    router.replace({
      pathname: '/(tabs)/add',
      params: {
        prefill_name: offProduct.product_name || '',
        prefill_brand: offProduct.brands || '',
        prefill_category: offProduct.categories?.split(',')[0]?.trim() || '',
        prefill_image_url: offProduct.image_url || '',
        prefill_barcode: barcode || '',
      },
    });
  };

  // Found in our DB — navigate immediately
  if (state.phase === 'found_in_db') {
    // Brief display before navigation
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <IconSymbol name="barcode.viewfinder" size={48} color={colors.success} />
          <ThemedText style={[styles.title, { marginTop: Spacing.md }]}>Product Found!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {state.product.name}
          </ThemedText>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => navigateToProduct(state.product._id)}
          >
            <ThemedText style={styles.primaryButtonText}>View Product</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <ThemedText style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Found in Open Food Facts — offer to add
  if (state.phase === 'found_in_off') {
    const { offProduct } = state;
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={styles.title}>Product Found Online</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary, marginBottom: Spacing.lg }]}>
            This product was found in the Open Food Facts database but isn&apos;t in Brite Shopping yet.
          </ThemedText>

          <View style={[styles.offCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {offProduct.image_url ? (
              <Image source={{ uri: offProduct.image_url }} style={styles.offImage} contentFit="contain" />
            ) : (
              <View style={[styles.offImagePlaceholder, { backgroundColor: colors.placeholder }]}>
                <IconSymbol name="photo" size={32} color={colors.placeholderText} />
              </View>
            )}
            <ThemedText style={styles.offName} numberOfLines={2}>
              {offProduct.product_name || 'Unknown Product'}
            </ThemedText>
            {offProduct.brands && (
              <ThemedText style={[styles.offBrand, { color: colors.textSecondary }]}>
                {offProduct.brands}
              </ThemedText>
            )}
            {offProduct.categories && (
              <ThemedText style={[styles.offCategory, { color: colors.textTertiary }]} numberOfLines={1}>
                {offProduct.categories.split(',')[0]?.trim()}
              </ThemedText>
            )}
          </View>

          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => navigateToAddWithPrefill(offProduct)}
          >
            <ThemedText style={styles.primaryButtonText}>Add to Brite Shopping</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <ThemedText style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Linking in progress
  if (state.phase === 'linking') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Linking barcode to {state.selectedProduct.name}...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Successfully linked
  if (state.phase === 'linked') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <IconSymbol name="barcode.viewfinder" size={48} color={colors.success} />
          <ThemedText style={[styles.title, { marginTop: Spacing.md }]}>Barcode Linked!</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            Future scans of this barcode will find {state.product.name}.
          </ThemedText>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={() => navigateToProduct(state.product._id)}
          >
            <ThemedText style={styles.primaryButtonText}>View Product</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <ThemedText style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Loading
  if (state.phase === 'looking_up') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.tint} />
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary, marginTop: Spacing.md }]}>
            Looking up barcode...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  // Error
  if (state.phase === 'error') {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centered}>
          <ThemedText style={[styles.title, { color: colors.error }]}>Something went wrong</ThemedText>
          <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
            {state.message}
          </ThemedText>
          <Pressable
            style={[styles.primaryButton, { backgroundColor: colors.tint }]}
            onPress={performLookup}
          >
            <ThemedText style={styles.primaryButtonText}>Retry</ThemedText>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
            <ThemedText style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>Go Back</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  // Not found — search + link flow
  return (
    <ThemedView style={styles.container}>
      <View style={styles.notFoundHeader}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
          <IconSymbol name="chevron.left.forwardslash.chevron.right" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <ThemedText style={styles.title}>Barcode Not Recognized</ThemedText>
          <ThemedText style={[styles.barcodeLabel, { color: colors.textSecondary }]}>
            {barcode}
          </ThemedText>
        </View>
      </View>

      <ThemedText style={[styles.linkInstructions, { color: colors.textSecondary }]}>
        Search for the product below and link it to this barcode. Future scans from any device will find it instantly.
      </ThemedText>

      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: colors.backgroundSecondary, color: colors.text },
        ]}
        placeholder="Search for a product to link..."
        placeholderTextColor={colors.icon}
        value={searchQuery}
        onChangeText={handleSearch}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus
      />

      {searching && (
        <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: Spacing.md }} />
      )}

      <FlatList
        data={searchResults}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.searchList}
        ListEmptyComponent={
          searchQuery.trim() && !searching ? (
            <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
              No products found. Try a different search term.
            </ThemedText>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => handleLinkProduct(item)}
          >
            {item.image_url && !item.image_url.startsWith('data:image/svg') ? (
              <Image source={{ uri: item.image_url }} style={styles.searchThumb} contentFit="cover" />
            ) : (
              <View style={[styles.searchThumbPlaceholder, { backgroundColor: colors.placeholder }]}>
                <IconSymbol name="photo" size={18} color={colors.placeholderText} />
              </View>
            )}
            <View style={styles.searchCardContent}>
              <ThemedText style={styles.searchCardName} numberOfLines={1}>{item.name}</ThemedText>
              <ThemedText style={[styles.searchCardStore, { color: colors.textSecondary }]} numberOfLines={1}>
                {item.store_name}
              </ThemedText>
            </View>
            <ThemedText style={[styles.linkLabel, { color: colors.tint }]}>Link</ThemedText>
          </Pressable>
        )}
      />
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
    paddingHorizontal: Spacing.xl,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xs,
    lineHeight: 22,
  },
  primaryButton: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xxl,
    marginTop: Spacing.xl,
    minWidth: 200,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  secondaryButton: {
    padding: Spacing.md,
    marginTop: Spacing.sm,
  },
  secondaryButtonText: {
    fontSize: FontSize.md,
  },
  offCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  offImage: {
    width: 120,
    height: 120,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  offImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  offName: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    textAlign: 'center',
  },
  offBrand: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  offCategory: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  notFoundHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Spacing.headerTop,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  backButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barcodeLabel: {
    fontSize: FontSize.sm,
    fontFamily: 'SpaceMono',
    marginTop: 2,
  },
  linkInstructions: {
    fontSize: FontSize.sm,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  searchInput: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: FontSize.md,
    marginHorizontal: Spacing.lg,
  },
  searchList: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    padding: Spacing.xl,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  searchThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
  },
  searchThumbPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchCardContent: {
    flex: 1,
  },
  searchCardName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  searchCardStore: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  linkLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
});
