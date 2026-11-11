import { describe, expect, it } from 'vitest';
import { CURRENCIES } from './money';
import {
  NBRB_URL,
  RATES_STALE_DAYS,
  RATES_TTL_MS,
  createRatesStore,
  isStale,
  normalizeCachedRates,
  parseNbrb,
  type RatesDeps,
} from './rates';

/** Trimmed copy of a real api.nbrb.by response (12.11.2026). */
const SAMPLE = [
  { Cur_ID: 510, Date: '2026-11-12T00:00:00', Cur_Abbreviation: 'AMD', Cur_Scale: 1000, Cur_OfficialRate: 7.9 },
  { Cur_ID: 431, Date: '2026-11-12T00:00:00', Cur_Abbreviation: 'USD', Cur_Scale: 1, Cur_OfficialRate: 3.007 },
  { Cur_ID: 451, Date: '2026-11-12T00:00:00', Cur_Abbreviation: 'EUR', Cur_Scale: 1, Cur_OfficialRate: 3.3493 },
];
const NOW = Date.UTC(2026, 10, 12, 12, 0, 0);

describe('parseNbrb', () => {
  it('derives USD/EUR/BYN rates from the BYN quotes', () => {
    const r = parseNbrb(SAMPLE, NOW)!;
    expect(r.asOf).toBe('2026-11-12');
    expect(r.fetchedAt).toBe(NOW);
    expect(r.perUsd.USD).toBe(1);
    expect(r.perUsd.BYN).toBeCloseTo(3.007);
    expect(r.perUsd.EUR).toBeCloseTo(3.007 / 3.3493); // cross rate via BYN
    expect(1 / r.perUsd.EUR).toBeCloseTo(1.1138, 3); // EUR/USD
  });

  it('honours the quoting scale', () => {
    const scaled = SAMPLE.map((x) => (x.Cur_Abbreviation === 'USD' ? { ...x, Cur_Scale: 10, Cur_OfficialRate: 30.07 } : x));
    expect(parseNbrb(scaled, NOW)!.usdByn).toBeCloseTo(3.007);
  });

  it('uses the older date if the two quotes disagree', () => {
    const mixed = SAMPLE.map((x) => (x.Cur_Abbreviation === 'EUR' ? { ...x, Date: '2026-11-11T00:00:00' } : x));
    expect(parseNbrb(mixed, NOW)!.asOf).toBe('2026-11-11');
  });

  it('rejects anything that is not a plausible rate table', () => {
    const without = (code: string) => SAMPLE.filter((x) => x.Cur_Abbreviation !== code);
    const patch = (code: string, p: object) => SAMPLE.map((x) => (x.Cur_Abbreviation === code ? { ...x, ...p } : x));
    expect(parseNbrb(null, NOW)).toBeNull();
    expect(parseNbrb({ error: 'x' }, NOW)).toBeNull();
    expect(parseNbrb([], NOW)).toBeNull();
    expect(parseNbrb(without('EUR'), NOW)).toBeNull();
    expect(parseNbrb(without('USD'), NOW)).toBeNull();
    expect(parseNbrb(patch('USD', { Cur_OfficialRate: 0 }), NOW)).toBeNull();
    expect(parseNbrb(patch('USD', { Cur_OfficialRate: -3 }), NOW)).toBeNull();
    expect(parseNbrb(patch('USD', { Cur_OfficialRate: '3.0' }), NOW)).toBeNull();
    expect(parseNbrb(patch('USD', { Cur_Scale: 0 }), NOW)).toBeNull();
    expect(parseNbrb(patch('USD', { Cur_OfficialRate: 3000 }), NOW)).toBeNull(); // absurd magnitude
    expect(parseNbrb(patch('EUR', { Cur_OfficialRate: 30 }), NOW)).toBeNull(); // EUR/USD of ~10 is not real
    expect(parseNbrb(patch('USD', { Date: 'yesterday' }), NOW)).toBeNull();
  });
});

describe('normalizeCachedRates', () => {
  it('round-trips a good value and drops tampered ones', () => {
    const r = parseNbrb(SAMPLE, NOW)!;
    expect(normalizeCachedRates(JSON.parse(JSON.stringify(r)))).toEqual(r);
    expect(normalizeCachedRates({ ...r, usdByn: 9999 })).toBeNull();
    expect(normalizeCachedRates({ ...r, asOf: '2026-13-40' })).toBeNull();
    expect(normalizeCachedRates('nope')).toBeNull();
    expect(normalizeCachedRates(null)).toBeNull();
  });

  it('ignores a stored perUsd and recomputes it from the BYN quotes', () => {
    const r = parseNbrb(SAMPLE, NOW)!;
    const tampered = { ...r, perUsd: { USD: 1, BYN: 1, EUR: 1 } };
    expect(normalizeCachedRates(tampered)!.perUsd.BYN).toBeCloseTo(3.007);
  });
});

describe('isStale', () => {
  it('flags rates not refreshed for over a week', () => {
    const r = parseNbrb(SAMPLE, NOW)!;
    expect(isStale(r, NOW + (RATES_STALE_DAYS - 1) * 86_400_000)).toBe(false);
    expect(isStale(r, NOW + (RATES_STALE_DAYS + 1) * 86_400_000)).toBe(true);
  });
});

function harness(opts: { cached?: unknown; response?: () => Promise<unknown> } = {}) {
  let clock = NOW;
  let stored: string | null = opts.cached === undefined ? null : JSON.stringify(opts.cached);
  const calls: string[] = [];
  const deps: RatesDeps = {
    fetchJson: async (url) => {
      calls.push(url);
      return opts.response ? opts.response() : SAMPLE;
    },
    load: () => stored,
    save: (v) => {
      stored = v;
    },
    now: () => clock,
  };
  return { store: createRatesStore(deps), calls, advance: (ms: number) => (clock += ms), stored: () => stored };
}

describe('rates store', () => {
  it('starts on the static fallback and fetches from the Nationalbank', async () => {
    const h = harness();
    expect(h.store.getSnapshot()).toMatchObject({ rates: null, source: 'static', loading: false, failed: false });
    await h.store.init();
    expect(h.calls).toEqual([NBRB_URL]);
    expect(h.store.getSnapshot()).toMatchObject({ source: 'live', loading: false, failed: false });
    expect(h.store.getSnapshot().rates!.usdByn).toBeCloseTo(3.007);
    expect(JSON.parse(h.stored()!).usdByn).toBeCloseTo(3.007);
  });

  it('does not hit the network while a cached rate is still fresh', async () => {
    const cached = parseNbrb(SAMPLE, NOW)!;
    const h = harness({ cached });
    h.advance(RATES_TTL_MS - 1000);
    await h.store.init();
    expect(h.calls).toHaveLength(0);
    expect(h.store.getSnapshot()).toMatchObject({ source: 'cached', failed: false });
  });

  it('refreshes once the cache is older than the TTL, and on force', async () => {
    const h = harness({ cached: parseNbrb(SAMPLE, NOW)! });
    h.advance(RATES_TTL_MS + 1);
    await h.store.init();
    expect(h.calls).toHaveLength(1);
    expect(h.store.getSnapshot().source).toBe('live');
    await h.store.refresh();
    expect(h.calls).toHaveLength(1); // fresh again
    await h.store.refresh(true);
    expect(h.calls).toHaveLength(2);
  });

  it('keeps showing the cached rate and flags a failure when the network is down', async () => {
    const cached = parseNbrb(SAMPLE, NOW)!;
    const h = harness({ cached, response: () => Promise.reject(new Error('offline')) });
    h.advance(RATES_TTL_MS + 1);
    await h.store.init();
    const s = h.store.getSnapshot();
    expect(s.rates).toEqual(cached);
    expect(s).toMatchObject({ source: 'cached', failed: true, loading: false });
  });

  it('falls back to static and flags a failure when there is no cache at all', async () => {
    const h = harness({ response: () => Promise.reject(new Error('offline')) });
    await h.store.init();
    expect(h.store.getSnapshot()).toMatchObject({ rates: null, source: 'static', failed: true });
  });

  it('treats a garbage response as a failure and never stores it', async () => {
    const h = harness({ response: async () => ({ html: '<h1>Maintenance</h1>' }) });
    await h.store.init();
    expect(h.store.getSnapshot()).toMatchObject({ rates: null, failed: true });
    expect(h.stored()).toBeNull();
  });

  it('ignores a corrupted cache', async () => {
    const h = harness({ cached: { usdByn: 'x' } });
    await h.store.init();
    expect(h.store.getSnapshot().source).toBe('live');
  });

  it('shares one request between concurrent refreshes', async () => {
    const h = harness();
    await Promise.all([h.store.refresh(), h.store.refresh(), h.store.refresh(true)]);
    expect(h.calls).toHaveLength(1);
  });

  it('recovers: a later success clears the failure flag', async () => {
    let fail = true;
    const h = harness({ response: () => (fail ? Promise.reject(new Error('x')) : Promise.resolve(SAMPLE)) });
    await h.store.init();
    expect(h.store.getSnapshot().failed).toBe(true);
    fail = false;
    await h.store.refresh(true);
    expect(h.store.getSnapshot()).toMatchObject({ failed: false, source: 'live' });
  });

  it('notifies subscribers', async () => {
    const h = harness();
    let n = 0;
    const off = h.store.subscribe(() => n++);
    await h.store.refresh();
    expect(n).toBeGreaterThanOrEqual(2); // loading, then done
    off();
    const before = n;
    await h.store.refresh(true);
    expect(n).toBe(before);
  });
});

describe('static fallback', () => {
  it('still defines a sane rate for every supported currency', () => {
    for (const c of CURRENCIES) expect(c.perUsd).toBeGreaterThan(0);
  });
});
