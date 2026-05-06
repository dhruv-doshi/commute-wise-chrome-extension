/**
 * Playwright fixtures that launch Chrome with the packed extension loaded.
 * Extensions require a persistent context (not an incognito page) and
 * cannot run in headless mode.
 */
import { test as base, chromium, BrowserContext } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const distDir = path.resolve(__dirname, '../../dist');

export const test = base.extend<{ context: BrowserContext; extensionId: string }>({
  // eslint-disable-next-line no-empty-pattern
  context: async ({}, use) => {
    if (!fs.existsSync(distDir)) {
      throw new Error(`dist/ not found — run "pnpm build" before E2E tests`);
    }
    const context = await chromium.launchPersistentContext('', {
      headless: false,
      args: [
        `--disable-extensions-except=${distDir}`,
        `--load-extension=${distDir}`,
        '--no-sandbox',
      ],
    });
    await use(context);
    await context.close();
  },

  extensionId: async ({ context }, use) => {
    // Service worker background page exposes the extension ID
    let [background] = context.serviceWorkers();
    if (!background) {
      background = await context.waitForEvent('serviceworker');
    }
    const extensionId = background.url().split('/')[2];
    await use(extensionId);
  },
});

export { expect } from '@playwright/test';
