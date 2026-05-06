/**
 * Typed message contracts between the content script and the service worker.
 * Every message has a `type` discriminant and a typed `payload` / response.
 */

import type { LatLng, SamplePoint, Severity, WeatherAnnotation } from './types';

// ---------------------------------------------------------------------------
// OWM 2.5 forecast API — raw response shape
// Uses data/2.5/forecast (free tier, no subscription required).
// ---------------------------------------------------------------------------

/** One 3-hour slot from the OWM 2.5 /forecast endpoint. */
export interface Owm25ForecastItem {
  dt: number;
  main: {
    temp: number;      // Kelvin
    humidity: number;  // %
  };
  weather: Array<{ id: number; main: string; description?: string }>;
  rain?: { '3h'?: number };  // mm in last 3 hours
  pop: number;               // probability of precipitation 0–1
}

export interface Owm25ForecastResponse {
  list: Owm25ForecastItem[];
}

// ---------------------------------------------------------------------------
// Normalised internal hourly type (used by weather-risk, stored in cache).
// Rain is always expressed as mm/h for consistent threshold comparisons.
// ---------------------------------------------------------------------------

export interface OwmHourly {
  dt: number;
  temp: number;      // Kelvin
  humidity: number;  // %
  weather: Array<{ id: number; main: string; description?: string }>;
  rain?: { '1h'?: number };  // mm/h (normalised from raw API)
  pop: number;
}

// ---------------------------------------------------------------------------
// Risk profile — output of weather-risk.ts
// ---------------------------------------------------------------------------

export interface RiskProfile {
  rain: Severity;
  flood: Severity;
  heat: Severity;
  aqi: Severity;
}

// ---------------------------------------------------------------------------
// Forecast result — what the SW returns per sample point
// ---------------------------------------------------------------------------

/** Raw metric values at the matched forecast slot — drives the pill detail popup. */
export interface ForecastRaw {
  tempKelvin: number;
  rainMmh: number;    // mm/h
  humidity: number;   // %
  pop: number;        // 0–1
  weatherDesc: string; // e.g. "light rain", "clear sky"
}

export interface ForecastResult {
  latLng: LatLng;
  etaMinutes: number;
  risk: RiskProfile;
  raw: ForecastRaw;
  /** True when the cached value is older than the current hourBucket. */
  stale: boolean;
}

// ---------------------------------------------------------------------------
// Messages: content script → service worker
// ---------------------------------------------------------------------------

export interface ForecastForRouteMsg {
  type: 'forecastForRoute';
  samples: SamplePoint[];
  /** Unix timestamp (seconds) of planned departure. Default: now. */
  departureUnix: number;
}

export interface ForecastAtMsg {
  type: 'forecastAt';
  latLng: LatLng;
  atUnixHour: number;
}

export type ContentToSwMsg = ForecastForRouteMsg | ForecastAtMsg;

// ---------------------------------------------------------------------------
// Responses: service worker → content script
// ---------------------------------------------------------------------------

export interface ForecastForRouteResp {
  annotations: WeatherAnnotation[];
  results: ForecastResult[];
}

export interface ForecastAtResp {
  risk: RiskProfile;
  stale: boolean;
}
