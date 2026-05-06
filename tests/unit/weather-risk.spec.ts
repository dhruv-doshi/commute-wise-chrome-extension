import { describe, it, expect } from 'vitest';
import { hourlyToRisk, riskAtTime, dominantSeverity } from '../../src/shared/weather-risk';
import type { OwmHourly } from '../../src/shared/messages';

function makeHourly(overrides: Partial<OwmHourly> = {}): OwmHourly {
  return {
    dt: 1_700_000_000,
    temp: 298.15, // 25°C — baseline: low heat
    humidity: 60,
    weather: [{ id: 800, main: 'Clear' }],
    pop: 0.1,
    ...overrides,
  };
}

describe('hourlyToRisk — rain', () => {
  it('low: dry conditions', () => {
    const r = hourlyToRisk(makeHourly({ rain: undefined, pop: 0.1 }));
    expect(r.rain).toBe('low');
  });

  it('medium: moderate rain (2mm)', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 2 }, pop: 0.5 }));
    expect(r.rain).toBe('medium');
  });

  it('high: heavy rain (7mm)', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 7 }, pop: 0.8 }));
    expect(r.rain).toBe('high');
  });

  it('extreme: very heavy rain (15mm)', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 15 }, pop: 0.95 }));
    expect(r.rain).toBe('extreme');
  });
});

describe('hourlyToRisk — heat', () => {
  it('low: 25°C', () => {
    const r = hourlyToRisk(makeHourly({ temp: 298.15 }));
    expect(r.heat).toBe('low');
  });

  it('medium: 32°C', () => {
    const r = hourlyToRisk(makeHourly({ temp: 305.15 }));
    expect(r.heat).toBe('medium');
  });

  it('high: 38°C', () => {
    const r = hourlyToRisk(makeHourly({ temp: 311.15 }));
    expect(r.heat).toBe('high');
  });

  it('extreme: 45°C', () => {
    const r = hourlyToRisk(makeHourly({ temp: 318.15 }));
    expect(r.heat).toBe('extreme');
  });
});

describe('hourlyToRisk — aqi', () => {
  it('low: clear sky', () => {
    const r = hourlyToRisk(makeHourly({ weather: [{ id: 800, main: 'Clear' }] }));
    expect(r.aqi).toBe('low');
  });

  it('medium: mist (701)', () => {
    const r = hourlyToRisk(makeHourly({ weather: [{ id: 701, main: 'Mist' }] }));
    expect(r.aqi).toBe('medium');
  });

  it('high: smoke (711)', () => {
    const r = hourlyToRisk(makeHourly({ weather: [{ id: 711, main: 'Smoke' }] }));
    expect(r.aqi).toBe('high');
  });

  it('extreme: volcanic ash (762)', () => {
    const r = hourlyToRisk(makeHourly({ weather: [{ id: 762, main: 'Ash' }] }));
    expect(r.aqi).toBe('extreme');
  });
});

describe('hourlyToRisk — flood', () => {
  it('low: dry', () => {
    const r = hourlyToRisk(makeHourly({ rain: undefined, humidity: 50 }));
    expect(r.flood).toBe('low');
  });

  it('medium: moderate rain + high humidity', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 3 }, humidity: 75 }));
    expect(r.flood).toBe('medium');
  });

  it('high: heavy rain + high humidity', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 8 }, humidity: 85 }));
    expect(r.flood).toBe('high');
  });

  it('extreme: very heavy rain', () => {
    const r = hourlyToRisk(makeHourly({ rain: { '1h': 20 }, humidity: 90 }));
    expect(r.flood).toBe('extreme');
  });
});

describe('riskAtTime', () => {
  it('picks the closest hourly entry', () => {
    const hourly: OwmHourly[] = [
      makeHourly({ dt: 1000, temp: 298.15 }),
      makeHourly({ dt: 4600, temp: 318.15 }), // 45°C — extreme heat
    ];
    const risk = riskAtTime(hourly, 4500); // closer to 4600
    expect(risk.heat).toBe('extreme');
  });

  it('returns all-low for empty array', () => {
    const risk = riskAtTime([], 1000);
    expect(risk).toEqual({ rain: 'low', flood: 'low', heat: 'low', aqi: 'low' });
  });

  it('returns the only entry when array has one item', () => {
    const h = makeHourly({ temp: 311.15 }); // 38°C — high
    const risk = riskAtTime([h], 9_999_999);
    expect(risk.heat).toBe('high');
  });
});

describe('dominantSeverity', () => {
  it('returns the highest axis', () => {
    const d = dominantSeverity({ rain: 'low', flood: 'medium', heat: 'high', aqi: 'low' });
    expect(d).toBe('high');
  });

  it('returns low when all are low', () => {
    const d = dominantSeverity({ rain: 'low', flood: 'low', heat: 'low', aqi: 'low' });
    expect(d).toBe('low');
  });

  it('returns extreme when any axis is extreme', () => {
    const d = dominantSeverity({ rain: 'extreme', flood: 'low', heat: 'low', aqi: 'low' });
    expect(d).toBe('extreme');
  });
});
