/**
 * Integration tests for OwmClient.
 * No Chrome globals, no real network, no real IndexedDB.
 * Dependencies are injected via the constructor.
 */

import { describe, it, expect, vi } from 'vitest';
import { OwmClient, type CacheEntry, type NormalisedForecast } from '../../src/background/owm-client';
import type { Owm25ForecastResponse, OwmHourly } from '../../src/shared/messages';
import type { SamplePoint } from '../../src/shared/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Builds a raw OWM 2.5 /forecast response — the shape the mock fetch returns.
 * rain.3h is mm in 3 hours; owm-client normalises it to mm/h internally.
 */
function makeRawResponse(
  overrides: Partial<{ list: Owm25ForecastResponse['list'] }> = {},
): Owm25ForecastResponse {
  const baseItem = {
    dt: 1_700_000_000,
    main: { temp: 298.15, humidity: 60 },
    weather: [{ id: 800, main: 'Clear' }],
    pop: 0.1,
  };
  return {
    list: Array.from({ length: 40 }, (_, i) => ({
      ...baseItem,
      dt: 1_700_000_000 + i * 10_800, // 3-hour slots
    })),
    ...overrides,
  };
}

/** Builds the normalised hourly array as it would be stored in the cache. */
function makeNormalisedHourly(count = 40): OwmHourly[] {
  return Array.from({ length: count }, (_, i) => ({
    dt: 1_700_000_000 + i * 10_800,
    temp: 298.15,
    humidity: 60,
    weather: [{ id: 800, main: 'Clear' }],
    pop: 0.1,
  }));
}

function makeNormalisedForecast(): NormalisedForecast {
  return { hourly: makeNormalisedHourly() };
}

function makeSample(overrides: Partial<SamplePoint> = {}): SamplePoint {
  return { lat: 12.97, lng: 77.59, distKm: 0, etaMinutes: 0, ...overrides };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeClient(opts: {
  fetchFn?: typeof fetch;
  store?: Map<string, CacheEntry>;
  apiKey?: string | null;
  now?: () => number;
}) {
  const store = opts.store ?? new Map<string, CacheEntry>();
  return new OwmClient({
    fetchFn: opts.fetchFn ?? (async () => new Response('{}', { status: 200 })),
    getCached: async (key) => store.get(key),
    putCached: async (key, entry) => { store.set(key, entry); },
    getApiKey: async () => (opts.apiKey !== undefined ? opts.apiKey : 'test-key'),
    now: opts.now,
  });
}

// ---------------------------------------------------------------------------
// fetchForecast
// ---------------------------------------------------------------------------

describe('OwmClient.fetchForecast', () => {
  it('fetches from OWM and caches the normalised forecast on first call', async () => {
    const raw = makeRawResponse();
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(raw), { status: 200 }),
    );
    const store = new Map<string, CacheEntry>();
    const client = makeClient({ fetchFn: mockFetch, store });

    const result = await client.fetchForecast({ lat: 12.97, lng: 77.59 });
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(false);
    expect(result!.data.hourly).toHaveLength(raw.list.length);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(store.size).toBe(1);
  });

  it('normalises 3h rain to mm/h', async () => {
    const raw = makeRawResponse({
      list: [{ dt: 1_700_000_000, main: { temp: 298.15, humidity: 60 }, weather: [{ id: 800, main: 'Clear' }], pop: 0.5, rain: { '3h': 6 } }],
    });
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(raw), { status: 200 }),
    );
    const client = makeClient({ fetchFn: mockFetch });
    const result = await client.fetchForecast({ lat: 0, lng: 0 });
    // 6mm in 3h → 2mm/h
    expect(result!.data.hourly[0].rain?.['1h']).toBeCloseTo(2, 5);
  });

  it('returns cached data on second call without fetching again', async () => {
    const raw = makeRawResponse();
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(raw), { status: 200 }),
    );
    const store = new Map<string, CacheEntry>();
    const client = makeClient({ fetchFn: mockFetch, store });

    const latLng = { lat: 12.97, lng: 77.59 };
    await client.fetchForecast(latLng);
    const second = await client.fetchForecast(latLng);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(second!.stale).toBe(false);
  });

  it('marks a previous-hour cache entry as stale', async () => {
    const { cacheKey, currentHourBucket } = await import('../../src/shared/cache-key');
    const latLng = { lat: 12.97, lng: 77.59 };
    const currentBucket = currentHourBucket();

    // Store data under the current bucket key but with hourBucket one less,
    // simulating a cache entry that was written in the previous hour.
    const key = cacheKey(latLng, currentBucket);
    const store = new Map<string, CacheEntry>();
    store.set(key, { data: makeNormalisedForecast(), hourBucket: currentBucket - 1 });

    const client = makeClient({ store });
    const result = await client.fetchForecast(latLng);

    // The lookup hits the cache (key matches) but hourBucket is stale.
    expect(result).not.toBeNull();
    expect(result!.stale).toBe(true);
  });

  it('returns null when no API key is set', async () => {
    const client = makeClient({ apiKey: null });
    const result = await client.fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it('returns null when OWM returns a non-200 status', async () => {
    const mockFetch = vi.fn().mockResolvedValue(new Response('', { status: 429 }));
    const client = makeClient({ fetchFn: mockFetch });
    const result = await client.fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it('returns null when fetch throws (network error)', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network down'));
    const client = makeClient({ fetchFn: mockFetch });
    const result = await client.fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Token bucket rate limiter
// ---------------------------------------------------------------------------

describe('OwmClient rate limiter', () => {
  it('exhausts tokens after 60 requests and returns null without a stale entry', async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response(JSON.stringify(makeRawResponse()), { status: 200 });
    });

    const client = makeClient({ fetchFn: mockFetch });
    // Use distinct coordinates per call so nothing hits the cache
    const requests = Array.from({ length: 61 }, (_, i) =>
      client.fetchForecast({ lat: i * 0.1, lng: 0 }),
    );

    const results = await Promise.all(requests);
    const nulls = results.filter((r) => r === null);
    expect(nulls.length).toBeGreaterThanOrEqual(1);
    expect(callCount).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// forecastForRoute
// ---------------------------------------------------------------------------

describe('OwmClient.forecastForRoute', () => {
  it('returns results sorted by ETA', async () => {
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(makeRawResponse()), { status: 200 }),
    );
    const client = makeClient({ fetchFn: mockFetch });

    const samples: SamplePoint[] = [
      makeSample({ lat: 12.97, lng: 77.59, distKm: 10, etaMinutes: 20 }),
      makeSample({ lat: 12.00, lng: 77.00, distKm: 0,  etaMinutes: 0  }),
      makeSample({ lat: 13.50, lng: 78.00, distKm: 50, etaMinutes: 60 }),
    ];

    const { results } = await client.forecastForRoute(samples, 1_700_000_000);
    const etas = results.map((r) => r.etaMinutes);
    expect(etas).toEqual([...etas].sort((a, b) => a - b));
  });

  it('returns empty annotations when all risk is low', async () => {
    // Clear sky, 25°C, no rain → all axes low → no icons
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(makeRawResponse()), { status: 200 }),
    );
    const client = makeClient({ fetchFn: mockFetch });

    const { annotations } = await client.forecastForRoute([makeSample()], 1_700_000_000);
    expect(annotations).toHaveLength(0);
  });

  it('returns annotations for medium+ severity (heavy rain)', async () => {
    // 24mm in 3h → 8mm/h → high rain
    const raw = makeRawResponse({
      list: Array.from({ length: 40 }, (_, i) => ({
        dt: 1_700_000_000 + i * 10_800,
        main: { temp: 298.15, humidity: 60 },
        weather: [{ id: 800, main: 'Clear' }],
        pop: 0.8,
        rain: { '3h': 24 },
      })),
    });
    const mockFetch = vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify(raw), { status: 200 }),
    );
    const client = makeClient({ fetchFn: mockFetch });

    const { annotations } = await client.forecastForRoute([makeSample()], 1_700_000_000);
    expect(annotations.length).toBeGreaterThan(0);
    expect(['rain', 'flood', 'heat', 'aqi']).toContain(annotations[0].kind);
  });
});
