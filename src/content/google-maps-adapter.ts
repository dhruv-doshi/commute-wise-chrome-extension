/**
 * The ONLY file that knows Google Maps' DOM selectors and URL shape.
 * If a Maps update breaks things, start here.
 */

import type { LatLng, MapsAdapter, RouteInfo, Viewport } from '../shared/types';

// Isolate every Maps-specific selector here.
const SEL = {
  mapRoot: '.gm-style',
  sidebar: '[data-trip-id], [role="main"] [data-value]',
} as const;

const OVERLAY_ID = 'rnr-overlay';

// ---------------------------------------------------------------------------
// URL parsing — primary source of route + viewport data
// ---------------------------------------------------------------------------

/**
 * Parses the Google Maps `data=` parameter to extract origin/destination LatLng.
 * Pattern: `!1d<lng>!2d<lat>` appears once per waypoint (origin first, dest second).
 * Exported for unit tests.
 */
export function parseDataParamCoords(dataParam: string): [LatLng, LatLng] | null {
  const RE = /!1d(-?[\d.]+)!2d(-?[\d.]+)/g;
  const matches: LatLng[] = [];
  let m: RegExpExecArray | null;
  while ((m = RE.exec(dataParam)) !== null) {
    matches.push({ lat: Number(m[2]), lng: Number(m[1]) });
  }
  if (matches.length < 2) return null;
  return [matches[0], matches[matches.length - 1]];
}

/** Exported for unit tests. */
export function parseDirectionsUrl(url: string): RouteInfo | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  // Non-greedy match so via:waypoint segments in the middle are captured too.
  // Pattern: /maps/dir/<one-or-more-segments>/@lat,lng,zoomz
  const m = parsed.pathname.match(
    /^\/maps\/dir\/(.+?)\/@(-?[\d.]+),(-?[\d.]+),([\d.]+)z/,
  );
  if (!m) return null;

  const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, ' ')).trim();

  // First segment = origin, last segment = destination; everything in between is via points.
  const segments = m[1].split('/').map(decode).filter(Boolean);
  if (segments.length < 2) return null;

  const dataParam = parsed.searchParams.get('data') ?? parsed.pathname.match(/\/data=([^?]+)/)?.[1] ?? '';
  const coords = parseDataParamCoords(dataParam);

  return {
    origin: segments[0],
    destination: segments[segments.length - 1],
    viewportHash: `${m[2]},${m[3]},${m[4]}`,
    originLatLng: coords?.[0],
    destinationLatLng: coords?.[1],
  };
}

/** Exported for unit tests. */
export function parseViewport(url: string): Viewport | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const m = pathname.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)z/);
  if (!m) return null;
  return { lat: Number(m[1]), lng: Number(m[2]), zoom: Number(m[3]) };
}

// ---------------------------------------------------------------------------
// Overlay container
// ---------------------------------------------------------------------------

function getOrCreateOverlay(): HTMLElement | null {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;

  const mapRoot = document.querySelector<HTMLElement>(SEL.mapRoot);
  if (!mapRoot) return null;

  const el = document.createElement('div');
  el.id = OVERLAY_ID;
  el.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100;overflow:hidden';
  mapRoot.style.position = 'relative'; // ensure anchor for absolute children
  mapRoot.appendChild(el);
  return el;
}

// Re-mount overlay if Google removes it (e.g. after a Maps re-render).
function watchOverlayRemoval(getOverlay: () => HTMLElement | null): () => void {
  const observer = new MutationObserver(() => {
    if (!document.getElementById(OVERLAY_ID)) {
      getOverlay();
    }
  });
  const mapRoot = document.querySelector(SEL.mapRoot);
  if (mapRoot) {
    observer.observe(mapRoot, { childList: true, subtree: true });
  }
  return () => observer.disconnect();
}

// ---------------------------------------------------------------------------
// Throttled viewport change (rAF + 100 ms idle floor)
// ---------------------------------------------------------------------------

function makeViewportEmitter(cb: (v: Viewport) => void): () => void {
  let rafId: ReturnType<typeof requestAnimationFrame> | null = null;
  let lastFire = 0;

  return function emit() {
    if (rafId !== null) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      const now = Date.now();
      if (now - lastFire < 100) return;
      lastFire = now;
      const vp = parseViewport(location.href);
      if (vp) cb(vp);
    });
  };
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------

export function createMapsAdapter(): MapsAdapter {
  const routeListeners = new Set<(r: RouteInfo | null) => void>();
  const viewportListeners = new Set<(v: Viewport) => void>();

  let lastRouteHash: string | null = null;
  let lastRoute: RouteInfo | null = null;
  let overlayEl: HTMLElement | null = null;

  const emitViewport = makeViewportEmitter((vp) => {
    viewportListeners.forEach((cb) => cb(vp));
    window.dispatchEvent(new CustomEvent('rnr:viewportchange', { detail: vp }));
  });

  function onUrlChange() {
    const url = location.href;
    const route = parseDirectionsUrl(url);
    // Include rounded viewport lat/lng (1° precision ≈ 111 km) so that routes in
    // different cities never collide even when origin/destination text is identical.
    const vpParts = route?.viewportHash.split(',');
    const cityVp = vpParts
      ? `${Math.round(Number(vpParts[0]))}|${Math.round(Number(vpParts[1]))}`
      : '';
    const hash = route ? `${route.origin}|${route.destination}|${cityVp}` : null;

    if (hash !== lastRouteHash) {
      lastRouteHash = hash;
      lastRoute = route;
      routeListeners.forEach((cb) => cb(route));
      // Dispatch for E2E tests to observe
      window.dispatchEvent(new CustomEvent('rnr:routechange', { detail: route }));
    }

    emitViewport();
  }

  // Read the route once from the current URL on load.
  onUrlChange();

  // Lazily mount the overlay (Maps may not be fully rendered yet)
  function ensureOverlay(): HTMLElement | null {
    if (!overlayEl || !document.getElementById(OVERLAY_ID)) {
      overlayEl = getOrCreateOverlay();
    }
    return overlayEl;
  }

  // Wait for .gm-style to appear if it isn't present yet
  const overlayObserver = new MutationObserver(() => {
    if (document.querySelector(SEL.mapRoot)) {
      overlayObserver.disconnect();
      overlayEl = getOrCreateOverlay();
      watchOverlayRemoval(ensureOverlay);
    }
  });
  if (!document.querySelector(SEL.mapRoot)) {
    overlayObserver.observe(document.body, { childList: true, subtree: true });
  } else {
    overlayEl = getOrCreateOverlay();
    watchOverlayRemoval(ensureOverlay);
  }

  return {
    onRouteChange(cb) {
      routeListeners.add(cb);
      // Replay current route so listeners registered after page-load still fire.
      if (lastRouteHash !== null) cb(lastRoute);
      return () => routeListeners.delete(cb);
    },
    onViewportChange(cb) {
      viewportListeners.add(cb);
      return () => viewportListeners.delete(cb);
    },
    getOverlayContainer() {
      return ensureOverlay();
    },
    getDirectionsSidebar() {
      return document.querySelector<HTMLElement>(SEL.sidebar);
    },
    refresh() {
      // Force re-read of the current URL — used by the Reload button so the
      // extension picks up a route the user changed in Maps since last load.
      lastRouteHash = null; // clear dedup so the current URL always fires
      onUrlChange();
    },
    probe() {
      if (!document.querySelector(SEL.mapRoot)) {
        return { ok: false, reason: `${SEL.mapRoot} not found — Google Maps update?` };
      }
      return { ok: true };
    },
  };
}
