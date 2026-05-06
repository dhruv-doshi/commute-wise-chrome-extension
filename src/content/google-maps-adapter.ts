/**
 * The ONLY file that knows Google Maps' DOM selectors and URL shape.
 * If a Maps update breaks things, start here.
 */

import type { MapsAdapter, RouteInfo, Viewport } from '../shared/types';

// Isolate every Maps-specific selector here.
const SEL = {
  mapRoot: '.gm-style',
  sidebar: '[data-trip-id], [role="main"] [data-value]',
} as const;

const OVERLAY_ID = 'rnr-overlay';

// ---------------------------------------------------------------------------
// URL parsing — primary source of route + viewport data
// ---------------------------------------------------------------------------

/** Exported for unit tests. */
export function parseDirectionsUrl(url: string): RouteInfo | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  // /maps/dir/<origin>/<destination>/@<lat>,<lng>,<zoom>z[/...]
  const m = pathname.match(
    /^\/maps\/dir\/([^/@]+)\/([^/@]+)\/@(-?[\d.]+),(-?[\d.]+),([\d.]+)z/,
  );
  if (!m) return null;

  const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, ' ')).trim();
  return {
    origin: decode(m[1]),
    destination: decode(m[2]),
    viewportHash: `${m[3]},${m[4]},${m[5]}`,
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
// History API watcher
// ---------------------------------------------------------------------------

function watchHistory(onChange: () => void): () => void {
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args) {
    origPush(...args);
    onChange();
  };
  history.replaceState = function (...args) {
    origReplace(...args);
    onChange();
  };

  window.addEventListener('popstate', onChange);

  return () => {
    history.pushState = origPush;
    history.replaceState = origReplace;
    window.removeEventListener('popstate', onChange);
  };
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
  let overlayEl: HTMLElement | null = null;

  const emitViewport = makeViewportEmitter((vp) => {
    viewportListeners.forEach((cb) => cb(vp));
    window.dispatchEvent(new CustomEvent('rnr:viewportchange', { detail: vp }));
  });

  function onUrlChange() {
    const url = location.href;
    const route = parseDirectionsUrl(url);
    const hash = route ? `${route.origin}|${route.destination}` : null;

    if (hash !== lastRouteHash) {
      lastRouteHash = hash;
      routeListeners.forEach((cb) => cb(route));
      // Dispatch for E2E tests to observe
      window.dispatchEvent(new CustomEvent('rnr:routechange', { detail: route }));
    }

    emitViewport();
  }

  const stopHistory = watchHistory(onUrlChange);
  window.addEventListener('pagehide', stopHistory, { once: true });
  // Fire once for the current URL (page may already show a route on load)
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
      return () => routeListeners.delete(cb);
    },
    onViewportChange(cb) {
      viewportListeners.add(cb);
      return () => viewportListeners.delete(cb);
    },
    getOverlayContainer() {
      return ensureOverlay() ?? (() => { throw new Error('[RNR] overlay container not ready'); })();
    },
    getDirectionsSidebar() {
      return document.querySelector<HTMLElement>(SEL.sidebar);
    },
    probe() {
      if (!document.querySelector(SEL.mapRoot)) {
        return { ok: false, reason: `${SEL.mapRoot} not found — Google Maps update?` };
      }
      return { ok: true };
    },
  };
}
