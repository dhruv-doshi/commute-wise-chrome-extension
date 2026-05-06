/**
 * Orchestrates the three-tier polyline extraction ladder:
 *  1. Primary: fetch/XHR intercept via the MAIN-world injector
 *  2. SVG fallback (Phase 2)
 *  3. ORS fallback (Phase 3, optional — requires user key)
 *  4. Endpoints-only (emits null polyline + banner)
 */

import { extractPolylineFromResponse } from './polyline-decoder';
import { extractPolylineFromDom } from './dom-scan';
import { extractPolylineFromSvg } from './svg-fallback';
import { fetchPolylineFromOrs } from './ors-fallback';
import { fetchPolylineFromOsrm } from './osrm-fallback';
import type { LatLng, RoutePolyline, Viewport } from '../../shared/types';

const INTERCEPT_TIMEOUT_MS = 5_000;
const MSG_TYPE = 'rnr:raw-directions';

type PolylineCallback = (result: RoutePolyline | null) => void;

export class RouteExtractor {
  private listeners = new Set<PolylineCallback>();
  private lastPoints: LatLng[] | null = null;
  private currentViewport: Viewport | null = null;

  constructor() {
    this.setupMessageListener();
    // Ask the MAIN world for any already-buffered response
    window.postMessage({ type: 'rnr:request-buffered' }, '*');
  }

  /** Called by the adapter when viewport changes (needed for SVG fallback). */
  setViewport(vp: Viewport): void {
    this.currentViewport = vp;
  }

  /**
   * Called by the adapter when a new route is detected.
   * Ladder: dom-scan → SW/XHR intercept → SVG (Phase 2) → OSRM → ORS → endpoints-only.
   */
  async extractForRoute(
    origin: string,
    destination: string,
    originLatLng?: LatLng,
    destinationLatLng?: LatLng,
  ): Promise<void> {
    // 1a. DOM scan — catches routes embedded in inline <script> tags on page load.
    const domPoints = extractPolylineFromDom();
    if (domPoints) {
      this.emit({ points: domPoints, source: 'intercept' });
      return;
    }

    // 1b. Wait for MAIN-world injector (fetch/XHR or SW message channel).
    const intercepted = await this.waitForIntercept();
    if (intercepted) {
      this.emit({ points: intercepted, source: 'intercept' });
      return;
    }

    // 2. SVG fallback — reads Google's rendered polyline. Implemented in Phase 2.
    if (this.currentViewport) {
      const svgPoints = extractPolylineFromSvg(this.currentViewport);
      if (svgPoints) {
        this.emit({ points: svgPoints, source: 'svg' });
        return;
      }
    }

    // 3a. OSRM — free, no API key. Uses exact coordinates from the URL's data= param.
    if (originLatLng && destinationLatLng) {
      console.log('[RNR] trying OSRM fallback...');
      const osrmPoints = await fetchPolylineFromOsrm(originLatLng, destinationLatLng);
      if (osrmPoints) {
        this.emit({ points: osrmPoints, source: 'ors' });
        return;
      }
    }

    // 3b. ORS fallback (user-provided key, wired in Phase 3).
    const orsPoints = await fetchPolylineFromOrs(origin, destination);
    if (orsPoints) {
      this.emit({ points: orsPoints, source: 'ors' });
      return;
    }

    // 4. Endpoints-only.
    this.emit(null);
  }

  onPolyline(cb: PolylineCallback): () => void {
    this.listeners.add(cb);
    // Replay last result immediately if we already have one
    if (this.lastPoints !== null) {
      cb({ points: this.lastPoints, source: 'intercept' });
    }
    return () => this.listeners.delete(cb);
  }

  private emit(result: RoutePolyline | null): void {
    this.lastPoints = result?.points ?? null;
    window.dispatchEvent(new CustomEvent('rnr:polyline', { detail: result }));
    this.listeners.forEach((cb) => cb(result));
  }

  private waitForIntercept(): Promise<LatLng[] | null> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        window.removeEventListener('message', handler);
        resolve(null);
      }, INTERCEPT_TIMEOUT_MS);

      function handler(event: MessageEvent) {
        if (event.source !== window) return;
        if (event.data?.type !== MSG_TYPE) return;

        // Keep listening until we get a response that actually contains a polyline.
        // Google Maps sends many requests; we want the one with route geometry.
        const points = extractPolylineFromResponse(event.data.body as string);
        if (!points) return;

        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve(points);
      }

      window.addEventListener('message', handler);
    });
  }

  private setupMessageListener(): void {
    // Also listen for future postMessages (route changes while Maps stays open)
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.data?.type !== MSG_TYPE) return;
      const points = extractPolylineFromResponse(event.data.body as string);
      if (points && points.length > (this.lastPoints?.length ?? 0)) {
        this.emit({ points, source: 'intercept' });
      }
    });
  }
}
