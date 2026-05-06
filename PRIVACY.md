# Privacy Policy — Rain-N-Route Maps Lens

**Last updated: 2026-05-06**

## Summary

Rain-N-Route Maps Lens collects nothing, sends nothing to any server we operate, and stores only what you explicitly provide — locally on your device.

---

## What is stored

| Data | Where | Why | Wiped on uninstall? |
|---|---|---|---|
| Your OpenWeatherMap API key | `chrome.storage.local` | To make weather API calls on your behalf | Yes |
| Display preferences (units, severity threshold, hotspots) | `chrome.storage.local` | To remember your settings | Yes |
| Weather forecast responses | Browser IndexedDB | Cache to avoid redundant API calls and stay within OWM free-tier limits | Yes |

Nothing is stored on `chrome.storage.sync` — your API key never leaves the device it was entered on.

## What is NOT collected

- No usage analytics
- No crash reporting
- No telemetry of any kind
- No personally identifiable information
- No location data beyond what Google Maps already shows in the URL

## Network requests

The extension makes network calls to **two external services only**:

1. **OpenWeatherMap** (`api.openweathermap.org`) — to fetch weather forecasts for points along your route. These calls include coordinates (lat/lng) sampled from the Google Maps route, the hour of your planned departure, and your OWM API key. They are initiated by you when you load a route.

2. **OSRM** (`router.project-osrm.org`) — a fallback routing service used only when the extension cannot extract the route polyline directly from Google Maps. This sends origin and destination coordinates. No personal data.

The extension does **not** contact any Rain-N-Route server — there is none.

## Google Maps

The extension reads the current Google Maps URL and the directions shown in the page to detect route changes. It does not modify, record, or transmit any Maps data. It is not affiliated with or endorsed by Google.

## Permissions declared

| Permission | Why it is needed |
|---|---|
| `storage` | To save your OWM key and preferences in `chrome.storage.local` |
| `https://api.openweathermap.org/*` | To fetch weather forecasts |
| `https://router.project-osrm.org/*` | Routing fallback (polyline extraction) |
| `https://www.google.com/maps/*` | Content script injection — reads the URL and page DOM to detect your route |

## Contact

Questions or concerns: open an issue at the project's GitHub repository.
