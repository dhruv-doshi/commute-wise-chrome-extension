# Rain-N-Route Maps Lens

A Chrome extension that layers rain, flood, heat, and AQI alerts directly on Google Maps when you have a route loaded. You bring your own [OpenWeatherMap](https://openweathermap.org/api) API key — no accounts, no backend, nothing leaves your device except your own API calls.

> Chrome Web Store listing coming after v1 launch.

---

## Install for development

```bash
pnpm install
pnpm build
```

Then in Chrome: **Extensions → Developer mode → Load unpacked → select `dist/`**

For live reload while developing:

```bash
pnpm dev
```

---

## How to get an OWM key

1. Sign up at [openweathermap.org](https://openweathermap.org/api) (free tier is enough)
2. Copy your API key from the dashboard
3. Paste it into the extension's options page (click the puzzle icon → Rain-N-Route → Options)

---

## Privacy

No telemetry. No central server. Your API key and settings are stored locally in `chrome.storage.local` and wiped automatically on uninstall. The only network calls are to OpenWeatherMap, using the key you provided.

See [PRIVACY.md](./PRIVACY.md) for the full disclosure.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).
