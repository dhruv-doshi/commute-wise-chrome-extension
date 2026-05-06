export interface RouteInfo {
  origin: string;
  destination: string;
  viewportHash: string;
}

export interface Viewport {
  lat: number;
  lng: number;
  zoom: number;
}

/** Contract between the adapter and the rest of the app. */
export interface MapsAdapter {
  /** Returns an unsubscribe function. Fires with null when no route is loaded. */
  onRouteChange(cb: (r: RouteInfo | null) => void): () => void;
  onViewportChange(cb: (v: Viewport) => void): () => void;
  /** The absolutely-positioned div rendered on top of the map canvas. */
  getOverlayContainer(): HTMLElement;
  getDirectionsSidebar(): HTMLElement | null;
  /** Quick check that required DOM elements are present. */
  probe(): { ok: boolean; reason?: string };
}
