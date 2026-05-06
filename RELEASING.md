# Release Process

## Prerequisites

- Chrome Web Store developer account ($5 one-time fee at [chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole))
- Access to the GitHub repository

---

## Steps

### 1. Prepare the code

```bash
# Bump the version in both places
#   src/manifest.config.ts  →  version: 'X.Y.Z'
# Update CHANGELOG.md with the new version and date
```

### 2. Verify everything passes

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm build
pnpm run icons
pnpm size              # must stay under 150 kB gzipped
```

Run through `tests/MANUAL.md` on a real Maps session with a live OWM key.

### 3. Build the zip

```bash
pnpm build             # fresh dist/
cd dist
zip -r ../rnr-maps-lens-vX.Y.Z.zip .
cd ..
```

### 4. Tag the release on GitHub

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Create a GitHub Release from the tag and attach `rnr-maps-lens-vX.Y.Z.zip`.

### 5. Upload to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Select the listing → **Package** → **Upload new package** → upload the zip
3. Fill in **Store listing** if anything changed (description, screenshots)
4. **Privacy practices** form — confirm:
   - Permissions justified: `storage` for local key/prefs, host permissions for OWM + OSRM
   - No user data collected or transmitted to your servers
   - Link to `PRIVACY.md` (raw GitHub URL)
5. Click **Submit for review**

### 6. Post-approval

- Copy the store URL into `README.md` (the "Install from Chrome Web Store" link)
- Announce if applicable

---

## Review timeline

First submission: typically 1–3 business days. Updates: usually faster. Extensions referencing Google products may take longer — the listing wording in the description is pre-reviewed for this.

## Listing wording (single-purpose statement)

> Rain-N-Route Maps Lens augments Google Maps with rain, flood, heat, and air-quality condition overlays along your driving route. It is an independent tool, not affiliated with or endorsed by Google.
