import { describe, it, expect } from 'vitest';
import { sampleRoute } from '../../src/shared/route-sampler';
import type { LatLng } from '../../src/shared/types';

/** Straight horizontal line from lng 0 to lng 1, 10 points, ~111 km total. */
const straightLine: LatLng[] = Array.from({ length: 11 }, (_, i) => ({
  lat: 0,
  lng: i * 0.1,
}));

/** L-shaped route: go east then north. */
const lShape: LatLng[] = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 1 },
  { lat: 1, lng: 1 },
];

describe('sampleRoute', () => {
  it('always includes a point at the start (distKm ≈ 0)', () => {
    const samples = sampleRoute(straightLine, 20, 12, 60);
    expect(samples[0].distKm).toBeCloseTo(0, 3);
  });

  it('always includes a point at the end (distKm ≈ total distance)', () => {
    const samples = sampleRoute(straightLine, 20, 12, 60);
    const last = samples[samples.length - 1];
    const secondLast = straightLine[straightLine.length - 2];
    // The last sample should be at or near the end of the route
    expect(last.lat).toBeCloseTo(straightLine[straightLine.length - 1].lat, 3);
    expect(last.lng).toBeCloseTo(straightLine[straightLine.length - 1].lng, 3);
    void secondLast; // suppress unused warning
  });

  it('respects maxSamples cap', () => {
    const samples = sampleRoute(straightLine, 1, 5, 60);
    expect(samples.length).toBeLessThanOrEqual(5);
  });

  it('returns at least 2 samples for a multi-point route', () => {
    const samples = sampleRoute(straightLine, 1000, 12, 60);
    expect(samples.length).toBeGreaterThanOrEqual(2);
  });

  it('assigns increasing distKm values', () => {
    const samples = sampleRoute(straightLine, 20, 12, 60);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].distKm).toBeGreaterThanOrEqual(samples[i - 1].distKm);
    }
  });

  it('assigns increasing etaMinutes values', () => {
    const samples = sampleRoute(straightLine, 20, 12, 60);
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i].etaMinutes).toBeGreaterThanOrEqual(samples[i - 1].etaMinutes);
    }
  });

  it('first sample has etaMinutes ≈ 0 and last has etaMinutes ≈ totalEtaMinutes', () => {
    const samples = sampleRoute(straightLine, 20, 12, 90);
    expect(samples[0].etaMinutes).toBeCloseTo(0, 1);
    expect(samples[samples.length - 1].etaMinutes).toBeCloseTo(90, 1);
  });

  it('handles an L-shaped route without crashing', () => {
    const samples = sampleRoute(lShape, 50, 12, 120);
    expect(samples.length).toBeGreaterThanOrEqual(2);
    samples.forEach((s) => {
      expect(s.lat).toBeGreaterThanOrEqual(0);
      expect(s.lng).toBeGreaterThanOrEqual(0);
    });
  });

  it('handles a single-point route', () => {
    const samples = sampleRoute([{ lat: 12, lng: 77 }], 5, 12, 30);
    expect(samples).toHaveLength(1);
    expect(samples[0].distKm).toBe(0);
    expect(samples[0].etaMinutes).toBe(0);
  });

  it('handles empty input', () => {
    expect(sampleRoute([], 5, 12, 30)).toEqual([]);
  });

  it('sample lat/lng are within the bounding box of the input polyline', () => {
    const samples = sampleRoute(lShape, 20, 12, 60);
    const lats = lShape.map((p) => p.lat);
    const lngs = lShape.map((p) => p.lng);
    samples.forEach((s) => {
      expect(s.lat).toBeGreaterThanOrEqual(Math.min(...lats) - 0.001);
      expect(s.lat).toBeLessThanOrEqual(Math.max(...lats) + 0.001);
      expect(s.lng).toBeGreaterThanOrEqual(Math.min(...lngs) - 0.001);
      expect(s.lng).toBeLessThanOrEqual(Math.max(...lngs) + 0.001);
    });
  });
});
