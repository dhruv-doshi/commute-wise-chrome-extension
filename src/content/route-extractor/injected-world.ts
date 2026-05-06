/**
 * Runs in the MAIN world (world: "MAIN", run_at: "document_start").
 * Patches window.fetch and XMLHttpRequest to capture response bodies
 * from all google.com requests, then forwards any response that contains
 * an encoded polyline to the ISOLATED world via window.postMessage.
 *
 * We intercept ALL responses (not just a specific URL) because Google's
 * internal directions endpoint URL changes frequently. The polyline
 * extraction logic in polyline-decoder.ts handles the filtering.
 *
 * This file MUST NOT import anything — it is fully self-contained after bundling.
 */

const MSG_TYPE = 'rnr:raw-directions';

// Only consider responses from Google's own origin to avoid noise.
const GOOGLE_ORIGIN = /^https:\/\/\w+\.google\.com\//;

// Minimum body size to bother parsing (tiny responses can't contain a polyline).
const MIN_BODY_LEN = 200;

// Buffer the most recent body that decoded a polyline, for late-arriving isolated scripts.
let buffered: string | null = null;

console.debug('[RNR] MAIN world injector active');

function tryPost(body: string): void {
  if (body.length < MIN_BODY_LEN) return;
  buffered = body;
  window.postMessage({ type: MSG_TYPE, body }, '*');
}

// ---- Patch fetch ----
const origFetch = window.fetch.bind(window);
window.fetch = async function (input, init) {
  const url =
    typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  const response = await origFetch(input, init);

  if (GOOGLE_ORIGIN.test(url)) {
    response
      .clone()
      .text()
      .then(tryPost)
      .catch(() => {/* ignore */});
  }

  return response;
};

// ---- Patch XMLHttpRequest ----
const origOpen = XMLHttpRequest.prototype.open;
const origSend = XMLHttpRequest.prototype.send;

type ExtXHR = XMLHttpRequest & { _rnrUrl?: string };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(XMLHttpRequest.prototype as any).open = function (
  this: ExtXHR,
  method: string,
  url: string | URL,
  ...rest: unknown[]
) {
  this._rnrUrl = typeof url === 'string' ? url : url.href;
  return origOpen.apply(this, [method, url, ...rest] as Parameters<typeof origOpen>);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
(XMLHttpRequest.prototype as any).send = function (this: ExtXHR, ...args: unknown[]) {
  if (this._rnrUrl && GOOGLE_ORIGIN.test(this._rnrUrl)) {
    this.addEventListener('load', () => {
      if (this.responseText) tryPost(this.responseText);
    });
  }
  return origSend.apply(this, args as Parameters<typeof origSend>);
};

// ---- Intercept messages from Google Maps' service worker ----
// Maps routes its API calls through a service worker; this catches the
// page←→SW postMessage channel where directions data may arrive.
if (navigator.serviceWorker) {
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (!event.data) return;
    const body = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
    tryPost(body);
  });
}

// ---- Respond to buffered-data requests from the isolated world ----
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (event.data?.type === 'rnr:request-buffered' && buffered) {
    window.postMessage({ type: MSG_TYPE, body: buffered }, '*');
  }
});
