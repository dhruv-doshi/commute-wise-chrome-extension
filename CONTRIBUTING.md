# Contributing to Rain-N-Route Maps Lens

## Prerequisites

- **Node 20+** (use `nvm` or `fnm` if you need version management)
- **pnpm** — `npm install -g pnpm`
- Chrome (for manual testing)

## First-time setup

```bash
git clone https://github.com/<your-fork>/commute-wise-chrome-extension
cd commute-wise-chrome-extension
pnpm install
pnpm run icons   # generates public/icons/*.png from src/icons/icon.svg
pnpm build       # outputs dist/
```

Load the extension in Chrome:
**chrome://extensions → Developer mode → Load unpacked → select `dist/`**

## Development workflow

```bash
pnpm dev         # Vite watch + HMR — @crxjs reloads the extension on save
```

Before every commit:

```bash
pnpm typecheck   # TypeScript strict
pnpm lint        # ESLint
pnpm test:unit   # Vitest (299 unit tests, all pure logic)
```

## Project structure at a glance

```
src/
  background/          Service worker — OWM client, IndexedDB cache
  content/
    google-maps-adapter.ts   ← THE only file that knows Maps selectors/URLs
    route-extractor/         Polyline extraction ladder (intercept → SVG → OSRM)
    overlay/                 SVG icons projected onto the map canvas
    panel/                   lit-html side panel (Shadow DOM)
  shared/              Pure modules — types, risk scoring, gear rules, cache key
  options/             Options page
  onboarding/          First-run wizard
  icons/               SVG icon source (rasterised by scripts/generate-icons.mjs)
scripts/
  generate-icons.mjs   Node script: SVG → 4 PNG sizes
```

## Adapter isolation rule

**All** Google-Maps-specific DOM selectors and URL-parsing logic live exclusively in `src/content/google-maps-adapter.ts`. If Google ships a Maps update that breaks the extension, that is the only file that needs touching. Do not leak Maps knowledge into other files.

## Updating DOM fixtures when Google changes Maps

If a Google Maps update changes the URL format or DOM selectors:

1. Open DevTools on `google.com/maps` and find the new pattern
2. Update the relevant constant or regex at the top of `google-maps-adapter.ts`
3. Run the E2E suite: `pnpm test:e2e` (requires internet + headed Chrome)
4. Update `tests/unit/url-parser.spec.ts` if the URL shape changed

## Adding a new weather axis

1. Add the severity function to `src/shared/weather-risk.ts`
2. Add the axis to `RiskProfile` in `src/shared/messages.ts`
3. Add gear rules in `src/shared/gear-rules.ts`
4. Add the pill entry to `PILL_AXES` in `src/content/panel/timeline.ts`
5. Add unit tests in `tests/unit/weather-risk.spec.ts` and `gear-rules.spec.ts`

## Pull request checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test:unit` all pass
- [ ] `pnpm build && pnpm size` — content script stays under 150 kB gzipped
- [ ] Manual smoke: load `dist/`, check affected flow works on real Maps
