import { describe, it, expect } from 'vitest';
import { parseDirectionsUrl, parseViewport } from '../../src/content/google-maps-adapter';

const BASE = 'https://www.google.com';

describe('parseDirectionsUrl', () => {
  it('parses a simple route', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/Bangalore/Mysore/@12.6394,76.3834,9z`);
    expect(r).toEqual({ origin: 'Bangalore', destination: 'Mysore', viewportHash: '12.6394,76.3834,9' });
  });

  it('parses URL with trailing /data= segment', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/Bangalore/Mysore/@12.6394,76.3834,9z/data=!4m2!4m1!3e0`);
    expect(r).not.toBeNull();
    expect(r?.origin).toBe('Bangalore');
    expect(r?.destination).toBe('Mysore');
  });

  it('decodes plus-encoded spaces', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/New+York,+NY/Los+Angeles,+CA/@34.0522,-118.2437,8z`);
    expect(r?.origin).toBe('New York, NY');
    expect(r?.destination).toBe('Los Angeles, CA');
  });

  it('decodes percent-encoded characters', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/M%C3%BCnchen/N%C3%BCrnberg/@49.4521,11.0767,10z`);
    expect(r?.origin).toBe('München');
    expect(r?.destination).toBe('Nürnberg');
  });

  it('handles negative (southern hemisphere) coordinates', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/Sydney/Melbourne/@-37.8136,144.9631,8z`);
    expect(r).not.toBeNull();
    expect(r?.viewportHash).toBe('-37.8136,144.9631,8');
  });

  it('handles high zoom level', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/A/B/@12.9716,77.5946,20z`);
    expect(r?.viewportHash).toContain('20');
  });

  it('handles decimal zoom level', () => {
    const r = parseDirectionsUrl(`${BASE}/maps/dir/A/B/@12.9716,77.5946,14.5z`);
    expect(r?.viewportHash).toContain('14.5');
  });

  it('returns null for a maps URL without a route', () => {
    expect(parseDirectionsUrl(`${BASE}/maps/@12.9716,77.5946,15z`)).toBeNull();
  });

  it('returns null for the Maps homepage', () => {
    expect(parseDirectionsUrl(`${BASE}/maps`)).toBeNull();
  });

  it('returns null for an invalid URL string', () => {
    expect(parseDirectionsUrl('not-a-url')).toBeNull();
  });
});

describe('parseViewport', () => {
  it('extracts lat, lng, zoom from a route URL', () => {
    const vp = parseViewport(`${BASE}/maps/dir/A/B/@12.9716,77.5946,14z`);
    expect(vp).toEqual({ lat: 12.9716, lng: 77.5946, zoom: 14 });
  });

  it('extracts viewport from a non-route Maps URL', () => {
    const vp = parseViewport(`${BASE}/maps/@48.8566,2.3522,13z`);
    expect(vp).toEqual({ lat: 48.8566, lng: 2.3522, zoom: 13 });
  });

  it('returns null when no @lat,lng,zoom is present', () => {
    expect(parseViewport(`${BASE}/maps`)).toBeNull();
  });
});
