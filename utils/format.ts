export function formatPrice(amount: number | null | undefined, currency = 'JMD'): string {
  if (amount == null) return 'Price unavailable';
  if (currency === 'USD') return `US$${amount.toFixed(2)}`;
  return `$${amount.toFixed(2)}`;
}

export function formatStoreCount(count: number): string {
  return `${count} store${count !== 1 ? 's' : ''}`;
}
