/**
 * OpenRouteService fallback: asks the background SW (which holds the ORS key)
 * to fetch a route polyline when the primary intercept and SVG fallback fail.
 * The SW handler is wired in Phase 3.
 */

import type { LatLng } from '../../shared/types';

export async function fetchPolylineFromOrs(
  origin: string,
  destination: string,
): Promise<LatLng[] | null> {
  return new Promise((resolve) => {
    const handler = (response: { polyline?: LatLng[] } | null) => {
      resolve(response?.polyline ?? null);
      clearTimeout(timer);
    };

    chrome.runtime.sendMessage({ type: 'ors:fetchRoute', origin, destination }, (response) => {
      // Suppress "message port closed" error when SW doesn't handle this yet (Phase 3)
      void chrome.runtime.lastError;
      handler(response as { polyline?: LatLng[] } | null);
    });

    // If SW doesn't respond (not yet wired), resolve after timeout
    const timer = setTimeout(() => resolve(null), 5_000);
  });
}
