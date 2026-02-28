import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import BarcodeScanner from '@/components/BarcodeScanner';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import {
  addProduct,
  type GoogleStore,
  type Store,
  getStores,
  linkBarcode,
  lookupBarcode,
  lookupOpenFoodFacts,
  searchGoogleStores,
} from '@/services/api';

export default function AddProductScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const params = useLocalSearchParams<{
    prefill_name?: string;
    prefill_brand?: string;
    prefill_category?: string;
    prefill_image_url?: string;
    prefill_barcode?: string;
  }>();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scannedBarcode, setScannedBarcode] = useState('');

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('JMD');

  // Known stores (loaded from our catalog)
  const [knownStores, setKnownStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);

  // Unified selected store — either from known list or Google Places
  type SelectedStore = { store_id: string; store_name: string; product_count?: number; place_id?: string; latitude?: number; longitude?: number; address?: string };
  const [selectedStore, setSelectedStore] = useState<SelectedStore | null>(null);

  // Google Places fallback search
  const [showGoogleSearch, setShowGoogleSearch] = useState(false);
  const [storeSearchQuery, setStoreSearchQuery] = useState('');
  const [storeSearchResults, setStoreSearchResults] = useState<GoogleStore[]>([]);
  const [searchingStores, setSearchingStores] = useState(false);
  const storeDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [sizeHint, setSizeHint] = useState('');
  const [packQty, setPackQty] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [url, setUrl] = useState('');

  // Load known stores from catalog
  useEffect(() => {
    getStores()
      .then(setKnownStores)
      .catch(() => setKnownStores([]))
      .finally(() => setLoadingStores(false));
  }, []);

  // Apply prefill params from barcode scan result
  useEffect(() => {
    if (params.prefill_name) setName(params.prefill_name);
    if (params.prefill_brand) setBrand(params.prefill_brand);
    if (params.prefill_category) setCategory(params.prefill_category);
    if (params.prefill_image_url) setImageUrl(params.prefill_image_url);
    if (params.prefill_barcode) setScannedBarcode(params.prefill_barcode);
  }, [params.prefill_name, params.prefill_brand, params.prefill_category, params.prefill_image_url, params.prefill_barcode]);

  const handleBarcodeScan = async (barcodeValue: string) => {
    setScannerVisible(false);
    setScannedBarcode(barcodeValue);

    // Run waterfall lookup
    try {
      const result = await lookupBarcode(barcodeValue);
      if (result.found && result.product) {
        router.push({ pathname: '/product/[id]', params: { id: result.product._id } });
        return;
      }
    } catch { /* continue */ }

    try {
      const offProduct = await lookupOpenFoodFacts(barcodeValue);
      if (offProduct?.product_name) {
        setName(offProduct.product_name);
        if (offProduct.brands) setBrand(offProduct.brands);
        if (offProduct.categories) setCategory(offProduct.categories.split(',')[0]?.trim() || '');
        if (offProduct.image_url) setImageUrl(offProduct.image_url);
        return;
      }
    } catch { /* continue */ }

    // Not found anywhere — barcode stored for later linking
  };

  const showCaptureShell = (mode: 'barcode' | 'photo' | 'receipt') => {
    if (mode === 'barcode') {
      setScannerVisible(true);
      return;
    }
    if (mode === 'photo') {
      Alert.alert(
        'Product Photo (Coming Soon)',
        'Product photo parsing will suggest name/brand/category from image AI. For now, use the manual form fields.',
      );
      return;
    }
    Alert.alert(
      'Receipt Scan (Coming Soon)',
      'Receipt capture will extract multiple items and prices in one step. For now, add one item manually below.',
    );
  };

  const selectKnownStore = (store: Store) => {
    setSelectedStore({ store_id: store.store_id, store_name: store.store_name, product_count: store.product_count });
    setShowGoogleSearch(false);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
  };

  const handleStoreSearch = (text: string) => {
    setStoreSearchQuery(text);
    if (storeDebounceRef.current) clearTimeout(storeDebounceRef.current);
    if (!text.trim()) {
      setStoreSearchResults([]);
      return;
    }
    storeDebounceRef.current = setTimeout(async () => {
      setSearchingStores(true);
      try {
        const results = await searchGoogleStores(text);
        setStoreSearchResults(results);
      } catch {
        setStoreSearchResults([]);
      } finally {
        setSearchingStores(false);
      }
    }, 400);
  };

  const selectGoogleStore = (store: GoogleStore) => {
    setSelectedStore({ store_id: store.place_id, store_name: store.name, place_id: store.place_id, latitude: store.latitude, longitude: store.longitude, address: store.address });
    setShowGoogleSearch(false);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
  };

  const clearSelectedStore = () => {
    setSelectedStore(null);
    setShowGoogleSearch(false);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
  };

  const validate = (): string | null => {
    if (name.trim().length < 2) {
      return 'Product name must be at least 2 characters.';
    }

    if (price.trim()) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
        return 'Price must be a valid number greater than 0.';
      }
      const trimmedCurrency = currency.trim().toUpperCase();
      if (trimmedCurrency.length !== 3) {
        return 'Currency must be a 3-letter code (e.g. JMD).';
      }
    }

    return null;
  };

  const clearForm = () => {
    setName('');
    setPrice('');
    setBrand('');
    setCategory('');
    setSizeHint('');
    setPackQty('');
    setImageUrl('');
    setUrl('');
    setScannedBarcode('');
    setSelectedStore(null);
    setShowGoogleSearch(false);
    setStoreSearchQuery('');
    setStoreSearchResults([]);
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Combine pack qty and size into a single size_hint for the API
    // e.g. packQty="6", sizeHint="330ml" → "6x330ml"
    const trimmedSize = sizeHint.trim();
    const trimmedPack = packQty.trim();
    let combinedSizeHint: string | undefined;
    if (trimmedPack && trimmedSize) {
      combinedSizeHint = `${trimmedPack}x${trimmedSize}`;
    } else if (trimmedPack) {
      combinedSizeHint = `${trimmedPack} pack`;
    } else if (trimmedSize) {
      combinedSizeHint = trimmedSize;
    }

    const payload: Parameters<typeof addProduct>[0] = {
      name: name.trim(),
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      size_hint: combinedSizeHint || undefined,
      image_url: imageUrl.trim() || undefined,
      url: url.trim() || undefined,
    };

    if (selectedStore) {
      payload.store_id = selectedStore.store_id;
      payload.store_name = selectedStore.store_name;
      if (selectedStore.place_id) {
        payload.place_id = selectedStore.place_id;
        payload.latitude = selectedStore.latitude;
        payload.longitude = selectedStore.longitude;
        payload.address = selectedStore.address;
      }
    }

    if (price.trim()) {
      payload.price = Number(price);
      payload.currency = currency.trim().toUpperCase();
    }

    setSubmitting(true);
    try {
      const response = await addProduct(payload);
      // Link barcode to the newly created product if we have one
      if (scannedBarcode && response.product_id) {
        try {
          await linkBarcode(scannedBarcode, response.product_id);
        } catch {
          // Non-critical — product was saved, barcode linking is best-effort
        }
      }
      setSuccess(response.message || 'Product saved successfully.');
      clearForm();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + Spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.headerBlock}>
            <ThemedText type="title">Add Product</ThemedText>
            <ThemedText style={[styles.subtitle, { color: colors.textSecondary }]}>
              Submit a product and price from any store to improve catalog coverage.
            </ThemedText>
          </View>

          {error && (
            <View style={[styles.feedbackBox, { backgroundColor: '#FDECEC', borderColor: '#F8BDBD' }]}>
              <ThemedText style={[styles.feedbackText, { color: colors.error }]}>{error}</ThemedText>
            </View>
          )}

          {success && (
            <View style={[styles.feedbackBox, { backgroundColor: '#EAF7ED', borderColor: '#BDE3C5' }]}>
              <ThemedText style={[styles.feedbackText, { color: colors.success }]}>{success}</ThemedText>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText style={styles.label}>Quick Capture (Shells)</ThemedText>
            <ThemedText style={[styles.helperText, { color: colors.textSecondary }]}>
              Camera-based capture flows are scaffolded next.
            </ThemedText>
            <View style={styles.captureRow}>
              <Pressable
                style={[styles.captureButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => showCaptureShell('barcode')}
                accessibilityRole="button"
                accessibilityLabel="Scan barcode"
              >
                <IconSymbol name="barcode.viewfinder" size={24} color={colors.tint} />
                <ThemedText style={[styles.captureLabel, { color: colors.text }]}>Scan Barcode</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.captureButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => showCaptureShell('photo')}
                accessibilityRole="button"
                accessibilityLabel="Take product photo"
              >
                <ThemedText style={styles.captureIcon}>@</ThemedText>
                <ThemedText style={[styles.captureLabel, { color: colors.text }]}>Product Photo</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.captureButton, { backgroundColor: colors.backgroundSecondary }]}
                onPress={() => showCaptureShell('receipt')}
                accessibilityRole="button"
                accessibilityLabel="Scan receipt photo"
              >
                <ThemedText style={styles.captureIcon}>%</ThemedText>
                <ThemedText style={[styles.captureLabel, { color: colors.text }]}>Scan Receipt</ThemedText>
              </Pressable>
            </View>
          </View>

          {scannedBarcode ? (
            <View style={[styles.barcodeDisplay, { backgroundColor: colors.tint + '12', borderColor: colors.tint + '30' }]}>
              <IconSymbol name="barcode.viewfinder" size={16} color={colors.tint} />
              <ThemedText style={[styles.barcodeText, { color: colors.tint }]}>
                {scannedBarcode}
              </ThemedText>
              <Pressable onPress={() => setScannedBarcode('')} hitSlop={8}>
                <IconSymbol name="xmark" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.section}>
            <ThemedText style={styles.label}>Store (optional)</ThemedText>

            {selectedStore ? (
              /* Selected store card */
              <View style={[styles.selectedStoreCard, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}>
                <View style={styles.selectedStoreInfo}>
                  <ThemedText style={styles.selectedStoreName}>{selectedStore.store_name}</ThemedText>
                  {selectedStore.address ? (
                    <ThemedText style={[styles.selectedStoreAddress, { color: colors.textSecondary }]} numberOfLines={2}>
                      {selectedStore.address}
                    </ThemedText>
                  ) : selectedStore.product_count !== undefined ? (
                    <ThemedText style={[styles.selectedStoreAddress, { color: colors.textSecondary }]}>
                      {selectedStore.product_count.toLocaleString()} products in catalog
                    </ThemedText>
                  ) : null}
                </View>
                <Pressable onPress={clearSelectedStore} hitSlop={8}>
                  <IconSymbol name="xmark" size={16} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : (
              <>
                {/* Known stores list */}
                {loadingStores ? (
                  <ActivityIndicator size="small" color={colors.tint} style={{ marginVertical: Spacing.sm }} />
                ) : knownStores.length > 0 && !showGoogleSearch ? (
                  <View style={[styles.storeResultsList, { borderColor: colors.border }]}>
                    {knownStores.map((store) => (
                      <Pressable
                        key={store.store_id}
                        style={[styles.storeResultItem, { borderColor: colors.border }]}
                        onPress={() => selectKnownStore(store)}
                      >
                        <ThemedText style={styles.storeResultName}>{store.store_name}</ThemedText>
                        <ThemedText style={[styles.storeResultAddress, { color: colors.textSecondary }]}>
                          {store.product_count.toLocaleString()} products
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {/* Google Places search toggle / search input */}
                {!showGoogleSearch ? (
                  <Pressable
                    onPress={() => setShowGoogleSearch(true)}
                    style={{ marginTop: knownStores.length > 0 ? Spacing.sm : 0 }}
                    hitSlop={8}
                  >
                    <ThemedText style={[styles.helperText, { color: colors.tint }]}>
                      {knownStores.length > 0 ? '+ Search for a different store on Google' : 'Search for a store on Google...'}
                    </ThemedText>
                  </Pressable>
                ) : (
                  <>
                    <TextInput
                      value={storeSearchQuery}
                      onChangeText={handleStoreSearch}
                      placeholder="Search Google Maps for a store..."
                      placeholderTextColor={colors.icon}
                      style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text, marginTop: Spacing.xs }]}
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoFocus
                      accessibilityLabel="Search for a store on Google"
                    />
                    {searchingStores && (
                      <ActivityIndicator size="small" color={colors.tint} style={{ marginTop: Spacing.sm }} />
                    )}
                    {storeSearchResults.length > 0 && (
                      <View style={[styles.storeResultsList, { borderColor: colors.border, marginTop: Spacing.sm }]}>
                        {storeSearchResults.map((store) => (
                          <Pressable
                            key={store.place_id}
                            style={[styles.storeResultItem, { borderColor: colors.border }]}
                            onPress={() => selectGoogleStore(store)}
                          >
                            <ThemedText style={styles.storeResultName}>{store.name}</ThemedText>
                            <ThemedText style={[styles.storeResultAddress, { color: colors.textSecondary }]} numberOfLines={1}>
                              {store.address}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </View>
                    )}
                    {storeSearchQuery.trim() && !searchingStores && storeSearchResults.length === 0 && (
                      <ThemedText style={[styles.helperText, { color: colors.textSecondary, marginTop: Spacing.xs }]}>
                        No stores found.
                      </ThemedText>
                    )}
                    <Pressable onPress={() => { setShowGoogleSearch(false); setStoreSearchQuery(''); setStoreSearchResults([]); }} hitSlop={8} style={{ marginTop: Spacing.xs }}>
                      <ThemedText style={[styles.helperText, { color: colors.textSecondary }]}>← Back to store list</ThemedText>
                    </Pressable>
                  </>
                )}
              </>
            )}
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Product Name *</ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grace Coconut Milk 400ml"
              placeholderTextColor={colors.icon}
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              autoCapitalize="words"
              autoCorrect={false}
              accessibilityLabel="Product name"
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>Price{selectedStore ? ' *' : ''}</ThemedText>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                keyboardType="decimal-pad"
                accessibilityLabel="Product price"
              />
            </View>
            <View style={styles.currencyBox}>
              <ThemedText style={styles.label}>Currency{selectedStore ? ' *' : ''}</ThemedText>
              <TextInput
                value={currency}
                onChangeText={(value) => setCurrency(value.toUpperCase())}
                placeholder="JMD"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                maxLength={3}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Currency code"
              />
            </View>
          </View>


          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>Brand</ThemedText>
              <TextInput
                value={brand}
                onChangeText={setBrand}
                placeholder="Optional"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Brand"
              />
            </View>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>Category</ThemedText>
              <TextInput
                value={category}
                onChangeText={setCategory}
                placeholder="Optional"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Category"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>Size</ThemedText>
              <TextInput
                value={sizeHint}
                onChangeText={setSizeHint}
                placeholder="e.g. 400ml, 2kg"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Product size"
              />
            </View>
            <View style={styles.packQtyBox}>
              <ThemedText style={styles.label}>Pack Qty</ThemedText>
              <TextInput
                value={packQty}
                onChangeText={setPackQty}
                placeholder="1"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Pack quantity"
              />
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Product URL</ThemedText>
            <TextInput
              value={url}
              onChangeText={setUrl}
              placeholder="https://..."
              placeholderTextColor={colors.icon}
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Product URL"
            />
          </View>

          <View style={styles.section}>
            <ThemedText style={styles.label}>Image URL</ThemedText>
            <TextInput
              value={imageUrl}
              onChangeText={setImageUrl}
              placeholder="https://..."
              placeholderTextColor={colors.icon}
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Image URL"
            />
          </View>

          <Pressable
            onPress={submit}
            disabled={submitting}
            style={[
              styles.submitButton,
              { backgroundColor: submitting ? colors.icon : colors.tint },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Save product"
            accessibilityState={{ disabled: submitting }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>Save Product</ThemedText>
            )}
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={scannerVisible} animationType="slide" presentationStyle="fullScreen">
        <BarcodeScanner
          onScanned={(barcodeValue) => handleBarcodeScan(barcodeValue)}
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
  scroll: {
    paddingHorizontal: Spacing.lg,
  },
  headerBlock: {
    paddingTop: Spacing.headerTop,
    marginBottom: Spacing.lg,
  },
  subtitle: {
    marginTop: Spacing.xs,
    fontSize: FontSize.sm,
  },
  section: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  currencyBox: {
    width: 104,
  },
  packQtyBox: {
    width: 90,
  },
  label: {
    marginBottom: Spacing.xs,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  helperText: {
    fontSize: FontSize.sm,
  },
  input: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  selectedStoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing.md,
  },
  selectedStoreInfo: {
    flex: 1,
  },
  selectedStoreName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  selectedStoreAddress: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  storeResultsList: {
    marginTop: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  storeResultItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  storeResultName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  storeResultAddress: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  barcodeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  barcodeText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: 'SpaceMono',
    fontWeight: '600',
  },
  captureRow: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  captureButton: {
    flex: 1,
    minHeight: 84,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureIcon: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  captureLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackBox: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  feedbackText: {
    fontSize: FontSize.sm,
  },
  submitButton: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  submitText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
