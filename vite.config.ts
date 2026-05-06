import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import manifest from './src/manifest.config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      // @crxjs handles manifest HTML entries; onboarding is extra.
      input: {
        onboarding: resolve(__dirname, 'src/onboarding/onboarding.html'),
      },
    },
  },
});
