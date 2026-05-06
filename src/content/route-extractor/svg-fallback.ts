/**
 * SVG-path fallback: reads the rendered route polyline from the Maps SVG layer
 * and inverse-projects pixel coordinates back to lat/lng via Web Mercator.
 */

import type { LatLng, Viewport } from '../../shared/types';
import { pixelToLatLng } from '../overlay/projection';

// Google Maps renders the selected route as a blue stroke.
// The polyline SVG path is typically the longest path element in the map SVG.
const MAP_SVG_SEL = '.gm-style svg';
const MIN_POINTS = 10;

/** Parses an SVG path `d` attribute and returns the absolute pixel coordinates of each point. */
function parseSvgPath(d: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];

  // Normalize: only care about M (moveto) and L (lineto) absolute commands.
  // Google Maps SVG uses only M and L for the route polyline.
  const RE = /([ML])\s*([-\d.]+)[,\s]+([-\d.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = RE.exec(d)) !== null) {
    points.push({ x: Number(m[2]), y: Number(m[3]) });
  }
  return points;
}

/**
 * Converts SVG-element pixel coordinates to container-relative pixel offsets,
 * then to lat/lng via the Mercator inverse.
 *
 * The SVG element's `viewBox` may differ from its rendered size, so we apply
 * the CTM (current transform matrix) from the SVG root to get screen pixels,
 * then subtract the map container's bounding rect to get container-relative coords.
 */
function svgPointsToLatLng(
  rawPoints: Array<{ x: number; y: number }>,
  svgEl: SVGSVGElement,
  mapContainerRect: DOMRect,
  viewport: Viewport,
  containerSize: { w: number; h: number },
): LatLng[] {
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return [];

  return rawPoints.map(({ x, y }) => {
    // Transform from SVG user units → screen pixels
    const screenX = ctm.a * x + ctm.c * y + ctm.e;
    const screenY = ctm.b * x + ctm.d * y + ctm.f;

    // Container-relative pixels
    const cx = screenX - mapContainerRect.left;
    const cy = screenY - mapContainerRect.top;

    return pixelToLatLng({ x: cx, y: cy }, viewport, containerSize);
  });
}

export function extractPolylineFromSvg(viewport: Viewport): LatLng[] | null {
  const svgEls = document.querySelectorAll<SVGSVGElement>(MAP_SVG_SEL);
  if (svgEls.length === 0) return null;

  // The map container is the first .gm-style ancestor of any of the SVGs.
  const mapContainer = svgEls[0].closest<HTMLElement>('.gm-style');
  if (!mapContainer) return null;

  const containerRect = mapContainer.getBoundingClientRect();
  const containerSize = { w: containerRect.width, h: containerRect.height };

  let best: LatLng[] | null = null;

  for (const svg of svgEls) {
    const paths = svg.querySelectorAll<SVGPathElement>('path');
    for (const path of paths) {
      const d = path.getAttribute('d');
      if (!d) continue;

      const rawPoints = parseSvgPath(d);
      if (rawPoints.length < MIN_POINTS) continue;

      const latLngs = svgPointsToLatLng(rawPoints, svg, containerRect, viewport, containerSize);
      if (latLngs.length > (best?.length ?? 0)) {
        best = latLngs;
      }
    }
  }

  return best && best.length >= MIN_POINTS ? best : null;
}
