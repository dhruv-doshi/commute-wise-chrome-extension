import { html, render } from 'lit-html';
import type { ForecastResult, RiskProfile } from '../../shared/messages';
import type { RouteInfo, Severity } from '../../shared/types';
import { renderTimeline, PILL_AXES, SEVERITY_COLOR } from './timeline';
import { renderGearChecklist } from './gear-checklist';
import { renderLeaveTime } from './leave-time';

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0, medium: 1, high: 2, extreme: 3,
};

const SEVERITY_LABEL: Record<Severity, string> = {
  low: 'Low', medium: 'Medium', high: 'High', extreme: 'Extreme',
};

function timeAgo(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 30) return 'just now';
  if (diffSec < 90) return `${diffSec}s ago`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.round(diffMin / 60);
  return `${diffH}h ago`;
}

function formatEta(etaMinutes: number): string {
  if (etaMinutes === 0) return 'now';
  const h = Math.floor(etaMinutes / 60);
  const m = etaMinutes % 60;
  if (h === 0) return `+${m}m`;
  if (m === 0) return `+${h}h`;
  return `+${h}h ${m}m`;
}

function kelvinToC(k: number): string { return (k - 273.15).toFixed(1); }
function kelvinToF(k: number): string { return ((k - 273.15) * 9 / 5 + 32).toFixed(1); }

const PANEL_STYLE = `
  :host { all: initial; }
  * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  .panel {
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.15);
    padding: 12px;
    overflow-y: auto;
    overscroll-behavior: contain;
    max-height: calc(100vh - 120px);
  }
  .panel[hidden] { display: none; }
  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .header-left { display: flex; align-items: center; gap: 4px; }
  .brand { font-weight: 700; font-size: 13px; color: #111827; }
  .icon-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    background: none;
    border: none;
    cursor: pointer;
    color: #9ca3af;
    font-size: 13px;
    padding: 0;
    border-radius: 4px;
    flex-shrink: 0;
  }
  .icon-btn:hover { color: #374151; background: #f3f4f6; }
  .icon-btn.active { color: #3b82f6; }
  .icon-btn:disabled { cursor: default; opacity: 0.5; }
  .info-circle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 15px;
    height: 15px;
    border: 1.5px solid currentColor;
    border-radius: 50%;
    font-size: 10px;
    font-style: italic;
    font-weight: 700;
    line-height: 1;
    letter-spacing: 0;
  }
  @keyframes rnr-spin { to { transform: rotate(360deg); } }
  .icon-btn.spinning { animation: rnr-spin 0.8s linear infinite; color: #3b82f6; }
  .reload-bar {
    height: 2px;
    background: linear-gradient(90deg, #3b82f6, #93c5fd, #3b82f6);
    background-size: 200% 100%;
    animation: rnr-slide 1.2s linear infinite;
    border-radius: 1px;
    margin-bottom: 6px;
  }
  @keyframes rnr-slide { from { background-position: 100% 0; } to { background-position: -100% 0; } }
  .route-name {
    font-size: 11px;
    color: #6b7280;
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .section-title {
    text-transform: uppercase;
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #6b7280;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .stale-badge {
    background: #fef3c7;
    color: #92400e;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 6px;
    margin-bottom: 6px;
    display: inline-block;
  }
  .paused-banner {
    background: #f3f4f6;
    color: #6b7280;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 6px;
    margin-bottom: 6px;
    display: inline-block;
  }
  .warn-banner {
    background: #fffbeb;
    color: #92400e;
    font-size: 10px;
    padding: 3px 8px;
    border-radius: 6px;
    margin-bottom: 6px;
    display: inline-block;
  }
  .no-key-card {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 6px;
    font-size: 12px;
    color: #1e3a5f;
  }
  .no-key-card p { margin-bottom: 8px; line-height: 1.4; }
  .no-key-btn {
    background: #3b82f6;
    color: #fff;
    border: none;
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }
  .no-key-btn:hover { background: #2563eb; }
  .loading {
    font-size: 12px;
    color: #9ca3af;
    font-style: italic;
    padding: 8px 0;
  }
  .footer {
    font-size: 10px;
    color: #9ca3af;
    margin-top: 8px;
    padding-top: 6px;
    border-top: 1px solid #f3f4f6;
  }
  /* Info panel */
  .info-section { margin-top: 8px; }
  .info-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 10px; }
  .info-table th { text-align: left; color: #6b7280; font-weight: 600; padding: 4px 6px; border-bottom: 1px solid #e5e7eb; }
  .info-table td { padding: 4px 6px; border-bottom: 1px solid #f3f4f6; color: #374151; vertical-align: top; }
  .info-table td:first-child { font-weight: 700; }
  .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
  .info-color-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; font-size: 11px; color: #374151; }
  /* Pill detail */
  .detail-card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 10px 12px;
    margin-top: 8px;
  }
  .detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .detail-title { font-weight: 700; font-size: 12px; color: #111827; }
  .detail-eta { font-size: 10px; color: #6b7280; }
  .detail-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .detail-label { color: #6b7280; }
  .detail-value { font-weight: 600; color: #111827; }
  .detail-severity { display: inline-block; padding: 1px 7px; border-radius: 99px; font-size: 10px; font-weight: 700; margin-top: 6px; }
`;

export class SidePanel {
  private host: HTMLDivElement;
  private shadow: ShadowRoot;
  private results: ForecastResult[] = [];
  private route: RouteInfo | null = null;
  private loading = false;
  private reloading = false;
  private overlayPaused = false;
  private noKey = false;
  private endpointsOnly = false;
  private showInfo = false;
  private activePill: { result: ForecastResult; axis: keyof RiskProfile } | null = null;
  private departureUnix: number = Math.floor(Date.now() / 1000);
  private lastUpdated: Date | null = null;
  private onReloadCb: (() => void) | null = null;
  private onRefetchCb: (() => void) | null = null;

  constructor() {
    this.host = document.createElement('div');
    this.host.id = 'rnr-panel-host';
    Object.assign(this.host.style, {
      position: 'fixed',
      right: '16px',
      top: '80px',
      width: '280px',
      maxHeight: 'calc(100vh - 120px)',
      zIndex: '2000',
      fontSize: '13px',
    });
    document.body.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: 'open' });
    this._render();
  }

  update(results: ForecastResult[], _route: RouteInfo): void { // _route reserved for future per-route metadata
    this.results = results;
    this.reloading = false;
    this.lastUpdated = new Date();
    this.activePill = null;
    this._render();
  }

  setRoute(route: RouteInfo | null): void {
    this.route = route;
    if (!route) { this.results = []; this.activePill = null; }
    this._render();
  }

  setLoading(loading: boolean): void {
    this.loading = loading;
    this._render();
  }

  setOverlayPaused(paused: boolean): void {
    this.overlayPaused = paused;
    this._render();
  }

  setNoKey(noKey: boolean): void {
    this.noKey = noKey;
    this._render();
  }

  setEndpointsOnly(endpointsOnly: boolean): void {
    this.endpointsOnly = endpointsOnly;
    this._render();
  }

  setReloading(v: boolean): void { this.reloading = v; this._render(); }
  setOnReload(cb: () => void): void { this.onReloadCb = cb; }
  setOnRefetch(cb: () => void): void { this.onRefetchCb = cb; }

  destroy(): void { this.host.remove(); }

  getDeparture(): number { return this.departureUnix; }

  private _worstRisk(): RiskProfile {
    if (this.results.length === 0) {
      return { rain: 'low', flood: 'low', heat: 'low', aqi: 'low' };
    }
    const axes: (keyof RiskProfile)[] = ['rain', 'flood', 'heat', 'aqi'];
    const worst: RiskProfile = { rain: 'low', flood: 'low', heat: 'low', aqi: 'low' };
    for (const r of this.results) {
      for (const axis of axes) {
        if (SEVERITY_ORDER[r.risk[axis]] > SEVERITY_ORDER[worst[axis]]) {
          worst[axis] = r.risk[axis];
        }
      }
    }
    return worst;
  }

  private _renderInfo() {
    return html`
      <div class="info-section">
        <div class="section-title">What the pills mean</div>
        <table class="info-table">
          <thead>
            <tr>
              <th>Pill</th>
              <th>Axis</th>
              <th>Measures</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>R</td><td>Rain</td><td>Precipitation intensity (mm/h) + chance</td></tr>
            <tr><td>F</td><td>Flood</td><td>Heavy rain × high humidity (standing water risk)</td></tr>
            <tr><td>H</td><td>Heat</td><td>Temperature — medium ≥30°C, high ≥35°C, extreme ≥42°C</td></tr>
            <tr><td>A</td><td>Air</td><td>Atmospheric haze, smoke, dust, fog (OWM 7xx conditions)</td></tr>
          </tbody>
        </table>

        <div class="section-title" style="margin-top:8px;">Severity colors</div>
        <div class="info-color-row">
          <span class="swatch" style="background:${SEVERITY_COLOR.medium}"></span>
          <strong>Blue — Medium</strong>: notable, start preparing
        </div>
        <div class="info-color-row">
          <span class="swatch" style="background:${SEVERITY_COLOR.high}"></span>
          <strong>Amber — High</strong>: take precautions
        </div>
        <div class="info-color-row">
          <span class="swatch" style="background:${SEVERITY_COLOR.extreme}"></span>
          <strong>Purple — Extreme</strong>: dangerous conditions
        </div>

        <div class="section-title" style="margin-top:12px;">How the timeline works</div>
        <div style="font-size:11px;color:#374151;line-height:1.6;">
          The route is divided into sample waypoints. Each row shows the weather
          <em>at that location</em> at the <em>time you will actually be there</em> —
          not at departure time.
        </div>
        <div style="margin-top:6px;font-size:11px;color:#374151;line-height:1.6;">
          Example: if you depart at 9:00 am and a waypoint is 45 minutes in,
          the conditions shown for <strong>+45m</strong> reflect the forecast at
          that spot at 9:45 am. This means moving storms, heat build-up, and
          rush-hour haze are all accounted for along the actual path of travel.
        </div>
        <div style="margin-top:6px;font-size:10px;color:#9ca3af;line-height:1.5;">
          Weather resolution is 3 hours (OWM free tier), so waypoints within the
          same 3-hour window at nearby coordinates will show identical data.
          Pills only appear at Medium+ severity — raise the threshold in Options
          to hide lower-severity alerts. Click any pill to see raw values.
        </div>
      </div>
    `;
  }

  private _renderPillDetail() {
    if (!this.activePill) return html``;
    const { result, axis } = this.activePill;
    const { raw, risk, etaMinutes } = result;
    const severity = risk[axis];
    const color = SEVERITY_COLOR[severity];
    const axisInfo = PILL_AXES.find((a) => a.key === axis)!;

    let details: Array<{ label: string; value: string }> = [];
    if (axis === 'rain') {
      details = [
        { label: 'Intensity', value: `${raw.rainMmh.toFixed(2)} mm/h` },
        { label: 'Chance of rain', value: `${Math.round(raw.pop * 100)}%` },
        { label: 'Condition', value: raw.weatherDesc || '—' },
      ];
    } else if (axis === 'flood') {
      details = [
        { label: 'Precipitation', value: `${raw.rainMmh.toFixed(2)} mm/h` },
        { label: 'Humidity', value: `${raw.humidity}%` },
        { label: 'Condition', value: raw.weatherDesc || '—' },
      ];
    } else if (axis === 'heat') {
      details = [
        { label: 'Temperature', value: `${kelvinToC(raw.tempKelvin)}°C / ${kelvinToF(raw.tempKelvin)}°F` },
        { label: 'Humidity', value: `${raw.humidity}%` },
        { label: 'Condition', value: raw.weatherDesc || '—' },
      ];
    } else {
      details = [
        { label: 'Condition', value: raw.weatherDesc || '—' },
        { label: 'Humidity', value: `${raw.humidity}%` },
      ];
    }

    return html`
      <div class="detail-card">
        <div class="detail-header">
          <div>
            <div class="detail-title">${axisInfo.label} risk</div>
            <div class="detail-eta">at ${formatEta(etaMinutes)}</div>
          </div>
          <button class="icon-btn" @click=${() => { this.activePill = null; this._render(); }}>✕</button>
        </div>
        ${details.map((d) => html`
          <div class="detail-row">
            <span class="detail-label">${d.label}</span>
            <span class="detail-value">${d.value}</span>
          </div>
        `)}
        <div>
          <span class="detail-severity" style="background:${color}22;color:${color};border:1px solid ${color}66;">
            ${SEVERITY_LABEL[severity]}
          </span>
        </div>
      </div>
    `;
  }

  private _render(): void {
    const { route, results, loading, reloading, overlayPaused, noKey, endpointsOnly,
            showInfo, departureUnix, lastUpdated } = this;
    const isStale = results.some((r) => r.stale);
    const origin = route?.origin ?? '';
    const destination = route?.destination ?? '';
    const worstRisk = this._worstRisk();

    const handlePillClick = (result: ForecastResult, axis: keyof RiskProfile) => {
      this.activePill = { result, axis };
      this.showInfo = false;
      this._render();
    };

    render(
      html`
        <style>${PANEL_STYLE}</style>
        <div class="panel" ?hidden=${!route}>
          <div class="header">
            <div class="header-left">
              <span class="brand">🌧 Rain-N-Route</span>
            </div>
            <div style="display:flex;align-items:center;gap:2px;">
              <button
                class="icon-btn${showInfo ? ' active' : ''}"
                title="Legend — what each pill means"
                @click=${() => { this.showInfo = !this.showInfo; this.activePill = null; this._render(); }}
              ><span class="info-circle">i</span></button>
              <button
                class="icon-btn${reloading ? ' spinning' : ''}"
                title="Reload forecast from Google Maps"
                ?disabled=${reloading}
                @click=${() => { if (this.onReloadCb) { this.reloading = true; this._render(); this.onReloadCb(); } }}
              >↻</button>
              <button class="icon-btn" title="Close" @click=${() => this.setRoute(null)}>✕</button>
            </div>
          </div>
          <div class="route-name">${origin} → ${destination}</div>
          ${reloading ? html`<div class="reload-bar"></div>` : ''}

          ${isStale && !reloading ? html`<div class="stale-badge">⚠ Showing cached data</div>` : ''}
          ${overlayPaused ? html`<div class="paused-banner">Map overlay unavailable</div>` : ''}
          ${endpointsOnly ? html`<div class="warn-banner">Route detail unavailable — endpoint weather only</div>` : ''}
          ${loading && !results.length && !reloading ? html`<div class="loading">Fetching conditions…</div>` : ''}

          ${noKey
            ? html`
              <div class="no-key-card">
                <p>Add your free OpenWeatherMap API key to see weather conditions along your route.</p>
                <button class="no-key-btn" @click=${() => chrome.runtime.openOptionsPage()}>Open Settings</button>
              </div>`
            : ''}

          ${showInfo ? this._renderInfo() : ''}

          ${this.activePill ? this._renderPillDetail() : ''}

          ${!showInfo && !this.activePill && results.length
            ? renderTimeline(results, departureUnix, handlePillClick)
            : ''}
          ${!showInfo && results.length ? renderGearChecklist(worstRisk) : ''}
          ${!showInfo
            ? renderLeaveTime(
                departureUnix,
                (t) => { this.departureUnix = t; this._render(); },
                () => { if (this.onRefetchCb) this.onRefetchCb(); },
              )
            : ''}

          ${lastUpdated ? html`<div class="footer">Updated ${timeAgo(lastUpdated)}</div>` : ''}
        </div>
      `,
      this.shadow,
    );
  }
}
