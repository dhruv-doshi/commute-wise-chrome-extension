import { createMapsAdapter } from './google-maps-adapter';
import { RouteExtractor } from './route-extractor/index';
import { OverlayRoot } from './overlay/overlay-root';
import { SidePanel } from './panel/side-panel';
import { sampleRoute } from '../shared/route-sampler';
import type { ForecastForRouteResp } from '../shared/messages';
import type { RouteInfo, RoutePolyline, WeatherAnnotation } from '../shared/types';

const adapter = createMapsAdapter();
const extractor = new RouteExtractor();
const panel = new SidePanel();
let overlay: OverlayRoot | null = null;
// Annotations buffered while the Maps DOM is not yet ready.
let pendingAnnotations: WeatherAnnotation[] | null = null;
let currentRoute: RouteInfo | null = null;
// Last successfully extracted polyline — used for departure-time refetches.
let lastPolyline: RoutePolyline | null = null;

const { ok, reason } = adapter.probe();
if (!ok) {
  console.warn(`[RNR] adapter probe failed: ${reason}. Overlay deferred until Maps DOM is ready.`);
}

/**
 * Returns the overlay, creating it lazily when the Maps container is available.
 * Returns null if `.gm-style` hasn't rendered yet — callers should tolerate this.
 */
function ensureOverlay(): OverlayRoot | null {
  if (overlay) return overlay;
  const container = adapter.getOverlayContainer();
  if (!container) return null;
  overlay = new OverlayRoot(container);
  // Flush any annotations that arrived before the container was ready.
  if (pendingAnnotations !== null) {
    overlay.setAnnotations(pendingAnnotations);
    pendingAnnotations = null;
  }
  return overlay;
}

function applyAnnotations(annotations: WeatherAnnotation[]): void {
  const ol = ensureOverlay();
  if (ol) {
    ol.setAnnotations(annotations);
  } else {
    // DOM not ready yet — buffer and apply once the overlay mounts.
    pendingAnnotations = annotations;
  }
}

function sendForecast(polyline: RoutePolyline): void {
  const samples = sampleRoute(polyline.points);
  chrome.runtime.sendMessage(
    {
      type: 'forecastForRoute',
      samples,
      departureUnix: panel.getDeparture(),
    },
    (resp: ForecastForRouteResp | null) => {
      if (chrome.runtime.lastError) {
        console.warn('[RNR] SW message error:', chrome.runtime.lastError.message);
        panel.setLoading(false);
        return;
      }
      if (!resp) { panel.setLoading(false); panel.setReloading(false); return; }
      console.log(`[RNR] forecast received — ${resp.annotations.length} annotations`);
      applyAnnotations(resp.annotations);
      if (currentRoute) panel.update(resp.results, currentRoute);
      if (!resp.results.length) {
        chrome.storage.local.get('owmApiKey', (r) => {
          panel.setNoKey(!r['owmApiKey']);
        });
      } else {
        panel.setNoKey(false);
      }
    },
  );
}

// Reload: re-read the current Maps URL (picks up any route the user changed),
// then re-extract the polyline and re-fetch the forecast.
// setReloading(true) is already set by the button handler in the panel.
panel.setOnReload(() => {
  adapter.refresh(); // fires onRouteChange → extraction → forecast automatically
});

// Refetch: reuse the last known polyline with the (possibly changed) departure time.
panel.setOnRefetch(() => {
  if (!lastPolyline) return;
  panel.setLoading(true);
  sendForecast(lastPolyline);
});

adapter.onViewportChange((vp) => {
  extractor.setViewport(vp);
  // Viewport fires once the map is rendered, so this is the right moment to
  // attempt overlay creation if it hasn't happened yet.
  const ol = ensureOverlay();
  if (ol) {
    ol.setViewport(vp);
    panel.setOverlayPaused(false);
  } else {
    panel.setOverlayPaused(true);
  }
});

adapter.onRouteChange((route) => {
  currentRoute = route;
  if (!route) {
    console.log('[RNR] no route active');
    applyAnnotations([]);
    panel.setRoute(null);
    return;
  }
  console.log(`[RNR] route: ${route.origin} → ${route.destination}`);
  panel.setRoute(route);
  panel.setLoading(true);
  extractor.extractForRoute(
    route.origin,
    route.destination,
    route.originLatLng,
    route.destinationLatLng,
  );
});

extractor.onPolyline((result) => {
  panel.setLoading(false);
  panel.setEndpointsOnly(!result);
  if (!result) {
    console.warn('[RNR] polyline extraction failed — endpoints-only mode');
    return;
  }
  console.log(`[RNR] polyline ready (${result.points.length} pts, source=${result.source})`);
  lastPolyline = result;
  sendForecast(result);
});

console.log('[RNR] content script loaded');
