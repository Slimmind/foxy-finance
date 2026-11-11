import { describe, expect, it } from 'vitest';
import { CATEGORIES, CATEGORY_ORDER, FUNDS, fundById, fundsOf } from '../data/catalog';
import { SLOTS } from '../data/etfs';
import { PROFILES } from '../data/profiles';
import { buildPlan } from './allocate';
import { toCents } from './money';
import {
  addFund,
  analyzeCustom,
  customModel,
  equalWeights,
  isEvenSplit,
  normalizeWeights,
  removeFund,
  profileModel,
  weightTotal,
  type CustomItem,
} from './portfolio';
import { defaultState, normalizeState } from './storage';

const item = (ticker: string, weight: number, market: 'us' | 'ucits' = 'us'): CustomItem => ({
  fundId: `${market}:${ticker.toLowerCase()}`,
  weight,
});

describe('fund catalog', () => {
  it('has unique ids and tickers per market', () => {
    expect(new Set(FUNDS.map((f) => f.id)).size).toBe(FUNDS.length);
  });

  it('references only known categories and has sane data', () => {
    for (const f of FUNDS) {
      expect(CATEGORIES[f.category], f.id).toBeDefined();
      expect(f.ter, f.id).toBeGreaterThan(0);
      expect(f.ter, f.id).toBeLessThan(1.5);
      expect(f.summary.length, f.id).toBeGreaterThan(10);
      if (f.isin) expect(f.isin, f.id).toMatch(/^[A-Z]{2}[A-Z0-9]{9}\d$/);
    }
  });

  it('keeps the ISINs that were cross-checked against OpenFIGI / the issuer', () => {
    // Pinned after a manual check: a wrong ISIN here would send someone to buy a different fund.
    const checked: Record<string, string> = {
      'ucits:vuaa': 'IE00BFMXXD54', // Vanguard S&P 500 UCITS ETF (USD) Accumulating
      'ucits:ibts': 'IE00B14X4S71', // iShares $ Treasury Bond 1-3yr UCITS ETF USD (Dist)
      'ucits:iwda': 'IE00B4L5Y983',
      'ucits:vwce': 'IE00BK5BQT80',
    };
    for (const [id, isin] of Object.entries(checked)) expect(fundById(id)?.isin, id).toBe(isin);
  });

  it('gives every UCITS fund an ISIN, since tickers differ between exchanges', () => {
    for (const f of fundsOf('ucits')) expect(f.isin, f.id).toBeDefined();
  });

  it('orders every category exactly once', () => {
    expect([...CATEGORY_ORDER].sort()).toEqual(Object.keys(CATEGORIES).sort());
  });

  it('contains every fund used by the profile models, with matching ticker and fee', () => {
    for (const slot of Object.values(SLOTS)) {
      for (const market of ['us', 'ucits'] as const) {
        const etf = slot.etf[market];
        const fund = fundById(`${market}:${etf.ticker.toLowerCase()}`);
        expect(fund, `${market}:${etf.ticker}`).toBeDefined();
        expect(fund!.ter, etf.ticker).toBe(etf.ter);
      }
    }
  });
});

describe('weights helpers', () => {
  it('equalWeights always adds up to 100', () => {
    for (const n of [1, 2, 3, 7, 12]) {
      const items = Array.from({ length: n }, (_, i) => item(fundsOf('us')[i].ticker, 0));
      expect(weightTotal(equalWeights(items))).toBe(100);
    }
  });

  it('normalizeWeights scales proportionally to exactly 100', () => {
    const out = normalizeWeights([item('VT', 30), item('BND', 10), item('GLDM', 10)]);
    expect(weightTotal(out)).toBe(100);
    expect(out.map((o) => o.weight)).toEqual([60, 20, 20]);
  });

  it('normalizeWeights falls back to equal split when nothing is entered', () => {
    expect(weightTotal(normalizeWeights([item('VT', 0), item('BND', 0)]))).toBe(100);
  });
});

describe('customModel / analyzeCustom', () => {
  it('splits the asset classes and the fee by weight', () => {
    const a = analyzeCustom([item('VT', 60), item('BND', 30), item('GLDM', 10)]);
    expect(a.byClass.equity).toBeCloseTo(60);
    expect(a.byClass.bonds).toBeCloseTo(30);
    expect(a.byClass.gold).toBeCloseTo(10);
    expect(a.ter).toBeCloseTo(0.6 * 0.06 + 0.3 * 0.03 + 0.1 * 0.1);
    expect(a.returns.low).toBeLessThan(a.returns.base);
    expect(a.returns.base).toBeLessThan(a.returns.high);
  });

  it('scales to 100 when weights do not add up', () => {
    const m = customModel([item('VT', 30), item('BND', 10)]);
    expect(Object.values(m.weights).reduce((s, w) => s + w, 0)).toBeCloseTo(100);
    expect(m.weights['us:vt']).toBeCloseTo(75);
  });

  it('is deterministic for an empty or unknown selection', () => {
    expect(analyzeCustom([]).total).toBe(0);
    expect(analyzeCustom([{ fundId: 'us:nope', weight: 50 }]).total).toBe(0);
  });

  it('rates an all-bond portfolio as calmer than an all-tech one', () => {
    const calm = analyzeCustom([item('SHY', 100)]);
    const wild = analyzeCustom([item('QQQM', 100)]);
    expect(calm.drawdown).toBeLessThan(wild.drawdown);
    expect(calm.equityShare).toBe(0);
    expect(wild.equityShare).toBe(100);
  });

  it('flags overlap, concentration and missing defensive part', () => {
    const notes = analyzeCustom([item('VT', 50), item('VOO', 30), item('QQQM', 20)]).notes.join(' | ');
    expect(notes).toContain('весь мир');
    expect(notes).toMatch(/VT занимает 50%/);
    expect(notes).toMatch(/Акции составляют 100%/);
  });

  it('warns about duplicates in one category', () => {
    const notes = analyzeCustom([item('VOO', 50), item('VTI', 50)]).notes.join(' | ');
    expect(notes).toContain('VOO, VTI');
  });

  it('warns that a single fund is not diversified across asset classes', () => {
    expect(analyzeCustom([item('VT', 100)]).notes[0]).toContain('один фонд');
  });

  it('feeds the plan builder like a profile does: amounts add up to the cent', () => {
    const model = customModel([item('VT', 40), item('BND', 35), item('GLDM', 25)]);
    const plan = buildPlan(10_000.01, model, 'us', 'USD');
    expect(plan.positions.reduce((s, p) => s + toCents(p.amount), 0)).toBe(toCents(10_000.01));
    expect(plan.positions[0].etf.ticker).toBe('VT');
    expect(plan.positions.every((p) => p.color && p.title)).toBe(true);
  });
});

describe('profileModel', () => {
  it.each(PROFILES)('$id: weights sum to 100 and every key has a holding', (p) => {
    const m = profileModel(p, 'ucits');
    expect(Object.values(m.weights).reduce((s, w) => s + w, 0)).toBe(100);
    for (const key of Object.keys(m.weights)) expect(m.holdings[key]).toBeDefined();
  });
});

describe('colours stay consistent between profiles and the catalog', () => {
  it.each(['us', 'ucits'] as const)('%s: every profile holding has its catalog category colour', (market) => {
    for (const p of PROFILES) {
      const m = profileModel(p, market);
      for (const h of Object.values(m.holdings)) {
        const fund = fundById(`${market}:${h.etf.ticker.toLowerCase()}`);
        expect(h.color, `${market}:${h.etf.ticker}`).toBe(CATEGORIES[fund!.category].color);
      }
    }
  });
});

describe('storage migration for custom portfolios', () => {
  const legacyPlan = {
    id: '1',
    createdAt: 1,
    profileId: 'clever',
    total: 1000,
    currency: 'EUR',
    market: 'ucits',
    positions: [{ slot: 'world', ticker: 'VWCE', weight: 100, amount: 1000 }],
  };

  it('upgrades plans saved before custom portfolios existed', () => {
    const s = normalizeState({ history: [legacyPlan] });
    expect(s.history).toHaveLength(1);
    expect(s.history[0].source).toEqual({ kind: 'profile', profileId: 'clever' });
    expect(s.history[0].positions).toEqual([{ ticker: 'VWCE', weight: 100, amount: 1000 }]);
    expect(s.custom).toEqual(defaultState.custom);
  });

  it('keeps valid custom portfolios and drops unknown or foreign-market funds', () => {
    const s = normalizeState({
      custom: {
        market: 'ucits',
        items: {
          us: [item('VT', 60), { fundId: 'us:nope', weight: 10 }, item('VT', 5), item('VWCE', 10, 'ucits')],
          ucits: [item('VWCE', 100, 'ucits')],
        },
      },
    });
    expect(s.custom.market).toBe('ucits');
    expect(s.custom.items.us).toEqual([item('VT', 60)]);
    expect(s.custom.items.ucits).toEqual([item('VWCE', 100, 'ucits')]);
  });

  it('clamps weights and rejects custom plans without usable funds', () => {
    const s = normalizeState({
      custom: { market: 'us', items: { us: [item('VT', 500), item('BND', -4.6)], ucits: [] } },
      history: [
        { ...legacyPlan, source: { kind: 'custom', items: [] } },
        { ...legacyPlan, source: { kind: 'custom', items: [item('VT', 100)] } },
      ],
    });
    expect(s.custom.items.us).toEqual([item('VT', 100), item('BND', 0)]);
    expect(s.history).toHaveLength(1);
    expect(s.history[0].source.kind).toBe('custom');
  });
});

describe('adding and removing funds keeps the money shared', () => {
  const ids = ['us:vt', 'us:bnd', 'us:gldm', 'us:voo'];
  const build = (n: number) => ids.slice(0, n).reduce<CustomItem[]>((acc, id) => addFund(acc, id), []);

  it('the first fund gets everything, and each added fund splits evenly (the reported bug: 100/0/0)', () => {
    expect(build(1).map((i) => i.weight)).toEqual([100]);
    expect(build(2).map((i) => i.weight)).toEqual([50, 50]);
    expect(build(3).map((i) => i.weight)).toEqual([34, 33, 33]);
    expect(build(4).map((i) => i.weight)).toEqual([25, 25, 25, 25]);
  });

  it('always adds up to 100 and never leaves a fund at 0% while the split is untouched', () => {
    for (let n = 1; n <= 4; n++) {
      const items = build(n);
      expect(weightTotal(items)).toBe(100);
      expect(items.every((i) => i.weight > 0)).toBe(true);
    }
  });

  it('respects the user’s own weights: a new fund starts at 0% and nothing else moves', () => {
    const tuned: CustomItem[] = [
      { fundId: 'us:vt', weight: 70 },
      { fundId: 'us:bnd', weight: 30 },
    ];
    expect(isEvenSplit(tuned)).toBe(false);
    expect(addFund(tuned, 'us:gldm')).toEqual([...tuned, { fundId: 'us:gldm', weight: 0 }]);
  });

  it('re-splits after removal only while the split is untouched', () => {
    expect(removeFund(build(3), 'us:bnd').map((i) => [i.fundId, i.weight])).toEqual([
      ['us:vt', 50],
      ['us:gldm', 50],
    ]);
    const tuned: CustomItem[] = [
      { fundId: 'us:vt', weight: 70 },
      { fundId: 'us:bnd', weight: 30 },
    ];
    expect(removeFund(tuned, 'us:bnd')).toEqual([{ fundId: 'us:vt', weight: 70 }]);
    expect(removeFund(build(1), 'us:vt')).toEqual([]);
  });

  it('ignores duplicates and the 12-fund cap', () => {
    const one = build(1);
    expect(addFund(one, 'us:vt')).toBe(one);
    let items: CustomItem[] = [];
    for (const f of fundsOf('us').slice(0, 14)) items = addFund(items, f.id);
    expect(items).toHaveLength(12);
    expect(weightTotal(items)).toBe(100);
  });

  it('feeds the plan: three untouched funds really share the amount', () => {
    const plan = buildPlan(10_000, customModel(build(3)), 'us', 'USD');
    expect(plan.positions.map((p) => p.etf.ticker)).toEqual(['VT', 'BND', 'GLDM']);
    expect(plan.positions.map((p) => p.amount)).toEqual([3400, 3300, 3300]);
  });
});
