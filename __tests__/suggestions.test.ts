import { describe, expect, it } from '@jest/globals';

import { correctionFields, suggestionChanges } from '@/utils/suggestions';

const product = { name: 'Grace Baked Beans', brand: 'Grace' };

describe('correctionFields', () => {
  it('returns only fields that changed', () => {
    expect(correctionFields(product, { name: 'Grace Baked Beans 300 g', brand: 'Grace' })).toEqual({ name: 'Grace Baked Beans 300 g' });
  });
  it('ignores whitespace-only edits and blanks', () => {
    expect(correctionFields(product, { name: '  Grace Baked Beans ', brand: '' })).toEqual({});
  });
  it('treats a brand added to a product without one as a change', () => {
    expect(correctionFields({ name: 'Bullas', brand: null }, { name: 'Bullas', brand: 'Purity' })).toEqual({ brand: 'Purity' });
  });
});

describe('suggestionChanges', () => {
  it('lists changed fields in a stable order with the current value', () => {
    expect(suggestionChanges({ brand: 'Grace', name: 'Baked Beans 300 g' }, { name: 'Baked Beans', brand: null })).toEqual([
      { field: 'name', before: 'Baked Beans', after: 'Baked Beans 300 g' },
      { field: 'brand', before: null, after: 'Grace' },
    ]);
  });
  it('skips values that already match', () => {
    expect(suggestionChanges({ name: 'Same' }, { name: 'Same' })).toEqual([]);
  });
});
