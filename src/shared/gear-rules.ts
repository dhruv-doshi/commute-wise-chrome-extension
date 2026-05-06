/**
 * Pure mapping: RiskProfile → gear checklist items.
 * No I/O. No external deps.
 */

import type { Severity } from './types';
import type { RiskProfile } from './messages';

export interface GearItem {
  id: string;
  label: string;
  /** Which risk axis triggered this item. */
  axis: 'rain' | 'flood' | 'heat' | 'aqi';
  /** Minimum severity that triggers this item. */
  minSeverity: Severity;
}

const SEVERITY_ORDER: Record<Severity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  extreme: 3,
};

function meetsThreshold(actual: Severity, required: Severity): boolean {
  return SEVERITY_ORDER[actual] >= SEVERITY_ORDER[required];
}

const GEAR_CATALOG: GearItem[] = [
  // Rain
  { id: 'umbrella',      label: 'Carry an umbrella',                axis: 'rain',  minSeverity: 'medium'  },
  { id: 'rain-jacket',   label: 'Wear a rain jacket',               axis: 'rain',  minSeverity: 'medium'  },
  { id: 'waterproof-bag',label: 'Use a waterproof bag/cover',       axis: 'rain',  minSeverity: 'medium'  },
  { id: 'rain-boots',    label: 'Wear waterproof footwear',         axis: 'rain',  minSeverity: 'high'    },
  // Flood
  { id: 'route-check',   label: 'Check for flood alerts en-route',  axis: 'flood', minSeverity: 'medium'  },
  { id: 'alt-route',     label: 'Plan an alternate route',          axis: 'flood', minSeverity: 'high'    },
  { id: 'delay-trip',    label: 'Consider delaying the trip',       axis: 'flood', minSeverity: 'extreme' },
  // Heat
  { id: 'water-bottle',  label: 'Carry a water bottle',             axis: 'heat',  minSeverity: 'medium'  },
  { id: 'sun-hat',       label: 'Wear a sun hat / cap',             axis: 'heat',  minSeverity: 'medium'  },
  { id: 'sunscreen',     label: 'Apply sunscreen (SPF 30+)',         axis: 'heat',  minSeverity: 'medium'  },
  { id: 'light-clothes', label: 'Wear light, breathable clothing',  axis: 'heat',  minSeverity: 'high'    },
  { id: 'avoid-peak',    label: 'Avoid peak sun hours if possible', axis: 'heat',  minSeverity: 'extreme' },
  // AQI
  { id: 'n95-mask',      label: 'Wear an N95/KN95 mask',            axis: 'aqi',   minSeverity: 'medium'  },
  { id: 'windows-up',    label: 'Keep car windows closed',          axis: 'aqi',   minSeverity: 'medium'  },
  { id: 'air-purifier',  label: 'Run car air purifier / recirculate',axis: 'aqi',  minSeverity: 'high'    },
  { id: 'limit-outdoor', label: 'Minimise time outdoors',           axis: 'aqi',   minSeverity: 'extreme' },
];

/** Returns the applicable gear items for a given risk profile, sorted by axis then severity. */
export function gearForRisk(risk: RiskProfile): GearItem[] {
  return GEAR_CATALOG.filter((item) => meetsThreshold(risk[item.axis], item.minSeverity));
}
