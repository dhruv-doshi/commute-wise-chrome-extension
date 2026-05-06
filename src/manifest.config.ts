import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Rain-N-Route Maps Lens',
  description:
    'Rain, flood, and route-condition info on top of Google Maps. BYO OpenWeatherMap key.',
  version: '0.0.1',
  icons: {
    '16':  'public/icons/icon-16.png',
    '32':  'public/icons/icon-32.png',
    '48':  'public/icons/icon-48.png',
    '128': 'public/icons/icon-128.png',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      // Patches fetch/XHR in the page's own JS context to intercept directions.
      // Must run at document_start and in the MAIN world so it's in place
      // before Google Maps makes its first network request.
      matches: ['https://www.google.com/maps/*'],
      js: ['src/content/route-extractor/injected-world.ts'],
      run_at: 'document_start',
      // @ts-expect-error — 'world' is valid MV3 but missing from @crxjs type defs
      world: 'MAIN',
    },
    {
      matches: ['https://www.google.com/maps/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  options_page: 'src/options/options.html',
  permissions: ['storage'],
  host_permissions: [
    'https://api.openweathermap.org/*',
    'https://router.project-osrm.org/*',
  ],
});
