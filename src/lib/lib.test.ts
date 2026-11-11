import { describe, expect, it } from 'vitest';
import { PROFILES } from '../data/profiles';
import { QUESTIONS } from '../data/questions';
import { buildPlan, splitDca } from './allocate';
import { apportion, toCents } from './money';
import { profileModel } from './portfolio';
import { futureValue } from './projection';
import { rebalance } from './rebalance';
import { assessRisk, isComplete, type Answers } from './scoring';

const answersAll = (idx: number): Answers => Object.fromEntries(QUESTIONS.map((q) => [q.id, idx]));

describe('profiles', () => {
  it.each(PROFILES)('$id weights sum to 100', (p) => {
    expect(Object.values(p.weights).reduce((a, b) => a + (b ?? 0), 0)).toBe(100);
  });
});

describe('apportion', () => {
  it('always adds up exactly', () => {
    for (const total of [1, 7, 100, 33333, 1_000_001]) {
      const parts = apportion(total, [45, 20, 10, 5, 10, 10]);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
  it('handles zero input', () => {
    expect(apportion(0, [1, 2])).toEqual([0, 0]);
    expect(apportion(100, [])).toEqual([]);
  });
});

describe('assessRisk', () => {
  it('all most cautious answers → level 1', () => {
    expect(assessRisk(answersAll(0)).level).toBe(1);
  });
  it('all boldest answers → level 5', () => {
    const r = assessRisk(answersAll(3));
    expect(r.level).toBe(5);
    expect(r.capped).toBe(false);
  });
  it('a short horizon caps an otherwise bold investor', () => {
    const a = { ...answersAll(3), horizon: 0 };
    const r = assessRisk(a);
    expect(r.toleranceLevel).toBe(5);
    expect(r.level).toBe(1);
    expect(r.capped).toBe(true);
  });
  it('no cushion caps at level 2', () => {
    const r = assessRisk({ ...answersAll(3), cushion: 0 });
    expect(r.level).toBe(2);
  });
  it('detects incomplete answers', () => {
    expect(isComplete({})).toBe(false);
    expect(isComplete(answersAll(1))).toBe(true);
  });
});

describe('buildPlan', () => {
  const hunter = PROFILES[3];

  it('amounts add up to the total to the cent', () => {
    for (const total of [1234.56, 10_000, 99.99, 5000.01]) {
      const plan = buildPlan(total, profileModel(hunter, 'us'), 'us', 'USD');
      const sum = plan.positions.reduce((s, p) => s + toCents(p.amount), 0);
      expect(sum).toBe(toCents(total));
    }
  });

  it('keeps only the biggest positions for a tiny budget', () => {
    const plan = buildPlan(150, profileModel(hunter, 'us'), 'us', 'USD');
    expect(plan.positions).toHaveLength(2);
    expect(plan.trimmedFrom).toBe(6);
    expect(plan.positions[0].etf.ticker).toBe('VT');
    expect(plan.positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(100);
  });

  it('scales the small-budget threshold by currency', () => {
    expect(buildPlan(4500, profileModel(hunter, 'us'), 'us', 'BYN').positions).toHaveLength(6);
    expect(buildPlan(1500, profileModel(hunter, 'us'), 'us', 'BYN').positions).toHaveLength(4);
    expect(buildPlan(500, profileModel(hunter, 'us'), 'us', 'BYN').positions).toHaveLength(2);
  });

  it('uses UCITS tickers for the europe market', () => {
    const plan = buildPlan(10_000, profileModel(hunter, 'ucits'), 'ucits', 'EUR');
    expect(plan.positions[0].etf.ticker).toBe('VWCE');
  });

  it('computes weighted fee', () => {
    const plan = buildPlan(10_000, profileModel(PROFILES[0], 'us'), 'us', 'USD');
    expect(plan.ter).toBeGreaterThan(0.03);
    expect(plan.ter).toBeLessThan(0.1);
    expect(plan.yearlyFee).toBeCloseTo((10_000 * plan.ter) / 100);
  });
});

describe('splitDca', () => {
  it('rows add up exactly to each position amount', () => {
    const plan = buildPlan(1000.01, profileModel(PROFILES[2], 'us'), 'us', 'USD');
    const rows = splitDca(plan, 3);
    rows.forEach((row, i) => {
      expect(row.reduce((s, x) => s + toCents(x), 0)).toBe(toCents(plan.positions[i].amount));
    });
  });
});

describe('futureValue', () => {
  it('compounds a lump sum', () => {
    expect(futureValue(1000, 0, 10, 2)).toBeCloseTo(1210);
  });
  it('handles a zero rate', () => {
    expect(futureValue(1000, 100, 0, 1)).toBeCloseTo(2200);
  });
  it('adds monthly contributions', () => {
    expect(futureValue(0, 100, 6, 10)).toBeGreaterThan(100 * 120);
  });
});

describe('rebalance', () => {
  const clever = PROFILES[2];
  const cleverWeights = clever.weights as Record<string, number>;

  it('buy-only spreads new money over underweights and adds up exactly', () => {
    const rows = rebalance({ world: 5000, bonds: 1000 }, 1000, cleverWeights, false);
    expect(rows.every((r) => r.action >= 0)).toBe(true);
    expect(rows.reduce((s, r) => s + toCents(r.action), 0)).toBe(toCents(1000));
    expect(rows.find((r) => r.key === 'world')?.action).toBe(0);
  });

  it('full rebalance sells overweights', () => {
    const rows = rebalance({ world: 10_000 }, 0, cleverWeights, true);
    expect(rows.find((r) => r.key === 'world')!.action).toBeLessThan(0);
    expect(rows.reduce((s, r) => s + r.action, 0)).toBeCloseTo(0, 1);
  });

  it('flags positions outside the profile', () => {
    const rows = rebalance({ em: 1000, world: 1000 }, 0, cleverWeights, true);
    expect(rows.find((r) => r.key === 'em')!.action).toBe(-1000);
  });
});
