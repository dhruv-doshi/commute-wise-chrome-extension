/**
 * Service worker: wires OwmClient with Chrome storage + IndexedDB, routes messages.
 */

import { openDB, type IDBPDatabase } from 'idb';
import { OwmClient, type CacheEntry } from './owm-client';
import type { ContentToSwMsg, ForecastAtResp, ForecastForRouteResp } from '../shared/messages';
import { riskAtTime } from '../shared/weather-risk';

console.log('[RNR] sw alive');

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('src/onboarding/onboarding.html') });
  }
});

// ---------------------------------------------------------------------------
// IndexedDB
// ---------------------------------------------------------------------------

type CacheDb = IDBPDatabase<{
  forecasts: { key: string; value: CacheEntry };
}>;

let _db: CacheDb | null = null;

async function getDb(): Promise<CacheDb> {
  if (_db) return _db;
  _db = await openDB('rnr-cache', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('forecasts')) {
        db.createObjectStore('forecasts');
      }
    },
  });
  return _db;
}

// ---------------------------------------------------------------------------
// OwmClient instance wired to Chrome + IDB
// ---------------------------------------------------------------------------

const client = new OwmClient({
  fetchFn: fetch.bind(globalThis),
  getCached: async (key) => {
    const db = await getDb();
    return db.get('forecasts', key);
  },
  putCached: async (key, entry) => {
    const db = await getDb();
    await db.put('forecasts', entry, key);
  },
  getApiKey: async () => {
    const result = await chrome.storage.local.get('owmApiKey');
    return (result['owmApiKey'] as string | undefined) ?? null;
  },
});

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

async function handleForecastForRoute(
  msg: Extract<ContentToSwMsg, { type: 'forecastForRoute' }>,
): Promise<ForecastForRouteResp> {
  return client.forecastForRoute(msg.samples, msg.departureUnix);
}

async function handleForecastAt(
  msg: Extract<ContentToSwMsg, { type: 'forecastAt' }>,
): Promise<ForecastAtResp | null> {
  const forecast = await client.fetchForecast(msg.latLng);
  if (!forecast) return null;
  const risk = riskAtTime(forecast.data.hourly, msg.atUnixHour * 3600);
  return { risk, stale: forecast.stale };
}

// ---------------------------------------------------------------------------
// Chrome runtime message listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (
    message: ContentToSwMsg,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (resp: unknown) => void,
  ) => {
    if (message.type === 'forecastForRoute') {
      handleForecastForRoute(message)
        .then(sendResponse)
        .catch((err) => {
          console.error('[RNR SW] forecastForRoute error', err);
          sendResponse(null);
        });
      return true;
    }

    if (message.type === 'forecastAt') {
      handleForecastAt(message)
        .then(sendResponse)
        .catch((err) => {
          console.error('[RNR SW] forecastAt error', err);
          sendResponse(null);
        });
      return true;
    }

    return false;
  },
);
