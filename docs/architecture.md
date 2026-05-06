# Architecture — Rain-N-Route Maps Lens

## Layer overview

```
┌─────────────────────────────────────────────────────────┐
│  Google Maps tab (https://www.google.com/maps/*)        │
│                                                         │
│  ┌─────────────────┐   postMessage    ┌──────────────┐  │
│  │  MAIN world     │ ────────────────▶│  ISOLATED    │  │
│  │  injected-      │  rnr:raw-        │  world       │  │
│  │  world.ts       │  directions      │  index.ts    │  │
│  │                 │                  │              │  │
│  │  Patches        │                  │  Wires:      │  │
│  │  fetch + XHR    │                  │  adapter     │  │
│  │  to capture     │                  │  extractor   │  │
│  │  directions     │                  │  overlay     │  │
│  │  response body  │                  │  panel       │  │
│  └─────────────────┘                  └──────┬───────┘  │
│                                              │           │
│                                    chrome.runtime.       │
│                                    sendMessage           │
└─────────────────────────────────────────────┼───────────┘
                                              │
                              ┌───────────────▼───────────┐
                              │  Background service worker │
                              │  service-worker.ts         │
                              │                            │
                              │  OwmClient → OWM 2.5 API  │
                              │  IndexedDB cache (idb)     │
                              │  Token-bucket rate limiter │
                              └────────────────────────────┘
```

## Adapter isolation rule

**`src/content/google-maps-adapter.ts` is the only file that knows anything about Google Maps.**

It owns:
- URL parsing (`/maps/dir/<origin>/<destination>/@lat,lng,zoomz`)
- DOM selectors (`.gm-style`, directions sidebar)
- The overlay container div mounted on top of the map canvas
- Viewport throttling (rAF + 100 ms idle floor)

If Google ships a breaking Maps update, this is the only file that needs touching. Everything else programs against the `MapsAdapter` interface in `src/shared/types.ts`.

## Data flow

```
1. Route detection
   google-maps-adapter.ts reads location.href on load
   → parseDirectionsUrl() → RouteInfo { origin, destination, viewportHash }
   → onRouteChange listeners fire

2. Polyline extraction (ladder — first success wins)
   route-extractor/index.ts orchestrates:
   a. MAIN world fetch/XHR intercept → polyline-decoder.ts (primary)
   b. SVG path scan → svg-fallback.ts (DOM fallback)
   c. OSRM public API → osrm-fallback.ts (routing fallback)
   d. Endpoints-only banner (last resort)

3. Route sampling
   shared/route-sampler.ts
   LatLng[] → SamplePoint[] (every ~5 km, max 12 points)
   Each point carries etaMinutes = total ETA × (distKm / totalKm)

4. Forecast fetch (per sample point)
   content/index.ts → chrome.runtime.sendMessage → service-worker.ts
   OwmClient.forecastForRoute(samples, departureUnix)
     for each sample:
       arrivalUnix = departureUnix + sample.etaMinutes * 60
       OWM 2.5 /forecast → NormalisedForecast (cached in IndexedDB)
       hourlyAtTime(hourly, arrivalUnix) → closest 3-hour slot
       hourlyToRisk(slot) → RiskProfile { rain, flood, heat, aqi }
   → ForecastForRouteResp { results[], annotations[] }

5. Rendering
   Overlay: OverlayRoot projects annotations to screen pixels
            (latLngToPixel via Web Mercator + viewport)
            re-projects on every viewport tick
   Panel:   SidePanel (Shadow DOM, lit-html)
            timeline rows, gear checklist, departure picker
```

## Key files

| File | Role |
|---|---|
| `src/content/google-maps-adapter.ts` | Maps URL/DOM interface — only Maps-aware file |
| `src/content/route-extractor/injected-world.ts` | MAIN world: patches fetch/XHR to capture directions |
| `src/content/route-extractor/index.ts` | Polyline extraction ladder orchestrator |
| `src/content/overlay/projection.ts` | Pure: lat/lng ↔ screen pixel (Web Mercator) |
| `src/content/panel/side-panel.ts` | Shadow DOM panel — all UI state |
| `src/background/owm-client.ts` | OWM 2.5 client with cache + rate limiter |
| `src/shared/weather-risk.ts` | Pure: OWM hourly slot → RiskProfile |
| `src/shared/gear-rules.ts` | Pure: RiskProfile → gear checklist items |
| `src/shared/messages.ts` | Typed contracts between content script and SW |
| `src/shared/types.ts` | Core types and MapsAdapter interface |

## Weather data resolution

OWM 2.5 `/forecast` provides 3-hour slots for 5 days. The extension finds the slot whose `dt` is closest to the predicted arrival time at each waypoint. Two waypoints within the same 3-hour window at nearby coordinates will show identical data — this is a free-tier limitation, not a bug.

## Bundle budget

Content script (`dist/assets/index.ts-*.js`): **≤ 150 kB gzipped** (enforced by `pnpm size` in CI). Current size: ~14 kB gzipped.
