import { html, TemplateResult } from 'lit-html';
import type { ForecastResult, RiskProfile } from '../../shared/messages';
import type { Severity } from '../../shared/types';

export const SEVERITY_COLOR: Record<Severity, string> = {
  low:     '#3B82F6',
  medium:  '#F59E0B',
  high:    '#EF4444',
  extreme: '#7C3AED',
};

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0, medium: 1, high: 2, extreme: 3,
};

function formatEta(etaMinutes: number): string {
  if (etaMinutes === 0) return 'Now';
  const h = Math.floor(etaMinutes / 60);
  const m = etaMinutes % 60;
  if (h === 0) return `+${m}m`;
  if (m === 0) return `+${h}h`;
  return `+${h}h ${m}m`;
}

export const PILL_AXES: Array<{ key: keyof RiskProfile; abbr: string; label: string }> = [
  { key: 'rain',  abbr: 'R', label: 'Rain'        },
  { key: 'flood', abbr: 'F', label: 'Flood'       },
  { key: 'heat',  abbr: 'H', label: 'Heat'        },
  { key: 'aqi',   abbr: 'A', label: 'Air Quality' },
];

function renderPills(
  result: ForecastResult,
  onPillClick: (result: ForecastResult, axis: keyof RiskProfile) => void,
): TemplateResult {
  const { risk } = result;
  const active = PILL_AXES.filter((a) => SEVERITY_ORDER[risk[a.key]] >= SEVERITY_ORDER['medium']);

  if (active.length === 0) {
    return html`<span style="color:#9ca3af;font-size:11px;">✓ Clear</span>`;
  }

  return html`${active.map(
    (a) => html`
      <span
        title="${a.label}: ${risk[a.key]}"
        @click=${(e: Event) => { e.stopPropagation(); onPillClick(result, a.key); }}
        style="
          display:inline-flex;align-items:center;gap:3px;
          background:${SEVERITY_COLOR[risk[a.key]]}22;
          color:${SEVERITY_COLOR[risk[a.key]]};
          border:1px solid ${SEVERITY_COLOR[risk[a.key]]}66;
          border-radius:99px;padding:1px 6px;font-size:10px;font-weight:600;
          cursor:pointer;user-select:none;
        "
      >
        <span style="
          width:6px;height:6px;border-radius:50%;
          background:${SEVERITY_COLOR[risk[a.key]]};
          flex-shrink:0;
        "></span>
        ${a.abbr}
      </span>
    `,
  )}`;
}

export function renderTimeline(
  results: ForecastResult[],
  _departureUnix: number,
  onPillClick: (result: ForecastResult, axis: keyof RiskProfile) => void,
): TemplateResult {
  return html`
    <div style="margin-top:10px;">
      <div class="section-title">Route Conditions</div>
      ${results.map(
        (r) => html`
          <div style="
            display:flex;align-items:center;gap:8px;
            padding:6px 0;border-bottom:1px solid #f3f4f6;
          ">
            <span style="min-width:46px;font-size:11px;color:#6b7280;font-weight:500;">
              ${formatEta(r.etaMinutes)}
            </span>
            <div style="display:flex;flex-wrap:wrap;gap:3px;">
              ${renderPills(r, onPillClick)}
            </div>
          </div>
        `,
      )}
    </div>
  `;
}
