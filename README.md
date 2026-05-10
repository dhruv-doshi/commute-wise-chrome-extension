# Rain-N-Route Maps Lens

A Chrome extension that layers **rain, flood, heat, and AQI alerts** directly on Google Maps when you have a driving route loaded. Conditions are shown at the time you will actually reach each point — not just at departure.

> Chrome Web Store listing coming after v1 launch. Load unpacked from `dist/` in the meantime.

---

## Features

- **On-map weather icons** — SVG markers projected onto the route polyline at sampled waypoints
- **Route timeline** — per-waypoint risk pills (R Rain · F Flood · H Heat · A Air) at predicted arrival time
- **Pill details** — click any pill for raw metrics: mm/h, °C/°F, humidity, precipitation probability
- **Gear checklist** — umbrella, rain jacket, sunscreen, and more, derived from worst-case risk
- **Departure picker** — change date and time; press OK to re-fetch conditions for that departure
- **Reload** — re-reads the current Maps route and refreshes all forecasts
- **Legend** — in-panel explanation of what each pill means and how the timeline works
- **BYO OpenWeatherMap key** — no accounts, no backend, nothing leaves your device

---

## Install for development

```bash
pnpm install
pnpm run icons   # generates public/icons/*.png from src/icons/icon.svg
pnpm build       # outputs dist/
```

In Chrome: **Extensions → Developer mode → Load unpacked → select `dist/`**

For live reload while developing:

```bash
pnpm dev
```

---

## How to get an OWM key

1. Sign up at [openweathermap.org](https://openweathermap.org/api) — the free tier (1,000 calls/day) is sufficient
2. Copy your API key from the dashboard
3. Paste it into the extension's options page (puzzle icon → Rain-N-Route → Options) and click **Save & Test**

The first time you install the extension an onboarding wizard walks you through this automatically.

---

## How it works

The extension reads your current Google Maps route from the URL, samples up to 12 waypoints along the polyline, and fetches an OWM 5-day/3-hour forecast for each. For each waypoint it looks up the forecast slot closest to your predicted arrival time — so conditions 45 minutes into a trip are shown as they will be at 9:45 am, not at departure.

See [`docs/architecture.md`](./docs/architecture.md) for a full layer diagram and data flow.

---

## Privacy

No telemetry. No central server. Your API key and settings are stored locally in `chrome.storage.local` and wiped automatically on uninstall. The only network calls are to OpenWeatherMap (using the key you provided) and optionally to the public OSRM routing service (polyline fallback).

See [`PRIVACY.md`](./PRIVACY.md) for the full disclosure.

---

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## Releasing

See [`RELEASING.md`](./RELEASING.md) for the step-by-step Chrome Web Store submission process.

## License

[MIT](./LICENSE) © 2026 Dhruv Doshi


---

## About

Built by [Dhruv Doshi](https://dhruvdoshi.vercel.app) — see more projects on the [portfolio](https://dhruvdoshi.vercel.app/projects) or connect on [LinkedIn](https://www.linkedin.com/in/dhruvdoshi/).
