/**
 * Web Mercator projection helpers.
 * All functions are pure — no DOM access, no side effects.
 */

import type { LatLng, Viewport } from '../../shared/types';

export interface ContainerSize {
  w: number;
  h: number;
}

export interface Pixel {
  x: number;
  y: number;
}

// Google Maps uses 256 px tiles at zoom 0.
const TILE_SIZE = 256;

function toWorldPixel(lat: number, lng: number, zoom: number): Pixel {
  const scale = Math.pow(2, zoom) * TILE_SIZE;
  const x = ((lng + 180) / 360) * scale;
  const sinLat = Math.sin((lat * Math.PI) / 180);
  // Clamp sinLat away from ±1 to avoid ln(0).
  const clamped = Math.max(-0.9999, Math.min(0.9999, sinLat));
  const y = (0.5 - Math.log((1 + clamped) / (1 - clamped)) / (4 * Math.PI)) * scale;
  return { x, y };
}

/**
 * Maps a geographic coordinate to a pixel position relative to the top-left
 * corner of the overlay container.
 */
export function latLngToPixel(latLng: LatLng, viewport: Viewport, size: ContainerSize): Pixel {
  const center = toWorldPixel(viewport.lat, viewport.lng, viewport.zoom);
  const point = toWorldPixel(latLng.lat, latLng.lng, viewport.zoom);
  return {
    x: size.w / 2 + (point.x - center.x),
    y: size.h / 2 + (point.y - center.y),
  };
}

/**
 * Inverse of latLngToPixel — maps a pixel offset back to a geographic coordinate.
 */
export function pixelToLatLng(px: Pixel, viewport: Viewport, size: ContainerSize): LatLng {
  const scale = Math.pow(2, viewport.zoom) * TILE_SIZE;
  const center = toWorldPixel(viewport.lat, viewport.lng, viewport.zoom);

  const worldX = center.x + (px.x - size.w / 2);
  const worldY = center.y + (px.y - size.h / 2);

  const lng = (worldX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * worldY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lat, lng };
}
