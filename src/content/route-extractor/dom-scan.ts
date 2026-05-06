/**
 * Scans inline <script> tags for encoded polyline strings.
 * Google Maps embeds initial route data in script tags on page load
 * (AF_initDataCallback pattern), so no XHR fires for routes opened directly via URL.
 */

import { decodePolyline, isLikelyPolyline } from './polyline-decoder';
import type { LatLng } from '../../shared/types';

// Matches quoted strings of 50+ encoded-polyline characters (ASCII 63–126).
// Min length 50 filters noise; real overview polylines are 200–2000+ chars.
const POLYLINE_RE = /["'`]([\x3f-\x7e]{50,})["'`]/g;

export function extractPolylineFromDom(): LatLng[] | null {
  const scripts = document.querySelectorAll<HTMLScriptElement>('script:not([src])');
  let best: LatLng[] | null = null;

  for (const script of scripts) {
    const text = script.textContent;
    if (!text || text.length < 200) continue;

    POLYLINE_RE.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = POLYLINE_RE.exec(text)) !== null) {
      const candidate = match[1];
      if (!isLikelyPolyline(candidate)) continue;
      const pts = decodePolyline(candidate);
      if (!best || pts.length > best.length) {
        best = pts;
      }
    }
  }

  return best;
}
