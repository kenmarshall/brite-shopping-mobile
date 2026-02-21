export function formatPrice(amount: number | null | undefined, currency = 'JMD'): string {
  if (amount == null) return 'Price unavailable';
  if (currency === 'USD') return `US$${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatStoreCount(count: number): string {
  return `${count} store${count !== 1 ? 's' : ''}`;
}

export interface ProductSizeValue {
  value: number | null;
  unit: string | null;
  pack_count?: number | null;
}

function compactNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

export function formatProductSize(size: ProductSizeValue | null | undefined): string | null {
  if (!size) return null;
  const hasValue = size.value != null;
  const unit = (size.unit || '').trim();
  const hasUnit = unit.length > 0;
  const packCount = size.pack_count ?? null;

  if (packCount && hasValue && hasUnit) {
    return `${packCount} x ${compactNumber(size.value!)} ${unit}`;
  }
  if (packCount && hasValue) {
    return `${packCount} x ${compactNumber(size.value!)}`;
  }
  if (packCount) {
    return `${packCount} pack`;
  }
  if (hasValue && hasUnit) {
    return `${compactNumber(size.value!)} ${unit}`;
  }
  if (hasValue) {
    return compactNumber(size.value!);
  }
  return null;
}

/** Returns pack info like "6-pack", or null if not a multipack. */
export function formatPackInfo(size: ProductSizeValue | null | undefined): string | null {
  if (!size) return null;
  const packCount = size.pack_count ?? null;
  if (packCount && packCount > 1) {
    return `${packCount}-pack`;
  }
  return null;
}

/** Returns just the measure portion, e.g. "330ml", or null if no size data. */
export function formatMeasure(size: ProductSizeValue | null | undefined): string | null {
  if (!size) return null;
  const hasValue = size.value != null;
  const unit = (size.unit || '').trim();
  const hasUnit = unit.length > 0;
  if (hasValue && hasUnit) {
    return `${compactNumber(size.value!)}${unit}`;
  }
  if (hasValue) {
    return compactNumber(size.value!);
  }
  return null;
}
