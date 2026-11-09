import { describe, expect, it } from '@jest/globals';
import { formatPrice } from '@/utils/format';

describe('formatPrice', () => {
  it('prefixes Jamaican dollars with J$ and drops empty cents', () => {
    expect(formatPrice(1450)).toBe('J$1,450');
    expect(formatPrice(1449.5)).toBe('J$1,449.50');
  });
  it('keeps US dollars distinct', () => {
    expect(formatPrice(12.99, 'USD')).toBe('US$12.99');
  });
  it('says when there is no price', () => {
    expect(formatPrice(null)).toBe('Price unavailable');
  });
});
