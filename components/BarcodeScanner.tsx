import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import {
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { FontSize, Radius, Spacing } from '@/constants/Theme';

interface BarcodeScannerProps {
  onScanned: (barcode: string, type: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScanned, onClose }: BarcodeScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const scannedRef = useRef(false);

  const handleBarCodeScanned = ({ data, type }: { data: string; type: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScanned(data, type);
  };

  // Permission not yet determined
  if (!permission) {
    return (
      <View style={styles.overlay}>
        <View style={styles.permissionBox}>
          <ThemedText style={styles.permissionTitle}>Camera Access</ThemedText>
          <ThemedText style={styles.permissionText}>
            Checking camera permissions...
          </ThemedText>
        </View>
      </View>
    );
  }

  // Permission denied
  if (!permission.granted) {
    return (
      <View style={styles.overlay}>
        <View style={styles.permissionBox}>
          <ThemedText style={styles.permissionTitle}>Camera Access Needed</ThemedText>
          <ThemedText style={styles.permissionText}>
            To scan barcodes, Brite Shopping needs access to your camera.
          </ThemedText>
          {permission.canAskAgain ? (
            <Pressable style={styles.grantButton} onPress={requestPermission}>
              <ThemedText style={styles.grantButtonText}>Grant Permission</ThemedText>
            </Pressable>
          ) : (
            <Pressable style={styles.grantButton} onPress={() => Linking.openSettings()}>
              <ThemedText style={styles.grantButtonText}>Open Settings</ThemedText>
            </Pressable>
          )}
          <Pressable style={styles.cancelLink} onPress={onClose}>
            <ThemedText style={styles.cancelText}>Cancel</ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'],
        }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Dark overlay with transparent viewfinder cutout */}
      <View style={styles.overlayTop} />
      <View style={styles.overlayMiddle}>
        <View style={styles.overlaySide} />
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
        </View>
        <View style={styles.overlaySide} />
      </View>
      <View style={styles.overlayBottom}>
        <ThemedText style={styles.instructionText}>
          Point your camera at a product barcode
        </ThemedText>
      </View>

      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={onClose} hitSlop={12}>
        <IconSymbol name="xmark" size={28} color="#fff" />
      </Pressable>

      {/* Torch toggle */}
      <Pressable
        style={styles.torchButton}
        onPress={() => setTorch((t) => !t)}
        hitSlop={12}
      >
        <IconSymbol
          name={torch ? 'flashlight.on.fill' : 'flashlight.off.fill'}
          size={24}
          color="#fff"
        />
      </Pressable>
    </View>
  );
}

const VIEWFINDER_SIZE = 260;
const CORNER_SIZE = 24;
const CORNER_WIDTH = 3;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  permissionBox: {
    backgroundColor: '#1E2022',
    borderRadius: Radius.md,
    padding: Spacing.xl,
    alignItems: 'center',
    maxWidth: 320,
  },
  permissionTitle: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  permissionText: {
    color: '#9BA1A6',
    fontSize: FontSize.md,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  grantButton: {
    backgroundColor: '#0a7ea4',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  grantButtonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  cancelLink: {
    padding: Spacing.sm,
  },
  cancelText: {
    color: '#9BA1A6',
    fontSize: FontSize.md,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: VIEWFINDER_SIZE,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  viewfinder: {
    width: VIEWFINDER_SIZE,
    height: VIEWFINDER_SIZE,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    paddingTop: Spacing.xl,
  },
  instructionText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '500',
    textAlign: 'center',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
    borderTopLeftRadius: 4,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
    borderTopRightRadius: 4,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderColor: '#fff',
    borderBottomRightRadius: 4,
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  torchButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
