const OWM_TEST_URL = 'https://api.openweathermap.org/data/2.5/weather?lat=12.97&lon=77.59&appid=';

let currentStep = 0;

const dots = [0, 1, 2].map((i) => document.getElementById(`dot-${i}`) as HTMLDivElement);
const steps = [0, 1, 2].map((i) => document.getElementById(`step-${i}`) as HTMLDivElement);

function goTo(step: number): void {
  steps[currentStep].classList.remove('visible');
  dots[currentStep].classList.remove('active');
  dots[currentStep].classList.add('done');

  currentStep = step;
  steps[currentStep].classList.add('visible');
  dots[currentStep].classList.remove('done');
  dots[currentStep].classList.add('active');
}

document.getElementById('btn-step0-next')!.addEventListener('click', () => goTo(1));
document.getElementById('btn-step1-back')!.addEventListener('click', () => goTo(0));
document.getElementById('btn-step1-next')!.addEventListener('click', () => goTo(2));
document.getElementById('btn-step2-back')!.addEventListener('click', () => goTo(1));

document.getElementById('btn-open-owm')!.addEventListener('click', () => {
  window.open('https://openweathermap.org/api', '_blank', 'noopener');
});

document.getElementById('btn-open-maps')!.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://www.google.com/maps' });
  window.close();
});

const keyInput = document.getElementById('api-key') as HTMLInputElement;
const btnSave = document.getElementById('btn-save') as HTMLButtonElement;
const btnOpenMaps = document.getElementById('btn-open-maps') as HTMLButtonElement;
const keyStatus = document.getElementById('key-status') as HTMLDivElement;

function setStatus(msg: string, kind: 'ok' | 'err' | 'testing'): void {
  keyStatus.textContent = msg;
  keyStatus.className = `status ${kind}`;
}

btnSave.addEventListener('click', async () => {
  const key = keyInput.value.trim();
  if (!key) { setStatus('Paste your key first.', 'err'); return; }

  setStatus('Testing key against OpenWeatherMap…', 'testing');
  btnSave.disabled = true;

  try {
    const resp = await fetch(OWM_TEST_URL + key);
    if (resp.status === 401) {
      setStatus('Key rejected (401). Double-check it and try again.', 'err');
      btnSave.disabled = false;
      return;
    }
  } catch {
    setStatus('Network error — check your connection and try again.', 'err');
    btnSave.disabled = false;
    return;
  }

  await chrome.storage.local.set({ owmApiKey: key });
  btnSave.disabled = false;
  keyInput.value = '';
  setStatus('✓ Key saved! You\'re all set.', 'ok');
  btnOpenMaps.disabled = false;
});

keyInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') btnSave.click(); });

export {};
