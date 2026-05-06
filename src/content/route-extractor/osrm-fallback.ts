/**
 * OSRM (Open Source Routing Machine) fallback — free, no API key required.
 * Used when Google's fetch interception doesn't capture the polyline (e.g.
 * when Maps serves data through its service worker cache).
 *
 * Returns a driving-mode polyline that closely matches Google's route on
 * the same road network. The SVG fallback (Phase 2) will supersede this
 * with Google's exact rendered polyline.
 */

import { decodePolyline } from './polyline-decoder';
import type { LatLng } from '../../shared/types';

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving';

interface OsrmResponse {
  code: string;
  routes?: Array<{ geometry: string }>;
}

export async function fetchPolylineFromOsrm(
  origin: LatLng,
  destination: LatLng,
): Promise<LatLng[] | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=polyline`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const data = (await res.json()) as OsrmResponse;
    if (data.code !== 'Ok' || !data.routes?.length) return null;
    return decodePolyline(data.routes[0].geometry);
  } catch {
    return null;
  }
}
