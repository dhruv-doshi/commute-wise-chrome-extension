const OWM_TEST_URL = 'https://api.openweathermap.org/data/2.5/weather?lat=12.97&lon=77.59&appid=';

// ---------------------------------------------------------------------------
// API key section
// ---------------------------------------------------------------------------

const keyInput   = document.getElementById('api-key')     as HTMLInputElement;
const btnSave    = document.getElementById('btn-save')     as HTMLButtonElement;
const btnClear   = document.getElementById('btn-clear')    as HTMLButtonElement;
const keyStatusEl= document.getElementById('key-status')   as HTMLDivElement;
const keyDisplay = document.getElementById('key-display')  as HTMLDivElement;

function setKeyStatus(msg: string, kind: 'ok' | 'err' | 'testing'): void {
  keyStatusEl.textContent = msg;
  keyStatusEl.className = `status ${kind}`;
}

function maskKey(key: string): string {
  if (key.length <= 8) return '••••••••';
  return key.slice(0, 4) + '••••••••' + key.slice(-4);
}

function renderCurrentKey(key: string | null): void {
  keyDisplay.textContent = key ? maskKey(key) : 'No key saved';
  keyDisplay.className = `key-display${key ? '' : ' empty'}`;
}

btnSave.addEventListener('click', async () => {
  const key = keyInput.value.trim();
  if (!key) { setKeyStatus('Please paste your API key first.', 'err'); return; }

  setKeyStatus('Testing key against OpenWeatherMap…', 'testing');
  btnSave.disabled = true;

  try {
    const resp = await fetch(OWM_TEST_URL + key);
    if (resp.status === 401) {
      setKeyStatus('Key rejected by OpenWeatherMap (401). Double-check the key.', 'err');
      btnSave.disabled = false;
      return;
    }
  } catch {
    setKeyStatus('Network error. Check your connection and try again.', 'err');
    btnSave.disabled = false;
    return;
  }

  await chrome.storage.local.set({ owmApiKey: key });
  keyInput.value = '';
  renderCurrentKey(key);
  setKeyStatus('Key saved! Weather data will load on your next Maps route.', 'ok');
  btnSave.disabled = false;
});

btnClear.addEventListener('click', async () => {
  await chrome.storage.local.remove('owmApiKey');
  renderCurrentKey(null);
  setKeyStatus('Key removed.', 'ok');
});

keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSave.click(); });

// ---------------------------------------------------------------------------
// Display settings
// ---------------------------------------------------------------------------

const unitsMetric   = document.getElementById('units-metric')    as HTMLInputElement;
const unitsImperial = document.getElementById('units-imperial')   as HTMLInputElement;
const minSeverityEl = document.getElementById('min-severity')     as HTMLSelectElement;
const btnSaveDisplay= document.getElementById('btn-save-display') as HTMLButtonElement;
const displayStatus = document.getElementById('display-status')   as HTMLDivElement;

btnSaveDisplay.addEventListener('click', async () => {
  const units = unitsImperial.checked ? 'imperial' : 'metric';
  const minSeverity = minSeverityEl.value;
  await chrome.storage.local.set({ units, minSeverity });
  displayStatus.textContent = 'Saved!';
  displayStatus.className = 'status saved';
  setTimeout(() => { displayStatus.className = 'status'; }, 2000);
});

// ---------------------------------------------------------------------------
// Hotspots
// ---------------------------------------------------------------------------

const hotspotsEl    = document.getElementById('hotspots')         as HTMLTextAreaElement;
const btnSaveHotspots = document.getElementById('btn-save-hotspots') as HTMLButtonElement;
const hotspotsStatus = document.getElementById('hotspots-status')  as HTMLDivElement;

btnSaveHotspots.addEventListener('click', async () => {
  await chrome.storage.local.set({ hotspots: hotspotsEl.value.trim() });
  hotspotsStatus.textContent = 'Saved!';
  hotspotsStatus.className = 'status saved';
  setTimeout(() => { hotspotsStatus.className = 'status'; }, 2000);
});

// ---------------------------------------------------------------------------
// Load all saved values on open
// ---------------------------------------------------------------------------

async function loadAll(): Promise<void> {
  const result = await chrome.storage.local.get(['owmApiKey', 'units', 'minSeverity', 'hotspots']);

  renderCurrentKey((result['owmApiKey'] as string | undefined) ?? null);

  if (result['units'] === 'imperial') {
    unitsImperial.checked = true;
  } else {
    unitsMetric.checked = true;
  }

  if (result['minSeverity']) {
    minSeverityEl.value = result['minSeverity'] as string;
  }

  if (result['hotspots']) {
    hotspotsEl.value = result['hotspots'] as string;
  }
}

loadAll();

export {};
