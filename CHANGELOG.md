# Changelog

All notable changes to Rain-N-Route Maps Lens are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning: [Semantic Versioning](https://semver.org/).

---

## [0.0.1] — 2026-05-06

### Added

- Rain, flood, heat, and AQI severity overlays projected onto Google Maps route polylines
- Side panel with route timeline showing conditions at predicted arrival time per waypoint
- Gear checklist (umbrella, rain jacket, sunscreen, etc.) derived from worst-case risk
- Departure date + time picker — conditions update to reflect when you will actually be at each point
- Clickable pills with raw metric details (mm/h, °C/°F, humidity, chance of rain)
- Legend panel explaining what each pill means and how the timeline works
- Reload button (↻) — re-reads the current Maps route and refreshes forecast
- BYO OpenWeatherMap API key — no accounts, no backend, no telemetry
- First-run onboarding wizard (opens on install)
- Options page: units (°C/°F), minimum severity threshold, hotspot coordinates
- Degradation banners: no-key card, endpoints-only mode, stale-data badge
- Weather data cached per location per hour in IndexedDB (stays within OWM free tier)
- Token-bucket rate limiter (60 req/min) with graceful stale-data fallback
