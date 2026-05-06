export interface LatLng {
  lat: number;
  lng: number;
}

export interface SamplePoint extends LatLng {
  /** Cumulative distance from route start, in km. */
  distKm: number;
  /** Estimated minutes from departure when the traveller reaches this point. */
  etaMinutes: number;
}

/** How the polyline was obtained — shown in the UI when not primary. */
export type PolylineSource = 'intercept' | 'svg' | 'ors' | 'endpoints-only';

export interface RoutePolyline {
  points: LatLng[];
  source: PolylineSource;
}

export interface RouteInfo {
  origin: string;
  destination: string;
  viewportHash: string;
  /** Exact coordinates extracted from the URL data= parameter, when present. */
  originLatLng?: LatLng;
  destinationLatLng?: LatLng;
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
  /** The absolutely-positioned div rendered on top of the map canvas. Null if the Maps DOM is not ready yet. */
  getOverlayContainer(): HTMLElement | null;
  getDirectionsSidebar(): HTMLElement | null;
  /** Re-reads the current URL and fires onRouteChange listeners if the route changed. */
  refresh(): void;
  /** Quick check that required DOM elements are present. */
  probe(): { ok: boolean; reason?: string };
}

// ---------------------------------------------------------------------------
// Overlay / weather annotations
// ---------------------------------------------------------------------------

export type WeatherKind = 'rain' | 'flood' | 'heat' | 'aqi';
export type Severity = 'low' | 'medium' | 'high' | 'extreme';

export interface WeatherAnnotation {
  latLng: LatLng;
  kind: WeatherKind;
  severity: Severity;
}
