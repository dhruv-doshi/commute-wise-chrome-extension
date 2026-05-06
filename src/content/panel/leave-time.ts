import { html, TemplateResult } from 'lit-html';

function toDateValue(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const yyyy = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mo}-${dd}`;
}

function toTimeValue(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function applyDate(dateValue: string, baseUnix: number): number {
  const d = new Date(baseUnix * 1000);
  const [yyyy, mo, dd] = dateValue.split('-').map(Number);
  d.setFullYear(yyyy, mo - 1, dd);
  return Math.floor(d.getTime() / 1000);
}

function applyTime(timeValue: string, baseUnix: number): number {
  const d = new Date(baseUnix * 1000);
  const [hh, mm] = timeValue.split(':').map(Number);
  d.setHours(hh, mm, 0, 0);
  return Math.floor(d.getTime() / 1000);
}

export function renderLeaveTime(
  departureUnix: number,
  onDepartureChange: (newUnix: number) => void,
  onRefetch: () => void,
): TemplateResult {
  const inputStyle = `
    padding:4px 8px;border:1px solid #d1d5db;
    border-radius:6px;font-size:12px;color:#374151;
    background:#f9fafb;cursor:pointer;outline:none;
  `;

  return html`
    <div style="margin-top:10px;padding-top:8px;border-top:1px solid #f3f4f6;">
      <div class="section-title">Depart At</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:4px;align-items:center;">
        <input
          type="date"
          .value=${toDateValue(departureUnix)}
          @change=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            if (val) onDepartureChange(applyDate(val, departureUnix));
          }}
          style="${inputStyle}"
        />
        <input
          type="time"
          .value=${toTimeValue(departureUnix)}
          @change=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            if (val) onDepartureChange(applyTime(val, departureUnix));
          }}
          style="${inputStyle}"
        />
        <button
          @click=${() => onRefetch()}
          style="
            padding:4px 10px;background:#3b82f6;color:#fff;border:none;
            border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;
          "
        >OK</button>
      </div>
      <p style="margin:4px 0 0;font-size:10px;color:#9ca3af;line-height:1.4;">
        Press OK after changing date/time to refresh forecast.
      </p>
    </div>
  `;
}
