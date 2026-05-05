import { defineManifest } from '@crxjs/vite-plugin';

// Icons added in Phase 7 per plan/build-and-deploy.md.
export default defineManifest({
  manifest_version: 3,
  name: 'Rain-N-Route Maps Lens',
  description:
    'Rain, flood, and route-condition info on top of Google Maps. BYO OpenWeatherMap key.',
  version: '0.0.1',
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['https://www.google.com/maps/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'notifications'],
  host_permissions: ['https://api.openweathermap.org/*'],
});
