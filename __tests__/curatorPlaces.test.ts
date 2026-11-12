import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { addGooglePlace, searchGooglePlaces, type GooglePlace } from '@/services/curator';

const place: GooglePlace = {
  place_id: 'g-select',
  name: 'Select Grocers Supermarket',
  address: 'Upper Manor Park Plaza, 184 Constant Spring Rd, Kingston, Jamaica',
  latitude: 18.0447,
  longitude: -76.7958,
};

const mockFetch = (body: unknown) => {
  const fn = jest.fn<typeof fetch>(async () => ({ ok: true, json: async () => body }) as Response);
  global.fetch = fn;
  return fn;
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe('searchGooglePlaces', () => {
  it('sends the search and the curator position', async () => {
    const fetchMock = mockFetch({ places: [place] });
    expect(await searchGooglePlaces({ q: ' select ', lat: 18.04, lng: -76.79 })).toEqual([place]);
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('/curator/stores/places?');
    expect(url).toContain('q=select');
    expect(url).toContain('lat=18.04');
    expect(url).toContain('lng=-76.79');
  });

  it('searches without a position when location is off', async () => {
    const fetchMock = mockFetch({ places: [] });
    await searchGooglePlaces({ q: 'mastermac' });
    expect(String(fetchMock.mock.calls[0][0])).not.toContain('lat=');
  });
});

describe('addGooglePlace', () => {
  it('posts the listing by place_id and leaves the type to the API', async () => {
    const store = { store_id: 'select-grocers-supermarket-kingston', store_name: place.name };
    const fetchMock = mockFetch({ store });
    expect(await addGooglePlace(place)).toEqual(store);
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    expect(init.method).toBe('POST');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ place_id: 'g-select', store_name: place.name, address: place.address });
    expect(body.type).toBeUndefined();
  });
});
