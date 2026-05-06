import type { LatLng } from './types';

/** Rounds a coordinate to ~1 km precision (~0.01°). */
function gridSnap(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Returns the current hour bucket — increments once per hour.
 * Used to expire cached OWM responses after the hour rolls over.
 */
export function currentHourBucket(): number {
  return Math.floor(Date.now() / 3_600_000);
}

/**
 * Stable cache key for a single lat/lng + hour combination.
 * Snapping to 0.01° keeps nearby duplicate calls from multiplying cache entries.
 */
export function cacheKey(latLng: LatLng, hourBucket: number): string {
  return `${gridSnap(latLng.lat)},${gridSnap(latLng.lng)},${hourBucket}`;
}

/**
 * A short hash of origin+destination used to namespace per-route keys.
 * djb2 variant — fast, good distribution, not cryptographic (not needed here).
 */
export function routeHash(origin: string, destination: string): string {
  const s = `${origin}|${destination}`;
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h.toString(16);
}
