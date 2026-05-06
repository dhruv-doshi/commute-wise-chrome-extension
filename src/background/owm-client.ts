/**
 * OWM 2.5 forecast client with in-memory token bucket and persistent cache.
 * Uses data/2.5/forecast (free tier, no subscription step required).
 * Dependencies are injected for testability without Chrome globals or IndexedDB.
 */

import { cacheKey, currentHourBucket } from '../shared/cache-key';
import { riskAtTime, hourlyAtTime } from '../shared/weather-risk';
import type { LatLng, Severity, SamplePoint, WeatherAnnotation, WeatherKind } from '../shared/types';
import type {
  ForecastForRouteResp,
  ForecastRaw,
  ForecastResult,
  Owm25ForecastItem,
  Owm25ForecastResponse,
  OwmHourly,
  RiskProfile,
} from '../shared/messages';

// ---------------------------------------------------------------------------
// Cache entry — stores the normalised hourly array, not the raw API shape.
// ---------------------------------------------------------------------------

export interface NormalisedForecast {
  hourly: OwmHourly[];
}

export interface CacheEntry {
  data: NormalisedForecast;
  hourBucket: number;
}

// ---------------------------------------------------------------------------
// Dependency injection interface
// ---------------------------------------------------------------------------

export interface OwmClientDeps {
  fetchFn: typeof fetch;
  getCached: (key: string) => Promise<CacheEntry | undefined>;
  putCached: (key: string, entry: CacheEntry) => Promise<void>;
  getApiKey: () => Promise<string | null>;
  /** ms — injectable for tests. Defaults to Date.now. */
  now?: () => number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// OWM 2.5 forecast: 5-day / 3-hour slots. Free tier, no activation required.
const OWM_BASE = 'https://api.openweathermap.org/data/2.5/forecast';
const BUCKET_CAPACITY = 60;
const REFILL_INTERVAL_MS = 60_000;
const SEVERITY_ORDER: Record<Severity, number> = { low: 0, medium: 1, high: 2, extreme: 3 };

// ---------------------------------------------------------------------------
// Normalisation: raw OWM 2.5 item → internal OwmHourly
// ---------------------------------------------------------------------------

function normaliseItem(item: Owm25ForecastItem): OwmHourly {
  return {
    dt: item.dt,
    temp: item.main.temp,
    humidity: item.main.humidity,
    weather: item.weather,
    pop: item.pop,
    // 2.5 API reports rain in mm over 3 h; convert to mm/h for consistent thresholds.
    rain: item.rain?.['3h'] !== undefined ? { '1h': item.rain['3h'] / 3 } : undefined,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dominantKind(risk: RiskProfile): { kind: WeatherKind; severity: Severity } {
  const axes: Array<{ kind: WeatherKind; sev: Severity }> = [
    { kind: 'rain',  sev: risk.rain  },
    { kind: 'flood', sev: risk.flood },
    { kind: 'heat',  sev: risk.heat  },
    { kind: 'aqi',   sev: risk.aqi   },
  ];
  axes.sort((a, b) => SEVERITY_ORDER[b.sev] - SEVERITY_ORDER[a.sev]);
  return { kind: axes[0].kind, severity: axes[0].sev };
}

// ---------------------------------------------------------------------------
// OwmClient
// ---------------------------------------------------------------------------

export class OwmClient {
  private deps: Required<OwmClientDeps>;
  private tokens = BUCKET_CAPACITY;
  private lastRefill: number;

  constructor(deps: OwmClientDeps) {
    const now = deps.now ?? (() => Date.now());
    this.deps = { ...deps, now };
    this.lastRefill = now();
  }

  private consumeToken(): boolean {
    const now = this.deps.now();
    if (now - this.lastRefill >= REFILL_INTERVAL_MS) {
      this.tokens = BUCKET_CAPACITY;
      this.lastRefill = now;
    }
    if (this.tokens <= 0) return false;
    this.tokens--;
    return true;
  }

  async fetchForecast(
    latLng: LatLng,
  ): Promise<{ data: NormalisedForecast; stale: boolean } | null> {
    const hourBucket = currentHourBucket();
    const key = cacheKey(latLng, hourBucket);

    const cached = await this.deps.getCached(key);
    if (cached) {
      return { data: cached.data, stale: cached.hourBucket < hourBucket };
    }

    if (!this.consumeToken()) {
      const staleKey = cacheKey(latLng, hourBucket - 1);
      const staleEntry = await this.deps.getCached(staleKey);
      if (staleEntry) return { data: staleEntry.data, stale: true };
      return null;
    }

    const apiKey = await this.deps.getApiKey();
    if (!apiKey) return null;

    const url = `${OWM_BASE}?lat=${latLng.lat}&lon=${latLng.lng}&units=standard&appid=${apiKey}`;
    let resp: Response;
    try {
      resp = await this.deps.fetchFn(url);
    } catch {
      return null;
    }
    if (!resp.ok) return null;

    const raw = (await resp.json()) as Owm25ForecastResponse;
    const data: NormalisedForecast = { hourly: raw.list.map(normaliseItem) };
    await this.deps.putCached(key, { data, hourBucket });
    return { data, stale: false };
  }

  async forecastForRoute(
    samples: SamplePoint[],
    departureUnix: number,
  ): Promise<ForecastForRouteResp> {
    const results: ForecastResult[] = [];
    const annotations: WeatherAnnotation[] = [];

    await Promise.all(
      samples.map(async (sample) => {
        const arrivalUnix = departureUnix + sample.etaMinutes * 60;
        const forecast = await this.fetchForecast(sample);
        if (!forecast) return;

        const risk = riskAtTime(forecast.data.hourly, arrivalUnix);
        const entry = hourlyAtTime(forecast.data.hourly, arrivalUnix);
        const raw: ForecastRaw = entry
          ? {
              tempKelvin: entry.temp,
              rainMmh: entry.rain?.['1h'] ?? 0,
              humidity: entry.humidity,
              pop: entry.pop,
              weatherDesc: entry.weather[0]?.description ?? entry.weather[0]?.main ?? '',
            }
          : { tempKelvin: 273.15, rainMmh: 0, humidity: 0, pop: 0, weatherDesc: '' };
        const { kind, severity } = dominantKind(risk);

        results.push({ latLng: sample, etaMinutes: sample.etaMinutes, risk, raw, stale: forecast.stale });
        if (SEVERITY_ORDER[severity] >= SEVERITY_ORDER['medium']) {
          annotations.push({ latLng: sample, kind, severity });
        }
      }),
    );

    results.sort((a, b) => a.etaMinutes - b.etaMinutes);
    return { annotations, results };
  }
}
