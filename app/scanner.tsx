import { useRouter } from 'expo-router';

import BarcodeScanner from '@/components/BarcodeScanner';

/** Full-screen camera opened from the Scan tab; hands the barcode to the lookup screen. */
export default function ScannerScreen() {
  const router = useRouter();
  return (
    <BarcodeScanner
      onScanned={(barcode) => router.replace({ pathname: '/scan', params: { barcode } })}
      onClose={() => router.back()}
    />
  );
}
