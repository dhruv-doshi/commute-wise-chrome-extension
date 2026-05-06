/**
 * Phase 1 E2E — verifies the GoogleMapsAdapter fires correctly on real Maps.
 *
 * Requires: pnpm build, internet access, headed Chrome.
 * Not run in CI (CI only runs pnpm test = vitest unit tests).
 */
import { test, expect } from './fixtures';

test('overlay div is injected into the Maps page', async ({ context }) => {
  const page = await context.newPage();
  await page.goto('https://www.google.com/maps', { waitUntil: 'domcontentloaded' });

  // Wait for Maps to fully render (gm-style appears)
  await page.waitForSelector('.gm-style', { timeout: 15_000 });

  // Our overlay div should be mounted once the adapter initialises
  await expect(page.locator('#rnr-overlay')).toBeAttached({ timeout: 10_000 });
});

test('routeChanged fires with correct origin and destination', async ({ context }) => {
  const page = await context.newPage();

  // Listen for our custom event before navigating
  const routeChangePromise = page.evaluate(() =>
    new Promise<{ origin: string; destination: string }>((resolve) => {
      window.addEventListener('rnr:routechange', (e) => {
        const detail = (e as CustomEvent).detail;
        if (detail) resolve(detail);
      });
    }),
  );

  await page.goto(
    'https://www.google.com/maps/dir/Bangalore/Mysore/@12.6394,76.3834,9z',
    { waitUntil: 'domcontentloaded' },
  );

  const route = await Promise.race([
    routeChangePromise,
    page.waitForTimeout(15_000).then(() => null),
  ]);

  expect(route).not.toBeNull();
  expect((route as { origin: string }).origin).toContain('Bangalore');
  expect((route as { destination: string }).destination).toContain('Mysore');
});

test('viewportChanged fires after navigation', async ({ context }) => {
  const page = await context.newPage();

  await page.goto(
    'https://www.google.com/maps/dir/Bangalore/Mysore/@12.6394,76.3834,9z',
    { waitUntil: 'domcontentloaded' },
  );

  // Navigate to a different zoom — adapter should fire viewportChanged
  const viewportPromise = page.evaluate(() =>
    new Promise<{ lat: number; lng: number; zoom: number }>((resolve) => {
      window.addEventListener('rnr:viewportchange', (e) =>
        resolve((e as CustomEvent).detail),
      );
    }),
  );

  await page.goto(
    'https://www.google.com/maps/dir/Bangalore/Mysore/@12.6394,76.3834,12z',
    { waitUntil: 'domcontentloaded' },
  );

  const vp = await Promise.race([
    viewportPromise,
    page.waitForTimeout(10_000).then(() => null),
  ]);

  expect(vp).not.toBeNull();
  expect((vp as { zoom: number }).zoom).toBe(12);
});
