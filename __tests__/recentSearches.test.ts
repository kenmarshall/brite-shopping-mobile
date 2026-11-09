import { describe, expect, it } from '@jest/globals';

import { addRecentSearch } from '@/utils/recentSearches';

describe('addRecentSearch', () => {
  it('puts the newest search first', () => {
    expect(addRecentSearch(['rice'], 'chicken')).toEqual(['chicken', 'rice']);
  });
  it('trims and moves a repeat to the front, ignoring case', () => {
    expect(addRecentSearch(['rice', 'Coconut milk'], '  coconut MILK ')).toEqual(['coconut MILK', 'rice']);
  });
  it('ignores blank queries', () => {
    const recent = ['rice'];
    expect(addRecentSearch(recent, '   ')).toBe(recent);
  });
  it('keeps at most the cap', () => {
    expect(addRecentSearch(['a', 'b', 'c'], 'd', 3)).toEqual(['d', 'a', 'b']);
  });
});
