import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { ButtonSize, FontSize, Radius, Spacing } from '@/constants/Theme';
import { useColorScheme } from '@/hooks/useColorScheme';
import { type Product, getProduct, updateProduct } from '@/services/api';
import { uploadImage, withBackgroundRemoved } from '@/services/cloudinary';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable fields
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [sizeValue, setSizeValue] = useState('');
  const [sizeUnit, setSizeUnit] = useState('');
  const [packQty, setPackQty] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  // Local preview URI (before upload completes)
  const [localImageUri, setLocalImageUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setName(p.name || '');
        setBrand(p.brand || '');
        setSizeValue(p.size?.value != null ? String(p.size.value) : '');
        setSizeUnit(p.size?.unit || '');
        setPackQty(p.size?.pack_count != null ? String(p.size.pack_count) : '');
        setImageUrl(p.image_url || null);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow access to your photo library to upload a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setLocalImageUri(uri);
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(uri);
      setImageUrl(withBackgroundRemoved(uploaded.secure_url));
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload image. Please try again.');
      setLocalImageUri(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow camera access to take a product photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const uri = result.assets[0].uri;
    setLocalImageUri(uri);
    setUploadingImage(true);
    try {
      const uploaded = await uploadImage(uri);
      setImageUrl(withBackgroundRemoved(uploaded.secure_url));
    } catch (err: any) {
      Alert.alert('Upload failed', err?.message || 'Could not upload image. Please try again.');
      setLocalImageUri(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const validate = (): string | null => {
    if (name.trim().length < 2) return 'Product name must be at least 2 characters.';
    if (sizeValue.trim()) {
      const v = Number(sizeValue);
      if (!Number.isFinite(v) || v <= 0) return 'Size value must be a positive number.';
    }
    if (packQty.trim()) {
      const v = Number(packQty);
      if (!Number.isInteger(v) || v <= 0) return 'Pack qty must be a positive whole number.';
    }
    return null;
  };

  const submit = async () => {
    if (!id) return;
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (uploadingImage) {
      setError('Please wait for the image to finish uploading.');
      return;
    }

    const parsedSizeValue = sizeValue.trim() ? Number(sizeValue) : null;
    const parsedUnit = sizeUnit.trim() || null;
    const parsedPackQty = packQty.trim() ? Number(packQty) : null;

    const payload: Parameters<typeof updateProduct>[1] = {
      name: name.trim(),
      brand: brand.trim() || null,
      size: {
        value: parsedSizeValue,
        unit: parsedUnit,
        pack_count: parsedPackQty,
      },
      image_url: imageUrl,
    };

    setSubmitting(true);
    try {
      await updateProduct(id, payload);
      Alert.alert('Saved', 'Product updated successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      setError(err?.message || 'Failed to save product.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={colors.tint} />
      </ThemedView>
    );
  }

  if (error && !product) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={[styles.errorText, { color: colors.error }]}>
          {error || 'Product not found'}
        </ThemedText>
        <Pressable
          onPress={() => router.back()}
          style={[styles.button, { backgroundColor: colors.tint }]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ThemedText style={styles.buttonText}>Go Back</ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  const previewUri = localImageUri || imageUrl;

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View style={styles.backNav}>
            <Pressable onPress={() => router.back()} hitSlop={8} accessibilityRole="button" accessibilityLabel="Go back">
              <ThemedText style={[styles.backArrow, { color: colors.tint }]}>{'<'} Back</ThemedText>
            </Pressable>
          </View>
          <ThemedText type="title" style={styles.pageTitle}>Edit Product</ThemedText>

          {error && (
            <View style={[styles.feedbackBox, { backgroundColor: '#FDECEC', borderColor: '#F8BDBD' }]}>
              <ThemedText style={[styles.feedbackText, { color: colors.error }]}>{error}</ThemedText>
            </View>
          )}

          {/* Image section */}
          <View style={styles.section}>
            <ThemedText style={styles.label}>Product Photo</ThemedText>
            {previewUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image
                  source={{ uri: previewUri }}
                  style={[styles.imagePreview, { backgroundColor: colors.backgroundSecondary }]}
                  contentFit="contain"
                />
                {uploadingImage && (
                  <View style={styles.imageOverlay}>
                    <ActivityIndicator size="large" color="#fff" />
                    <ThemedText style={styles.imageOverlayText}>Uploading…</ThemedText>
                  </View>
                )}
                <View style={styles.imageButtons}>
                  <Pressable
                    style={[styles.imageButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={pickImage}
                    accessibilityRole="button"
                    accessibilityLabel="Choose different photo"
                  >
                    <IconSymbol name="photo" size={18} color={colors.tint} />
                    <ThemedText style={[styles.imageButtonText, { color: colors.tint }]}>Change</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.imageButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={takePhoto}
                    accessibilityRole="button"
                    accessibilityLabel="Take a new photo"
                  >
                    <IconSymbol name="camera" size={18} color={colors.tint} />
                    <ThemedText style={[styles.imageButtonText, { color: colors.tint }]}>Camera</ThemedText>
                  </Pressable>
                  <Pressable
                    style={[styles.imageButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                    onPress={() => { setImageUrl(null); setLocalImageUri(null); }}
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                  >
                    <IconSymbol name="trash" size={18} color={colors.error} />
                    <ThemedText style={[styles.imageButtonText, { color: colors.error }]}>Remove</ThemedText>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.imagePicker}>
                <Pressable
                  style={[styles.imagePickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={pickImage}
                  accessibilityRole="button"
                  accessibilityLabel="Choose photo from library"
                >
                  <IconSymbol name="photo" size={28} color={colors.tint} />
                  <ThemedText style={[styles.imagePickerLabel, { color: colors.tint }]}>Photo Library</ThemedText>
                </Pressable>
                <Pressable
                  style={[styles.imagePickerButton, { backgroundColor: colors.backgroundSecondary, borderColor: colors.border }]}
                  onPress={takePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Take a photo"
                >
                  <IconSymbol name="camera" size={28} color={colors.tint} />
                  <ThemedText style={[styles.imagePickerLabel, { color: colors.tint }]}>Take Photo</ThemedText>
                </Pressable>
              </View>
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

          <View style={styles.section}>
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

          <View style={styles.row}>
            <View style={styles.flex1}>
              <ThemedText style={styles.label}>Size</ThemedText>
              <TextInput
                value={sizeValue}
                onChangeText={setSizeValue}
                placeholder="e.g. 400"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                keyboardType="decimal-pad"
                accessibilityLabel="Size value"
              />
            </View>
            <View style={styles.unitBox}>
              <ThemedText style={styles.label}>Unit</ThemedText>
              <TextInput
                value={sizeUnit}
                onChangeText={setSizeUnit}
                placeholder="ml, g…"
                placeholderTextColor={colors.icon}
                style={[styles.input, { backgroundColor: colors.backgroundSecondary, color: colors.text }]}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Size unit"
              />
            </View>
            <View style={styles.packBox}>
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

          <Pressable
            onPress={submit}
            disabled={submitting || uploadingImage}
            style={[styles.submitButton, { backgroundColor: submitting || uploadingImage ? colors.icon : colors.tint }]}
            accessibilityRole="button"
            accessibilityLabel="Save changes"
            accessibilityState={{ disabled: submitting || uploadingImage }}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.submitText}>Save Changes</ThemedText>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: 60,
  },
  backNav: {
    paddingTop: Spacing.headerTop,
    paddingBottom: Spacing.xs,
  },
  backArrow: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  pageTitle: {
    marginBottom: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  flex1: {
    flex: 1,
  },
  unitBox: {
    width: 80,
  },
  packBox: {
    width: 80,
  },
  label: {
    marginBottom: Spacing.xs,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  input: {
    height: ButtonSize.touch,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
  },
  imagePreviewContainer: {
    gap: Spacing.sm,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: Radius.md,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  imageOverlayText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  imageButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  imageButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  imagePicker: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  imagePickerButton: {
    flex: 1,
    minHeight: 90,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  imagePickerLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
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
  button: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.sm,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  errorText: {
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});
