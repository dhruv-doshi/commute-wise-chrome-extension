import { defineConfig } from '@playwright/test';
import path from 'path';

const distDir = path.resolve(__dirname, 'dist');

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  use: {
    // Extensions require a persistent context and headful Chrome.
    // E2E tests wire this up per-test via fixtures.
    headless: false,
    channel: 'chromium',
  },
  projects: [
    {
      name: 'extension',
      use: { _extensionPath: distDir } as Record<string, unknown>,
    },
  ],
});
