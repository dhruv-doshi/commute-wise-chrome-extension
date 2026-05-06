/**
 * Decodes Google's encoded polyline format into LatLng points.
 * Algorithm: https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import type { LatLng } from '../../shared/types';

export function decodePolyline(encoded: string): LatLng[] {
  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

/** Heuristic: a string looks like an encoded polyline if it decodes to ≥ 5 valid lat/lng points. */
export function isLikelyPolyline(s: string): boolean {
  if (s.length < 10) return false;
  // Encoded polylines only use ASCII 63–126
  if (!/^[\x3f-\x7e]+$/.test(s)) return false;
  try {
    const pts = decodePolyline(s);
    return (
      pts.length >= 3 &&
      pts.every((p) => p.lat >= -90 && p.lat <= 90 && p.lng >= -180 && p.lng <= 180)
    );
  } catch {
    return false;
  }
}

/**
 * Recursively walks a parsed JSON value and returns all strings that look
 * like encoded polylines, longest first. The overview polyline is always
 * the longest candidate in Google's response.
 */
export function extractPolylineCandidates(obj: unknown): string[] {
  if (typeof obj === 'string') {
    return isLikelyPolyline(obj) ? [obj] : [];
  }
  if (Array.isArray(obj)) {
    return obj.flatMap(extractPolylineCandidates);
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.values(obj).flatMap(extractPolylineCandidates);
  }
  return [];
}

/**
 * Given a raw Google Maps response body (may have XSSI prefix),
 * returns the decoded polyline with the most points, or null.
 */
export function extractPolylineFromResponse(body: string): LatLng[] | null {
  const json = body.replace(/^\)\]\}'\s*\n?/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }

  const candidates = extractPolylineCandidates(parsed);
  if (candidates.length === 0) return null;

  // The overview polyline has the most points
  candidates.sort((a, b) => b.length - a.length);
  return decodePolyline(candidates[0]);
}
