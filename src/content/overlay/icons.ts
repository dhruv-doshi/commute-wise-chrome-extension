import type { Severity, WeatherKind } from '../../shared/types';

const SEVERITY_COLOR: Record<Severity, string> = {
  low: '#3B82F6',     // blue-500
  medium: '#F59E0B',  // amber-500
  high: '#EF4444',    // red-500
  extreme: '#7C3AED', // purple-600
};

// Each icon is a 20×20 SVG string with a `{{color}}` placeholder.
const ICON_PATHS: Record<WeatherKind, string> = {
  rain: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
    <circle cx="10" cy="10" r="10" fill="white" opacity="0.85"/>
    <path d="M6 8.5C6 6.57 7.57 5 9.5 5c1.56 0 2.88.99 3.35 2.38C13.22 7.14 13.61 7 14 7c1.1 0 2 .9 2 2s-.9 2-2 2H6c-1.1 0-2-.9-2-2s.9-2 2-2z" fill="{{color}}"/>
    <line x1="8" y1="12" x2="7" y2="15" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="11" y1="12" x2="10" y2="15" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14" y1="12" x2="13" y2="15" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  flood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
    <circle cx="10" cy="10" r="10" fill="white" opacity="0.85"/>
    <path d="M4 12 Q6 10 8 12 Q10 14 12 12 Q14 10 16 12" fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 15 Q6 13 8 15 Q10 17 12 15 Q14 13 16 15" fill="none" stroke="{{color}}" stroke-width="2" stroke-linecap="round"/>
    <path d="M9 4 L10 7 L11 4" fill="none" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  heat: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
    <circle cx="10" cy="10" r="10" fill="white" opacity="0.85"/>
    <circle cx="10" cy="10" r="4" fill="{{color}}"/>
    <line x1="10" y1="3" x2="10" y2="5" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="10" y1="15" x2="10" y2="17" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="3" y1="10" x2="5" y2="10" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="15" y1="10" x2="17" y2="10" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="5.22" y1="5.22" x2="6.64" y2="6.64" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="13.36" y1="13.36" x2="14.78" y2="14.78" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="14.78" y1="5.22" x2="13.36" y2="6.64" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="6.64" y1="13.36" x2="5.22" y2="14.78" stroke="{{color}}" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  aqi: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" width="20" height="20">
    <circle cx="10" cy="10" r="10" fill="white" opacity="0.85"/>
    <ellipse cx="10" cy="9" rx="6" ry="4" fill="{{color}}" opacity="0.6"/>
    <ellipse cx="7" cy="11" rx="4" ry="3" fill="{{color}}" opacity="0.7"/>
    <ellipse cx="13" cy="11" rx="4" ry="3" fill="{{color}}" opacity="0.7"/>
    <ellipse cx="10" cy="13" rx="5" ry="3" fill="{{color}}"/>
  </svg>`,
};

const ICON_SIZE = 20;

/** Returns an SVG string for the given kind and severity. */
export function renderIconSvg(kind: WeatherKind, severity: Severity): string {
  return ICON_PATHS[kind].replace(/{{color}}/g, SEVERITY_COLOR[severity]);
}

/** Creates a positioned div element containing the weather icon. */
export function createIconElement(kind: WeatherKind, severity: Severity): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = `
    position: absolute;
    width: ${ICON_SIZE}px;
    height: ${ICON_SIZE}px;
    pointer-events: auto;
    cursor: default;
    transform: translate(-50%, -50%);
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.4));
  `.trim();
  el.dataset['kind'] = kind;
  el.dataset['severity'] = severity;
  el.innerHTML = renderIconSvg(kind, severity);
  el.title = `${kind} — ${severity}`;
  return el;
}

export { ICON_SIZE };
