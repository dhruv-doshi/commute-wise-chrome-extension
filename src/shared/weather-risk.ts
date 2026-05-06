/**
 * Pure mapping: OWM One Call hourly entry → RiskProfile.
 * No I/O. No external deps. Fully unit-testable.
 */

import type { Severity } from './types';
import type { OwmHourly, RiskProfile } from './messages';

// ---------------------------------------------------------------------------
// Rain risk — based on hourly precipitation (mm) and probability of precipitation
// ---------------------------------------------------------------------------

function rainSeverity(hourly: OwmHourly): Severity {
  const mm = hourly.rain?.['1h'] ?? 0;
  const pop = hourly.pop;

  // Light drizzle/low chance: low
  if (mm < 1 && pop < 0.4) return 'low';
  // Moderate rain or moderate chance of heavy rain
  if (mm < 4 || pop < 0.6) return 'medium';
  // Heavy rain
  if (mm < 10) return 'high';
  return 'extreme';
}

// ---------------------------------------------------------------------------
// Flood risk — proxy: very heavy rain + high humidity (no dedicated OWM field)
// ---------------------------------------------------------------------------

function floodSeverity(hourly: OwmHourly): Severity {
  const mm = hourly.rain?.['1h'] ?? 0;
  const humidity = hourly.humidity;

  if (mm < 2) return 'low';
  if (mm < 6 || humidity < 80) return 'medium';
  if (mm < 15) return 'high';
  return 'extreme';
}

// ---------------------------------------------------------------------------
// Heat risk — based on temperature (Kelvin → Celsius)
// ---------------------------------------------------------------------------

function heatSeverity(hourly: OwmHourly): Severity {
  const celsius = hourly.temp - 273.15;

  if (celsius < 30) return 'low';
  if (celsius < 35) return 'medium';
  if (celsius < 42) return 'high';
  return 'extreme';
}

// ---------------------------------------------------------------------------
// AQI — OWM One Call does not include AQI; we proxy it via weather condition ID.
// Smoke (7xx), Haze (721), Dust (7x1), Fog (741) are the haze-family conditions.
// ---------------------------------------------------------------------------

function aqiSeverity(hourly: OwmHourly): Severity {
  for (const w of hourly.weather) {
    const id = w.id;
    // 700–799: atmosphere group (mist, smoke, haze, dust, fog, sand, ash, squall, tornado)
    if (id >= 700 && id < 800) {
      if (id === 711 || id === 721 || id === 731 || id === 741 || id === 751 || id === 761 || id === 762) {
        // Smoke, haze, dust/sand/ash — visible particulates
        return id === 762 ? 'extreme' : 'high'; // volcanic ash = extreme
      }
      return 'medium'; // other atmosphere conditions
    }
  }
  return 'low';
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Maps a single OWM hourly forecast entry to a risk profile. */
export function hourlyToRisk(hourly: OwmHourly): RiskProfile {
  return {
    rain: rainSeverity(hourly),
    flood: floodSeverity(hourly),
    heat: heatSeverity(hourly),
    aqi: aqiSeverity(hourly),
  };
}

/** Returns the hourly entry whose `dt` is closest to `atUnixTs` (seconds). */
export function hourlyAtTime(hourly: OwmHourly[], atUnixTs: number): OwmHourly | null {
  if (hourly.length === 0) return null;
  let closest = hourly[0];
  let minDiff = Math.abs(hourly[0].dt - atUnixTs);
  for (let i = 1; i < hourly.length; i++) {
    const diff = Math.abs(hourly[i].dt - atUnixTs);
    if (diff < minDiff) { minDiff = diff; closest = hourly[i]; }
  }
  return closest;
}

/**
 * Picks the hourly entry closest to `atUnixTs` (seconds) from the OWM hourly array.
 * Returns the risk profile for that entry.
 */
export function riskAtTime(hourly: OwmHourly[], atUnixTs: number): RiskProfile {
  const entry = hourlyAtTime(hourly, atUnixTs);
  if (!entry) return { rain: 'low', flood: 'low', heat: 'low', aqi: 'low' };
  return hourlyToRisk(entry);
}

/** The "dominant" severity across all four risk axes — for a single-icon summary. */
export function dominantSeverity(risk: RiskProfile): Severity {
  const order: Severity[] = ['low', 'medium', 'high', 'extreme'];
  const max = Math.max(
    order.indexOf(risk.rain),
    order.indexOf(risk.flood),
    order.indexOf(risk.heat),
    order.indexOf(risk.aqi),
  );
  return order[max];
}
