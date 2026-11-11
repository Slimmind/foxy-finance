import { isValidDate } from './operations';
import type { Currency } from './money';

/** Official exchange rates of the National Bank of the Republic of Belarus. Public, keyless, CORS-enabled. */
export const NBRB_URL = 'https://api.nbrb.by/exrates/rates?periodicity=0';

/** The Bank sets rates once a day, so re-checking more often is pointless. */
export const RATES_TTL_MS = 3 * 60 * 60 * 1000;
/** After this long we call the rate stale in the UI. */
export const RATES_STALE_DAYS = 7;

export interface Rates {
  /** Units of each currency per 1 USD (USD itself is 1). */
  perUsd: Record<Currency, number>;
  usdByn: number;
  eurByn: number;
  /** The date the National Bank set these rates for, YYYY-MM-DD. */
  asOf: string;
  /** When this app downloaded them (ms since epoch). */
  fetchedAt: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Guards against a broken or hijacked response: rates outside these bounds are never plausible. */
export function buildRates(usdByn: number, eurByn: number, asOf: string, fetchedAt: number): Rates | null {
  const cross = eurByn / usdByn;
  if (!(usdByn > 0.1 && usdByn < 100 && eurByn > 0.1 && eurByn < 100)) return null;
  if (!(cross > 0.5 && cross < 2)) return null;
  if (!isValidDate(asOf) || !isNum(fetchedAt) || fetchedAt <= 0) return null;
  return { perUsd: { USD: 1, BYN: usdByn, EUR: usdByn / eurByn }, usdByn, eurByn, asOf, fetchedAt };
}

/** Price of one unit of `code` in BYN, taking the quoting scale into account (e.g. 100 UAH). */
function bynPerUnit(list: unknown[], code: string): { rate: number; date: string } | null {
  const item = list.find((x) => isRecord(x) && x.Cur_Abbreviation === code);
  if (!isRecord(item)) return null;
  const { Cur_OfficialRate: rate, Cur_Scale: scale, Date: date } = item;
  if (!isNum(rate) || !isNum(scale) || rate <= 0 || scale <= 0 || typeof date !== 'string') return null;
  const day = date.slice(0, 10);
  // Each quote must carry a real date of its own; otherwise a bad one could hide behind the other.
  if (!isValidDate(day)) return null;
  return { rate: rate / scale, date: day };
}

/** Parses the response of `exrates/rates?periodicity=0`. Returns null if anything is off. */
export function parseNbrb(raw: unknown, now: number): Rates | null {
  if (!Array.isArray(raw)) return null;
  const usd = bynPerUnit(raw, 'USD');
  const eur = bynPerUnit(raw, 'EUR');
  if (!usd || !eur) return null;
  // If the two dates ever differ, trust the older one.
  const asOf = usd.date < eur.date ? usd.date : eur.date;
  return buildRates(usd.rate, eur.rate, asOf, now);
}

/** Re-validates what was stored on disk; anything malformed is dropped. */
export function normalizeCachedRates(raw: unknown): Rates | null {
  if (!isRecord(raw) || !isNum(raw.usdByn) || !isNum(raw.eurByn) || typeof raw.asOf !== 'string' || !isNum(raw.fetchedAt)) {
    return null;
  }
  return buildRates(raw.usdByn, raw.eurByn, raw.asOf, raw.fetchedAt);
}

export const isStale = (rates: Rates, now: number): boolean => now - rates.fetchedAt > RATES_STALE_DAYS * 24 * 60 * 60 * 1000;

export type RatesSource = 'live' | 'cached' | 'static';

export interface RatesSnapshot {
  rates: Rates | null;
  /** live: downloaded in this session; cached: from the last session; static: nothing available yet. */
  source: RatesSource;
  loading: boolean;
  /** The last refresh attempt failed (offline, blocked, bad response). */
  failed: boolean;
}

export interface RatesDeps {
  fetchJson(url: string): Promise<unknown>;
  load(): string | null;
  save(value: string): void;
  now(): number;
}

export function createRatesStore(deps: RatesDeps) {
  let snapshot: RatesSnapshot = { rates: null, source: 'static', loading: false, failed: false };
  let inflight: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const set = (patch: Partial<RatesSnapshot>) => {
    snapshot = { ...snapshot, ...patch };
    listeners.forEach((l) => l());
  };

  /** Downloads fresh rates unless the stored ones are recent enough (or `force`). Never throws. */
  function refresh(force = false): Promise<void> {
    const { rates } = snapshot;
    if (!force && rates && deps.now() - rates.fetchedAt < RATES_TTL_MS) return Promise.resolve();
    if (inflight) return inflight;

    set({ loading: true });
    inflight = (async () => {
      try {
        const parsed = parseNbrb(await deps.fetchJson(NBRB_URL), deps.now());
        if (!parsed) throw new Error('unexpected response');
        try {
          deps.save(JSON.stringify(parsed));
        } catch {
          // Storage may be full or blocked; the rates still work for this session.
        }
        set({ rates: parsed, source: 'live', loading: false, failed: false });
      } catch {
        set({ loading: false, failed: true });
      } finally {
        inflight = null;
      }
    })();
    return inflight;
  }

  function init(): Promise<void> {
    const raw = deps.load();
    if (raw) {
      try {
        const cached = normalizeCachedRates(JSON.parse(raw));
        if (cached) set({ rates: cached, source: 'cached' });
      } catch {
        // corrupted cache: ignore and fetch
      }
    }
    return refresh();
  }

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    init,
    refresh,
  };
}

export type RatesStore = ReturnType<typeof createRatesStore>;
