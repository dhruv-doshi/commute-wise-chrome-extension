import type { LatLng, SamplePoint } from './types';

function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

/**
 * Samples N evenly-spaced points along a polyline.
 * Always includes the first and last point of the route.
 *
 * @param points     The decoded route polyline.
 * @param spacingKm  Target gap between samples (default 5 km).
 * @param maxSamples Hard cap on number of samples (default 12).
 * @param totalEtaMinutes Total travel time from Google's ETA (used to assign arrival offsets).
 */
export function sampleRoute(
  points: LatLng[],
  spacingKm = 5,
  maxSamples = 12,
  totalEtaMinutes = 60,
): SamplePoint[] {
  if (points.length === 0) return [];
  if (points.length === 1) {
    return [{ ...points[0], distKm: 0, etaMinutes: 0 }];
  }

  // Build cumulative distance array
  const cumDist: number[] = [0];
  for (let i = 1; i < points.length; i++) {
    cumDist.push(cumDist[i - 1] + haversineKm(points[i - 1], points[i]));
  }
  const totalDist = cumDist[cumDist.length - 1];

  if (totalDist === 0) {
    return [{ ...points[0], distKm: 0, etaMinutes: 0 }];
  }

  // Determine target distances for each sample
  const count = Math.min(Math.max(2, Math.ceil(totalDist / spacingKm) + 1), maxSamples);
  const targets: number[] = [];
  for (let i = 0; i < count; i++) {
    targets.push((i / (count - 1)) * totalDist);
  }

  // For each target distance, find the interpolated point on the polyline
  const samples: SamplePoint[] = [];
  let segIdx = 0;

  for (const targetDist of targets) {
    // Advance segment index until we bracket the target
    while (segIdx < cumDist.length - 2 && cumDist[segIdx + 1] < targetDist) {
      segIdx++;
    }

    const segStart = cumDist[segIdx];
    const segEnd = cumDist[segIdx + 1] ?? segStart;
    const segLen = segEnd - segStart;
    const t = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    const a = points[segIdx];
    const b = points[Math.min(segIdx + 1, points.length - 1)];

    samples.push({
      lat: a.lat + t * (b.lat - a.lat),
      lng: a.lng + t * (b.lng - a.lng),
      distKm: targetDist,
      etaMinutes: (targetDist / totalDist) * totalEtaMinutes,
    });
  }

  return samples;
}
