import { html, TemplateResult } from 'lit-html';
import { gearForRisk, GearItem } from '../../shared/gear-rules';
import type { RiskProfile } from '../../shared/messages';

const AXIS_LABEL: Record<GearItem['axis'], string> = {
  rain:  'Rain',
  flood: 'Flood',
  heat:  'Heat',
  aqi:   'Air Quality',
};

export function renderGearChecklist(risk: RiskProfile): TemplateResult {
  const items = gearForRisk(risk);

  if (items.length === 0) {
    return html`
      <div style="margin-top:10px;">
        <div class="section-title">Gear</div>
        <p style="color:#9ca3af;font-size:12px;margin:4px 0 0;">No special gear needed.</p>
      </div>
    `;
  }

  const byAxis = new Map<GearItem['axis'], GearItem[]>();
  for (const item of items) {
    const bucket = byAxis.get(item.axis) ?? [];
    bucket.push(item);
    byAxis.set(item.axis, bucket);
  }

  const axisOrder: GearItem['axis'][] = ['rain', 'flood', 'heat', 'aqi'];

  return html`
    <div style="margin-top:10px;">
      <div class="section-title">Gear Checklist</div>
      ${axisOrder
        .filter((axis) => byAxis.has(axis))
        .map(
          (axis) => html`
            <div style="margin-top:6px;">
              <div style="font-size:10px;font-weight:600;color:#6b7280;margin-bottom:2px;">
                ${AXIS_LABEL[axis]}
              </div>
              <ul style="margin:0;padding-left:16px;">
                ${byAxis.get(axis)!.map(
                  (item) => html`
                    <li style="font-size:12px;color:#374151;padding:1px 0;">${item.label}</li>
                  `,
                )}
              </ul>
            </div>
          `,
        )}
    </div>
  `;
}
