import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import BarcodeScanner from '@/components/BarcodeScanner';
import { type ScanResult, type ScanSheetAction, ScanResultSheet } from '@/components/scan/ScanResultSheet';
import { Snackbar } from '@/components/ui/Snackbar';
import { Spacing } from '@/constants/Theme';
import { useListActions } from '@/hooks/useListActions';
import { useSnackbar } from '@/hooks/useSnackbar';
import { lookupBarcode } from '@/services/api';

/**
 * Camera opened from the Scan tab. A scan shows the result in a sheet over the camera, so the
 * shopper can add it and scan the next item without leaving. Unknown barcodes go to /scan,
 * which handles Open Food Facts matches and "help us add it".
 */
export default function ScannerScreen() {
  const router = useRouter();
  const snackbar = useSnackbar();
  const listActions = useListActions(snackbar, () => router.push('/list'), true);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  // Remounting the scanner re-arms it for the next barcode.
  const [scannerKey, setScannerKey] = useState(0);
  const [sheetHeight, setSheetHeight] = useState(0);
  const requestId = useRef(0);

  const lookUp = useCallback(async (code: string): Promise<void> => {
    const id = ++requestId.current;
    setResult({ status: 'looking' });
    try {
      const found = await lookupBarcode(code);
      if (id !== requestId.current) return;
      setResult(found.found && found.product ? { status: 'found', product: found.product } : { status: 'notFound' });
    } catch {
      if (id === requestId.current) setResult({ status: 'error' });
    }
  }, []);

  const onScanned = (code: string) => {
    setBarcode(code);
    lookUp(code);
  };

  const onAction = (action: ScanSheetAction) => {
    if (action === 'retry' && barcode) return void lookUp(barcode);
    if (action === 'details' && result?.status === 'found') {
      return router.push({ pathname: '/product/[id]', params: { id: result.product._id } });
    }
    if (action === 'help' && barcode) return router.replace({ pathname: '/scan', params: { barcode } });
    requestId.current++;
    setResult(null);
    setBarcode(null);
    setScannerKey((k) => k + 1);
  };

  return (
    <View style={styles.screen}>
      <BarcodeScanner key={scannerKey} onScanned={onScanned} onClose={() => router.back()} />
      {result ? (
        <ScanResultSheet
          result={result}
          quantity={result.status === 'found' ? listActions.quantityOf(result.product._id) : 0}
          onQuantity={listActions.setProductQuantity}
          onAction={onAction}
          onLayoutHeight={setSheetHeight}
        />
      ) : null}
      <Snackbar message={snackbar.message} onDismiss={snackbar.dismiss} bottom={(result ? sheetHeight : 0) + Spacing.md} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
