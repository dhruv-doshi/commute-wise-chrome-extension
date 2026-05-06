import { describe, it, expect } from 'vitest';
import { gearForRisk } from '../../src/shared/gear-rules';
import type { RiskProfile } from '../../src/shared/messages';

function risk(overrides: Partial<RiskProfile> = {}): RiskProfile {
  return { rain: 'low', flood: 'low', heat: 'low', aqi: 'low', ...overrides };
}

describe('gearForRisk', () => {
  it('returns empty list when all axes are low', () => {
    expect(gearForRisk(risk())).toHaveLength(0);
  });

  it('returns umbrella for medium rain', () => {
    const items = gearForRisk(risk({ rain: 'medium' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('umbrella');
  });

  it('returns rain-jacket and waterproof-bag for medium rain', () => {
    const items = gearForRisk(risk({ rain: 'medium' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('rain-jacket');
    expect(ids).toContain('waterproof-bag');
  });

  it('returns rain-boots for high rain', () => {
    const items = gearForRisk(risk({ rain: 'high' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('rain-boots');
  });

  it('returns heat items for medium heat', () => {
    const items = gearForRisk(risk({ heat: 'medium' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('water-bottle');
    expect(ids).toContain('sun-hat');
    expect(ids).toContain('sunscreen');
  });

  it('includes avoid-peak for extreme heat', () => {
    const items = gearForRisk(risk({ heat: 'extreme' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('avoid-peak');
  });

  it('returns aqi gear for medium aqi', () => {
    const items = gearForRisk(risk({ aqi: 'medium' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('n95-mask');
    expect(ids).toContain('windows-up');
  });

  it('returns limit-outdoor for extreme aqi', () => {
    const items = gearForRisk(risk({ aqi: 'extreme' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('limit-outdoor');
  });

  it('returns flood items for high flood', () => {
    const items = gearForRisk(risk({ flood: 'high' }));
    const ids = items.map((i) => i.id);
    expect(ids).toContain('alt-route');
  });

  it('includes delay-trip only for extreme flood', () => {
    const high = gearForRisk(risk({ flood: 'high' })).map((i) => i.id);
    const extreme = gearForRisk(risk({ flood: 'extreme' })).map((i) => i.id);
    expect(high).not.toContain('delay-trip');
    expect(extreme).toContain('delay-trip');
  });

  it('combines items from multiple axes without duplicates', () => {
    const items = gearForRisk(risk({ rain: 'high', heat: 'medium', aqi: 'medium' }));
    const ids = items.map((i) => i.id);
    const uniqueIds = [...new Set(ids)];
    expect(ids).toHaveLength(uniqueIds.length);
    expect(ids).toContain('rain-jacket');
    expect(ids).toContain('water-bottle');
    expect(ids).toContain('n95-mask');
  });
});
