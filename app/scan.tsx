import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { formatProductSize, formatPackInfo, formatPrice } from '@/utils/format';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  type OpenFoodFactsProduct,
  type Product,
  linkBarcode,
  lookupBarcode,
  lookupOpenFoodFacts,
  searchProducts,
  unlinkBarcode,
  updateProduct,
} from '@/services/api';

type ScanState =
  | { phase: 'looking_up' }
  | { phase: 'found_in_db'; product: Product }
  | { phase: 'found_in_off'; offProduct: OpenFoodFactsProduct }
  | { phase: 'not_found' }
  | { phase: 'linking'; selectedProduct: Product; offProduct?: OpenFoodFactsProduct }
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

  // Auto-search when OFF product is found, using OFF product name
  useEffect(() => {
    if (state.phase === 'found_in_off') {
      const offName = state.offProduct.product_name || '';
      if (offName.trim()) {
        setSearchQuery(offName);
        // Trigger search immediately (bypass debounce for auto-search)
        (async () => {
          setSearching(true);
          try {
            const results = await searchProducts(offName, { limit: 20 });
            setSearchResults(results);
          } catch {
            setSearchResults([]);
          } finally {
            setSearching(false);
          }
        })();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

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

  const handleLinkProduct = (product: Product) => {
    confirmLink(product);
  };

  const performLinkWithImageUpdate = async (
    product: Product,
    offProduct?: OpenFoodFactsProduct,
  ) => {
    if (!barcode) return;
    setState({ phase: 'linking', selectedProduct: product, offProduct });
    try {
      await linkBarcode(barcode, product._id);

      // If product has no image but OFF has one, update the product image
      if (offProduct?.image_url) {
        const productHasNoImage =
          !product.image_url || product.image_url.startsWith('data:image/svg');
        if (productHasNoImage) {
          try {
            await updateProduct(product._id, { image_url: offProduct.image_url });
          } catch {
            // Non-critical: barcode was linked, image update is best-effort
          }
        }
      }

      setState({ phase: 'linked', product });
    } catch {
      setState({ phase: 'error', message: 'Failed to link barcode. Please try again.' });
    }
  };

  const confirmLink = (product: Product, offProduct?: OpenFoodFactsProduct) => {
    const sizeLabel = formatProductSize(product.size);
    const packLabel = formatPackInfo(product.size);
    const priceLabel = product.estimated_price ? formatPrice(product.estimated_price) : null;
    const desc = [sizeLabel, packLabel, priceLabel].filter(Boolean).join(' \u2022 ');
    Alert.alert(
      'Link Barcode?',
      `Link barcode ${barcode} to:\n\n${product.name}${desc ? `\n${desc}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Link', onPress: () => performLinkWithImageUpdate(product, offProduct) },
      ],
    );
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
        prefill_barcode: barcode || '',
      },
    });
  };

  const navigateToAdd = () => {
    router.replace({
      pathname: '/(tabs)/add',
      params: { prefill_barcode: barcode || '' },
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

  // Found in Open Food Facts — search for existing product to link, or add as new
  if (state.phase === 'found_in_off') {
    const { offProduct } = state;
    return (
      <ThemedView style={styles.container}>
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item._id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.offListContent}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListHeaderComponent={
            <>
              {/* Header with back button */}
              <View style={styles.notFoundHeader}>
                <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
                  <IconSymbol name="chevron.left" size={20} color={colors.text} />
                </Pressable>
                <View style={{ flex: 1 }}>
                  <ThemedText style={[styles.title, { textAlign: 'left' }]}>Product Found Online</ThemedText>
                  <ThemedText style={[styles.barcodeLabel, { color: colors.textSecondary }]}>
                    {barcode}
                  </ThemedText>
                </View>
              </View>

              {/* OFF product card */}
              <View style={[styles.offCardRow, { marginHorizontal: Spacing.lg, marginTop: Spacing.md }]}>
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
              </View>

              {/* Instructions */}
              <ThemedText style={[styles.linkInstructions, { color: colors.textSecondary }]}>
                Search for a matching product to link this barcode, or add it as a new product.
              </ThemedText>

              {/* Search input */}
              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                placeholder="Search products to link..."
                placeholderTextColor={colors.icon}
                value={searchQuery}
                onChangeText={handleSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {searching && (
                <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: Spacing.md }} />
              )}

              {searchResults.length > 0 && (
                <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                  Possible matches ({searchResults.length})
                </ThemedText>
              )}

              {searchQuery.trim() && !searching && searchResults.length === 0 && (
                <View style={styles.emptyStateContainer}>
                  <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                    No matching products found. Try a different search or add as new.
                  </ThemedText>
                  <Pressable
                    style={[styles.primaryButton, { backgroundColor: colors.tint, marginTop: Spacing.md }]}
                    onPress={() => navigateToAddWithPrefill(offProduct)}
                  >
                    <ThemedText style={styles.primaryButtonText}>Add as New Product</ThemedText>
                  </Pressable>
                </View>
              )}
            </>
          }
          renderItem={({ item }) => {
            const sizeLabel = formatProductSize(item.size);
            const packLabel = formatPackInfo(item.size);
            const priceLabel = item.estimated_price ? formatPrice(item.estimated_price) : null;
            return (
              <Pressable
                style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: Spacing.lg }]}
                onPress={() => confirmLink(item, offProduct)}
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
                  <ThemedText style={[styles.searchCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                    {[sizeLabel, packLabel, priceLabel].filter(Boolean).join(' \u2022 ')}
                  </ThemedText>
                </View>
                <ThemedText style={[styles.linkLabel, { color: colors.tint }]}>Link</ThemedText>
              </Pressable>
            );
          }}
          ListFooterComponent={
            <View style={styles.offFooter}>
              <View style={styles.dividerRow}>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                <ThemedText style={[styles.dividerText, { color: colors.textSecondary }]}>or</ThemedText>
                <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              </View>
              <Pressable
                style={[styles.secondaryActionButton, { borderColor: colors.tint }]}
                onPress={() => navigateToAddWithPrefill(offProduct)}
              >
                <ThemedText style={[styles.secondaryActionText, { color: colors.tint }]}>
                  Add as New Product
                </ThemedText>
              </Pressable>
            </View>
          }
        />
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
    const handleUnlink = () => {
      if (!barcode) return;
      Alert.alert(
        'Undo Link?',
        `Remove the link between barcode ${barcode} and ${state.product.name}?`,
        [
          { text: 'Keep', style: 'cancel' },
          {
            text: 'Undo',
            style: 'destructive',
            onPress: async () => {
              try {
                await unlinkBarcode(barcode);
                performLookup();
              } catch {
                Alert.alert('Error', 'Failed to unlink barcode. Please try again.');
              }
            },
          },
        ],
      );
    };
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
          <Pressable style={styles.secondaryButton} onPress={handleUnlink}>
            <ThemedText style={[styles.secondaryButtonText, { color: colors.error }]}>Undo</ThemedText>
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
      <FlatList
        data={searchResults}
        keyExtractor={(item) => item._id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.offListContent}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListHeaderComponent={
          <>
            <View style={styles.notFoundHeader}>
              <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backButton}>
                <IconSymbol name="chevron.left" size={20} color={colors.text} />
              </Pressable>
              <View style={{ flex: 1 }}>
                <ThemedText style={[styles.title, { textAlign: 'left' }]}>Barcode Not Recognized</ThemedText>
                <ThemedText style={[styles.barcodeLabel, { color: colors.textSecondary }]}>
                  {barcode}
                </ThemedText>
              </View>
            </View>

            <ThemedText style={[styles.linkInstructions, { color: colors.textSecondary }]}>
              Search for the product below and link it to this barcode, or add it as a new product.
            </ThemedText>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
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

            {searchResults.length > 0 && (
              <ThemedText style={[styles.sectionLabel, { color: colors.textSecondary }]}>
                Possible matches ({searchResults.length})
              </ThemedText>
            )}

            {searchQuery.trim() && !searching && searchResults.length === 0 && (
              <View style={styles.emptyStateContainer}>
                <ThemedText style={[styles.emptyText, { color: colors.textSecondary }]}>
                  No matching products found. Try a different search or add as new.
                </ThemedText>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: colors.tint, marginTop: Spacing.md }]}
                  onPress={navigateToAdd}
                >
                  <ThemedText style={styles.primaryButtonText}>Add as New Product</ThemedText>
                </Pressable>
              </View>
            )}
          </>
        }
        renderItem={({ item }) => {
          const sizeLabel = formatProductSize(item.size);
          const packLabel = formatPackInfo(item.size);
          const priceLabel = item.estimated_price ? formatPrice(item.estimated_price) : null;
          return (
            <Pressable
              style={[styles.searchCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: Spacing.lg }]}
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
                <ThemedText style={[styles.searchCardMeta, { color: colors.textSecondary }]} numberOfLines={1}>
                  {[sizeLabel, packLabel, priceLabel].filter(Boolean).join(' \u2022 ')}
                </ThemedText>
              </View>
              <ThemedText style={[styles.linkLabel, { color: colors.tint }]}>Link</ThemedText>
            </Pressable>
          );
        }}
        ListFooterComponent={
          <View style={styles.offFooter}>
            <View style={styles.dividerRow}>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
              <ThemedText style={[styles.dividerText, { color: colors.textSecondary }]}>or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            </View>
            <Pressable
              style={[styles.secondaryActionButton, { borderColor: colors.tint }]}
              onPress={navigateToAdd}
            >
              <ThemedText style={[styles.secondaryActionText, { color: colors.tint }]}>
                Add as New Product
              </ThemedText>
            </Pressable>
          </View>
        }
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
  emptyStateContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
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
  searchCardMeta: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  linkLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  offCardRow: {
    alignItems: 'center',
  },
  offListContent: {
    paddingBottom: Spacing.xxl,
  },
  sectionLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  offFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    marginHorizontal: Spacing.md,
    fontSize: FontSize.sm,
  },
  secondaryActionButton: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  secondaryActionText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
