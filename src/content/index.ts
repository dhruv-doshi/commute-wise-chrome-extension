import { createMapsAdapter } from './google-maps-adapter';

const adapter = createMapsAdapter();

const { ok, reason } = adapter.probe();
if (!ok) {
  console.warn(`[RNR] adapter probe failed: ${reason}. Side panel only.`);
}

adapter.onRouteChange((route) => {
  if (route) {
    console.log(`[RNR] route: ${route.origin} → ${route.destination}`);
  } else {
    console.log('[RNR] no route active');
  }
});

adapter.onViewportChange((vp) => {
  console.debug(`[RNR] viewport: ${vp.lat},${vp.lng} zoom=${vp.zoom}`);
});

console.log('[RNR] content script loaded');
