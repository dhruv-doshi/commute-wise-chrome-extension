import { describe, it, expect, vi } from 'vitest';
import { cacheKey, currentHourBucket, routeHash } from '../../src/shared/cache-key';

describe('currentHourBucket', () => {
  it('returns an integer', () => {
    expect(Number.isInteger(currentHourBucket())).toBe(true);
  });

  it('increments by 1 after one hour', () => {
    const now = 1_000_000_000_000; // arbitrary ms timestamp
    vi.spyOn(Date, 'now').mockReturnValueOnce(now).mockReturnValueOnce(now + 3_600_000);
    const b1 = currentHourBucket();
    const b2 = currentHourBucket();
    expect(b2 - b1).toBe(1);
    vi.restoreAllMocks();
  });

  it('is stable within the same hour', () => {
    // Use a fixed timestamp that is well within an hour (not near a boundary).
    // 1_700_000_000_000 ms → bucket 472222, fractional part ≈ 0.22 (mid-hour).
    const base = 1_700_000_000_000;
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(base)
      .mockReturnValueOnce(base + 1_800_000); // +30 min, same bucket
    const b1 = currentHourBucket();
    const b2 = currentHourBucket();
    expect(b1).toBe(b2);
    vi.restoreAllMocks();
  });
});

describe('cacheKey', () => {
  it('produces a deterministic string', () => {
    const key = cacheKey({ lat: 12.97, lng: 77.59 }, 278000);
    expect(key).toBe('12.97,77.59,278000');
  });

  it('snaps coordinates to 0.01° precision', () => {
    // 12.971 and 12.974 both round to 12.97 at 2dp
    const a = cacheKey({ lat: 12.971, lng: 77.591 }, 1);
    const b = cacheKey({ lat: 12.974, lng: 77.594 }, 1);
    expect(a).toBe(b);
  });

  it('differs for different hour buckets', () => {
    const k1 = cacheKey({ lat: 0, lng: 0 }, 100);
    const k2 = cacheKey({ lat: 0, lng: 0 }, 101);
    expect(k1).not.toBe(k2);
  });

  it('differs for different coordinates', () => {
    const k1 = cacheKey({ lat: 12.97, lng: 77.59 }, 1);
    const k2 = cacheKey({ lat: 13.08, lng: 77.59 }, 1);
    expect(k1).not.toBe(k2);
  });
});

describe('routeHash', () => {
  it('produces a hex string', () => {
    const h = routeHash('Bangalore', 'Mysore');
    expect(/^[0-9a-f]+$/.test(h)).toBe(true);
  });

  it('is deterministic', () => {
    expect(routeHash('A', 'B')).toBe(routeHash('A', 'B'));
  });

  it('differs for different routes', () => {
    expect(routeHash('Bangalore', 'Mysore')).not.toBe(routeHash('Mysore', 'Bangalore'));
  });
});
