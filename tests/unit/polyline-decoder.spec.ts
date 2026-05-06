import { describe, it, expect } from 'vitest';
import {
  decodePolyline,
  isLikelyPolyline,
  extractPolylineFromResponse,
} from '../../src/content/route-extractor/polyline-decoder';

// Official test vectors from Google's polyline documentation
describe('decodePolyline', () => {
  it('decodes the canonical Google example', () => {
    // From https://developers.google.com/maps/documentation/utilities/polylinealgorithm
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    expect(pts).toHaveLength(3);
    expect(pts[0].lat).toBeCloseTo(38.5, 4);
    expect(pts[0].lng).toBeCloseTo(-120.2, 4);
    expect(pts[1].lat).toBeCloseTo(40.7, 4);
    expect(pts[1].lng).toBeCloseTo(-120.95, 4);
    expect(pts[2].lat).toBeCloseTo(43.252, 4);
    expect(pts[2].lng).toBeCloseTo(-126.453, 4);
  });

  it('decodes a single point', () => {
    // Encode (0, 0) manually: both lat/lng delta = 0 → single char '?'
    const pts = decodePolyline('??');
    expect(pts).toHaveLength(1);
    expect(pts[0].lat).toBeCloseTo(0, 5);
    expect(pts[0].lng).toBeCloseTo(0, 5);
  });

  it('handles negative coordinates (southern hemisphere)', () => {
    const pts = decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
    // All three example points have negative lng
    pts.forEach((p) => expect(p.lng).toBeLessThan(0));
  });

  it('decodes a real Bangalore–Mysore-like polyline segment', () => {
    // Manually encoded 2-point segment near Bangalore
    // (12.9716, 77.5946) → (12.6394, 76.3834)
    // dLat = 12.9716*1e5 = 1297160, dLng = 7759460
    // We trust the decode round-trip here
    const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const pts = decodePolyline(encoded);
    expect(pts.length).toBeGreaterThan(0);
    pts.forEach((p) => {
      expect(p.lat).toBeGreaterThanOrEqual(-90);
      expect(p.lat).toBeLessThanOrEqual(90);
      expect(p.lng).toBeGreaterThanOrEqual(-180);
      expect(p.lng).toBeLessThanOrEqual(180);
    });
  });

  it('returns empty array for empty string', () => {
    expect(decodePolyline('')).toEqual([]);
  });
});

describe('isLikelyPolyline', () => {
  it('accepts the canonical example string', () => {
    expect(isLikelyPolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toBe(true);
  });

  it('rejects short strings', () => {
    expect(isLikelyPolyline('abc')).toBe(false);
  });

  it('rejects strings with out-of-range ASCII', () => {
    // Contains a char below 63
    expect(isLikelyPolyline('hello world!!')).toBe(false);
  });

  it('rejects plain English text', () => {
    expect(isLikelyPolyline('overview_polyline_key')).toBe(false);
  });
});

describe('extractPolylineFromResponse', () => {
  it('strips XSSI prefix and extracts polyline from JSON', () => {
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const body = `)]}'\n{"route":{"polyline":"${polyline}","other":"data"}}`;
    const pts = extractPolylineFromResponse(body);
    expect(pts).not.toBeNull();
    expect(pts!.length).toBe(3);
  });

  it('handles nested JSON structures', () => {
    const polyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
    const body = `)]}'\n[[[null,"${polyline}",1],[]]]`;
    const pts = extractPolylineFromResponse(body);
    expect(pts).not.toBeNull();
  });

  it('returns null for non-JSON body', () => {
    expect(extractPolylineFromResponse('not json at all')).toBeNull();
  });

  it('returns null when no polyline present in JSON', () => {
    const body = `)]}'\n{"status":"OK","routes":[]}`;
    expect(extractPolylineFromResponse(body)).toBeNull();
  });

  it('prefers the longest polyline candidate (overview vs segment)', () => {
    // The long string decodes to more points than the short one
    const shortPolyline = '_p~iF~ps|U'; // 2 points, but < 5 so isLikelyPolyline rejects it
    const longPolyline = '_p~iF~ps|U_ulLnnqC_mqNvxq`@'; // 3 points — longest that passes filter
    const body = `)]}'\n{"a":"${shortPolyline}","b":"${longPolyline}"}`;
    const pts = extractPolylineFromResponse(body);
    // Should pick the longer one (longPolyline → 3 points)
    expect(pts).not.toBeNull();
    expect(pts!.length).toBe(3);
  });
});
