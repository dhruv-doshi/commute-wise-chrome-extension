import { describe, it, expect } from 'vitest';
import { latLngToPixel, pixelToLatLng } from '../../src/content/overlay/projection';
import type { Viewport } from '../../src/shared/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0x100000000;
  };
}

// ---------------------------------------------------------------------------
// Round-trip: latLngToPixel → pixelToLatLng must recover the original LatLng
// within 1 px of error at the given zoom level.
// ---------------------------------------------------------------------------

describe('projection round-trip', () => {
  const rand = rng(42);
  const SIZE = { w: 800, h: 600 };

  const cases: Array<{ lat: number; lng: number; zoom: number }> = [];
  for (let i = 0; i < 200; i++) {
    // lat: ±75° (Mercator degrades near the poles; commuter use-case)
    const lat = (rand() * 2 - 1) * 75;
    const lng = (rand() * 2 - 1) * 180;
    const zoom = 5 + Math.floor(rand() * 14); // zoom 5–18
    cases.push({ lat, lng, zoom });
  }

  for (const { lat, lng, zoom } of cases) {
    it(`round-trips lat=${lat.toFixed(3)} lng=${lng.toFixed(3)} zoom=${zoom}`, () => {
      const viewport: Viewport = { lat: 0, lng: 0, zoom };
      const px = latLngToPixel({ lat, lng }, viewport, SIZE);
      const recovered = pixelToLatLng(px, viewport, SIZE);

      // Convert the allowable 1px error back to degrees at this zoom.
      // At zoom z, 256*2^z px spans 360° of longitude.
      const degPerPixel = 360 / (256 * Math.pow(2, zoom));
      expect(Math.abs(recovered.lat - lat)).toBeLessThan(degPerPixel);
      expect(Math.abs(recovered.lng - lng)).toBeLessThan(degPerPixel);
    });
  }
});

// ---------------------------------------------------------------------------
// Known anchor points
// ---------------------------------------------------------------------------

describe('latLngToPixel anchor points', () => {
  const SIZE = { w: 800, h: 600 };

  it('center of viewport maps to the center of the container', () => {
    const viewport: Viewport = { lat: 20, lng: 77, zoom: 10 };
    const px = latLngToPixel({ lat: 20, lng: 77 }, viewport, SIZE);
    expect(px.x).toBeCloseTo(400, 3);
    expect(px.y).toBeCloseTo(300, 3);
  });

  it('point east of center is right of center pixel', () => {
    const viewport: Viewport = { lat: 0, lng: 0, zoom: 5 };
    const px = latLngToPixel({ lat: 0, lng: 10 }, viewport, SIZE);
    expect(px.x).toBeGreaterThan(SIZE.w / 2);
    expect(px.y).toBeCloseTo(SIZE.h / 2, 2);
  });

  it('point north of center is above center pixel', () => {
    const viewport: Viewport = { lat: 0, lng: 0, zoom: 5 };
    const px = latLngToPixel({ lat: 10, lng: 0 }, viewport, SIZE);
    expect(px.x).toBeCloseTo(SIZE.w / 2, 2);
    expect(px.y).toBeLessThan(SIZE.h / 2);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('projection edge cases', () => {
  const SIZE = { w: 600, h: 400 };

  it('handles negative latitude (southern hemisphere)', () => {
    const viewport: Viewport = { lat: 0, lng: 0, zoom: 8 };
    const px = latLngToPixel({ lat: -33.87, lng: 151.21 }, viewport, SIZE);
    const recovered = pixelToLatLng(px, viewport, SIZE);
    expect(recovered.lat).toBeCloseTo(-33.87, 2);
    expect(recovered.lng).toBeCloseTo(151.21, 2);
  });

  it('handles lat=0 lng=0 (null island)', () => {
    const viewport: Viewport = { lat: 0, lng: 0, zoom: 10 };
    const px = latLngToPixel({ lat: 0, lng: 0 }, viewport, SIZE);
    expect(px.x).toBeCloseTo(300, 3);
    expect(px.y).toBeCloseTo(200, 3);
  });

  it('handles high zoom level (18)', () => {
    const viewport: Viewport = { lat: 12.97, lng: 77.59, zoom: 18 };
    const px = latLngToPixel({ lat: 12.97, lng: 77.59 }, viewport, SIZE);
    const recovered = pixelToLatLng(px, viewport, SIZE);
    expect(recovered.lat).toBeCloseTo(12.97, 4);
    expect(recovered.lng).toBeCloseTo(77.59, 4);
  });

  it('handles low zoom level (1)', () => {
    const viewport: Viewport = { lat: 0, lng: 0, zoom: 1 };
    const px = latLngToPixel({ lat: 45, lng: 90 }, viewport, SIZE);
    const recovered = pixelToLatLng(px, viewport, SIZE);
    expect(recovered.lat).toBeCloseTo(45, 2);
    expect(recovered.lng).toBeCloseTo(90, 2);
  });
});
