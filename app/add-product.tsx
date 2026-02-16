import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { addProduct, getStores, type Store } from '@/services/api';

export default function AddProductScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const router = useRouter();

  const [stores, setStores] = useState<Store[]>([]);
  const [loadingStores, setLoadingStores] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [storeId, setStoreId] = useState('');
  const [storeName, setStoreName] = useState('');
  const [currency, setCurrency] = useState('JMD');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('');
  const [sizeHint, setSizeHint] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    setLoadingStores(true);
    getStores()
      .then((items) => setStores(items))
      .catch(() => setStores([]))
      .finally(() => setLoadingStores(false));
  }, []);

  const selectedStore = useMemo(
    () => stores.find((store) => store.store_id === storeId),
    [stores, storeId],
  );

  const selectStore = (store: Store) => {
    setStoreId(store.store_id);
    if (!storeName.trim()) {
      setStoreName(store.store_name);
    }
  };

  const validate = (): string | null => {
    if (name.trim().length < 2) {
      return 'Product name must be at least 2 characters.';
    }
    if (!storeId.trim()) {
      return 'Store ID is required.';
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice)) {
      return 'Price must be a valid number.';
    }
    if (parsedPrice <= 0) {
      return 'Price must be greater than 0.';
    }

    const trimmedCurrency = currency.trim().toUpperCase();
    if (trimmedCurrency.length !== 3) {
      return 'Currency must be a 3-letter code (e.g. JMD).';
    }

    return null;
  };

  const clearForm = () => {
    setName('');
    setPrice('');
    setBrand('');
    setCategory('');
    setSizeHint('');
    setImageUrl('');
    setUrl('');
  };

  const submit = async () => {
    setError(null);
    setSuccess(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const payload = {
      name: name.trim(),
      store_id: storeId.trim().toLowerCase(),
      store_name: storeName.trim() || selectedStore?.store_name || storeId.trim(),
      price: Number(price),
      currency: currency.trim().toUpperCase(),
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      size_hint: sizeHint.trim() || undefined,
      image_url: imageUrl.trim() || undefined,
      url: url.trim() || undefined,
    };

    setSubmitting(true);
    try {
      const response = await addProduct(payload);
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
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable
            onPress={() => router.back()}
            style={styles.backNav}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ThemedText style={[styles.backText, { color: colors.tint }]}>
              {'<'} Back
            </ThemedText>
          </Pressable>

          <View style={styles.headerBlock}>
            <ThemedText type="title">Add Product / Price</ThemedText>
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
            <ThemedText style={styles.label}>Quick Store Select</ThemedText>
            {loadingStores ? (
              <View style={styles.loadingStoresRow}>
                <ActivityIndicator size="small" color={colors.tint} />
                <ThemedText style={[styles.loadingStoresText, { color: colors.textSecondary }]}>Loading stores...</ThemedText>
              </View>
            ) : stores.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.storeChipRow}
              >
                {stores.map((store) => (
                  <Pressable
                    key={store.store_id}
                    onPress={() => selectStore(store)}
                    style={[
                      styles.storeChip,
                      store.store_id === storeId
                        ? { backgroundColor: colors.success }
                        : { backgroundColor: colors.backgroundSecondary },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Select ${store.store_name}`}
                    accessibilityState={{ selected: store.store_id === storeId }}
                  >
                    <ThemedText
                      style={[
                        styles.storeChipText,
                        store.store_id === storeId && styles.storeChipTextSelected,
                      ]}
                    >
                      {store.store_name}
                    </ThemedText>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <ThemedText style={[styles.helperText, { color: colors.textSecondary }]}>No stores available yet. Enter a custom store below.</ThemedText>
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
              <ThemedText style={styles.label}>Price *</ThemedText>
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
              <ThemedText style={styles.label}>Currency *</ThemedText>
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
              <ThemedText style={styles.label}>Store ID *</ThemedText>
              <TextInput
                value={storeId}
                onChangeText={(value) => setStoreId(value.toLowerCase())}
                placeholder="e.g. hilo"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Store ID"
              />
            </View>
            <View style={styles.halfWidth}>
              <ThemedText style={styles.label}>Store Name</ThemedText>
              <TextInput
                value={storeName}
                onChangeText={setStoreName}
                placeholder={selectedStore?.store_name || 'Display name'}
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="words"
                autoCorrect={false}
                accessibilityLabel="Store name"
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

          <View style={styles.section}>
            <ThemedText style={styles.label}>Size Hint</ThemedText>
            <TextInput
              value={sizeHint}
              onChangeText={setSizeHint}
              placeholder="e.g. 400ml, 2kg"
              placeholderTextColor={colors.icon}
              style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Size hint"
            />
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

          <View style={styles.bottomSpacer} />
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  backNav: {
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.sm,
  },
  backText: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  headerBlock: {
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
  loadingStoresRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingStoresText: {
    fontSize: FontSize.sm,
  },
  storeChipRow: {
    gap: Spacing.sm,
    paddingRight: Spacing.sm,
  },
  storeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.lg,
  },
  storeChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  storeChipTextSelected: {
    color: '#fff',
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
  bottomSpacer: {
    height: Spacing.xl,
  },
});
