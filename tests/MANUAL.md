# Manual Smoke Checklist

Run before every release. Requires a real OWM API key and internet access.

**Setup:** `pnpm build && pnpm run icons` → load `dist/` as unpacked extension in Chrome.

---

## Checklist

### 1. First install — onboarding

- [ ] After loading the extension for the first time, a new tab opens automatically with the onboarding wizard
- [ ] Step 0 (Welcome): "Next" advances to Step 1
- [ ] Step 1 (Get key): "openweathermap.org" link opens in a new tab; "Next" and "Back" navigate correctly
- [ ] Step 2 (Save key): paste a valid OWM key → "Save & Test" shows a testing spinner, then "✓ Key saved!"
- [ ] Step 2 (Save key): paste an invalid key → shows a 401 rejection message
- [ ] "Open Google Maps" button on step 2 opens Maps and closes the onboarding tab

### 2. Options page

- [ ] Right-click extension icon → Options (or visit `chrome://extensions` → Details → Extension options)
- [ ] Current key shows masked (first 4 + last 4 chars)
- [ ] "Remove key" clears the display to "No key saved"
- [ ] Re-paste a valid key → Save & Test → key appears masked
- [ ] Change units to °F → Save display settings → reload options → °F is still selected
- [ ] Change minimum severity to "High+" → Save → reload options → "High+" is still selected
- [ ] Add a hotspot line (`12.97,77.59,Bangalore`) → Save hotspots → reload → line persists

### 3. Route detection and panel

- [ ] Open `https://www.google.com/maps`, enter a Bangalore → Mysore route
- [ ] Side panel appears on the right within 5 seconds
- [ ] Panel header shows "🌧 Rain-N-Route" with ⓘ ↻ ✕ buttons, all same size and aligned
- [ ] Route name line shows "Bangalore → Mysore" (or similar)
- [ ] Timeline shows rows with ETA labels (Now, +15m, etc.)
- [ ] If conditions are clear, rows show "✓ Clear"; if not, coloured pills appear

### 4. Pill interaction

- [ ] Click a coloured pill (R/F/H/A) → detail card appears above the timeline
- [ ] Detail card shows axis name, ETA, and relevant raw metrics (mm/h, °C/°F, humidity, etc.)
- [ ] Detail card "✕" closes it
- [ ] Clicking a different pill replaces the detail card

### 5. Info legend

- [ ] Click ⓘ → legend panel opens (replaces timeline content)
- [ ] Legend shows all 4 pill axes with descriptions, 3 severity colour swatches, and the "How the timeline works" explanation
- [ ] Clicking ⓘ again closes the legend
- [ ] Clicking a pill while legend is open closes legend and shows pill detail

### 6. Departure time

- [ ] "Depart At" section shows a date input and time input
- [ ] Change the date to tomorrow → change time → click **OK**
- [ ] Spinner (↻ animation + blue bar) appears briefly, then panel updates with new conditions
- [ ] Footer shows "Updated just now"

### 7. Reload button

- [ ] With a Bangalore → Mysore route loaded, enter a different route in Maps (e.g., Chennai → Coimbatore)
- [ ] Click ↻ in the panel
- [ ] Spinner plays; panel updates to show Chennai → Coimbatore conditions
- [ ] Route name line updates accordingly

### 8. Degradation states

- [ ] Remove the OWM key from Options
- [ ] Enter a route in Maps → panel shows the blue "Add your OWM key…" card with "Open Settings" button
- [ ] "Open Settings" button opens the Options page
- [ ] Re-add a valid key → click ↻ → weather data loads normally

### 9. Map overlay icons

- [ ] On any route with Medium+ severity conditions, SVG icons appear on the map canvas at the sampled waypoints
- [ ] Icons stay anchored to their lat/lng position when panning the map
- [ ] Icons disappear when the route is cleared in Maps

### 10. Stale data

- [ ] Force a stale cache by manually editing the IndexedDB `hourBucket` value in DevTools (Application → IndexedDB → rnr-cache → forecasts) to a past bucket
- [ ] Reload the route → "⚠ Showing cached data" badge appears

---

All 10 sections must pass before submitting a release to the Chrome Web Store.
