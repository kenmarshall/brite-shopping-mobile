import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { Strings } from '@/constants/Strings';
import { ButtonSize, Fonts, Radius, Spacing, Type } from '@/constants/Theme';
import { useColors } from '@/hooks/useColors';
import type { Product } from '@/services/api';
import { uploadImage, withBackgroundRemoved } from '@/services/cloudinary';
import { setCuratorProductImage } from '@/services/curator';

const S = Strings.curator;

interface Props {
  product: Pick<Product, '_id' | 'name'>;
}

type State = { kind: 'idle' } | { kind: 'uploading' } | { kind: 'done'; uri: string } | { kind: 'error'; message: string };

/** For products without a photo: take one in store, upload it and attach it to the product. */
export function ProductPhotoButton({ product }: Props) {
  const colors = useColors();
  const [state, setState] = useState<State>({ kind: 'idle' });
  const busy = state.kind === 'uploading';

  const takePhoto = async (): Promise<void> => {
    if (busy) return;
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') return setState({ kind: 'error', message: S.cameraDenied });
      const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      if (result.canceled || !result.assets?.[0]) return;
      const uri = result.assets[0].uri;
      setState({ kind: 'uploading' });
      const uploaded = await uploadImage(uri);
      await setCuratorProductImage(product._id, withBackgroundRemoved(uploaded.secure_url));
      setState({ kind: 'done', uri });
    } catch {
      setState({ kind: 'error', message: S.photoError });
    }
  };

  if (state.kind === 'done') {
    return (
      <View style={styles.row}>
        <Image source={{ uri: state.uri }} style={styles.thumb} contentFit="cover" accessibilityLabel={S.photoAddedImage(product.name)} />
        <ThemedText style={[styles.text, { color: colors.positive }]}>{S.photoAdded}</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.block}>
      <Pressable
        onPress={takePhoto}
        disabled={busy}
        style={[styles.row, styles.button, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }, busy && styles.dimmed]}
        accessibilityRole="button"
        accessibilityLabel={S.addPhotoLabel(product.name)}
        accessibilityState={{ disabled: busy, busy }}
      >
        {busy ? <ActivityIndicator color={colors.primary} /> : <IconSymbol name="camera" size={22} color={colors.primaryStrong} />}
        <View style={styles.texts}>
          <ThemedText style={[styles.label, { color: colors.primaryStrong }]}>{busy ? S.uploadingPhoto : S.addPhoto}</ThemedText>
          {busy ? null : <ThemedText style={[styles.text, { color: colors.textSecondary }]}>{S.addPhotoHint}</ThemedText>}
        </View>
      </Pressable>
      {state.kind === 'error' ? <ThemedText style={[styles.text, { color: colors.danger }]}>{state.message}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: Spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  button: { minHeight: ButtonSize.large, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  texts: { flex: 1 },
  label: { ...Type.callout, fontFamily: Fonts.semibold },
  text: { ...Type.caption },
  thumb: { width: ButtonSize.large, height: ButtonSize.large, borderRadius: Radius.sm },
  dimmed: { opacity: 0.6 },
});
