import { fundById } from '../data/catalog';
import type { Market } from '../data/etfs';
import { PROFILES, type ProfileId } from '../data/profiles';
import { CURRENCIES, type Currency } from './money';
import { MAX_CUSTOM_FUNDS, type CustomItem, type PortfolioSource } from './portfolio';
import { isValidDate, NOTE_MAX, todayISO, toISODate } from './operations';
import type { Answers } from './scoring';

/** A calculation the user recorded as a completed purchase. */
export interface Operation {
  id: string;
  /** When the record was made. */
  createdAt: number;
  updatedAt?: number;
  /** The day the purchase happened, YYYY-MM-DD. */
  date: string;
  note: string;
  source: PortfolioSource;
  total: number;
  currency: Currency;
  market: Market;
  positions: { ticker: string; weight: number; amount: number }[];
}

/** A portfolio the user assembles by hand; funds are market-specific, so each market keeps its own list. */
export interface CustomState {
  market: Market;
  items: Record<Market, CustomItem[]>;
}

export interface AppState {
  answers: Answers;
  currency: Currency;
  market: Market;
  amount: string;
  history: Operation[];
  custom: CustomState;
}

export const MAX_HISTORY = 500;

export const defaultState: AppState = {
  answers: {},
  currency: 'USD',
  market: 'us',
  amount: '',
  history: [],
  custom: { market: 'us', items: { us: [], ucits: [] } },
};

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isCurrency = (v: unknown): v is Currency => CURRENCIES.some((c) => c.code === v);
const isMarket = (v: unknown): v is Market => v === 'us' || v === 'ucits';
const isFiniteNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isProfileId = (v: unknown): v is ProfileId => PROFILES.some((p) => p.id === v);

function normalizeItems(raw: unknown, market?: Market): CustomItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: CustomItem[] = [];
  for (const it of raw) {
    if (!isRecord(it) || typeof it.fundId !== 'string' || !isFiniteNumber(it.weight)) continue;
    const fund = fundById(it.fundId);
    if (!fund || (market && fund.market !== market) || seen.has(fund.id)) continue;
    seen.add(fund.id);
    out.push({ fundId: fund.id, weight: Math.min(100, Math.max(0, Math.round(it.weight))) });
    if (out.length >= MAX_CUSTOM_FUNDS) break;
  }
  return out;
}

function normalizeSource(raw: Record<string, unknown>): PortfolioSource | null {
  const src = raw.source;
  if (isRecord(src)) {
    if (src.kind === 'profile' && isProfileId(src.profileId)) return { kind: 'profile', profileId: src.profileId };
    if (src.kind === 'custom') {
      const items = normalizeItems(src.items).filter((i) => i.weight > 0);
      return items.length > 0 ? { kind: 'custom', items } : null;
    }
    return null;
  }
  // Plans saved before custom portfolios existed only had `profileId`.
  return isProfileId(raw.profileId) ? { kind: 'profile', profileId: raw.profileId } : null;
}

function normalizeOperation(raw: unknown): Operation | null {
  if (!isRecord(raw)) return null;
  const { id, createdAt, total, currency, market, positions } = raw;
  if (typeof id !== 'string' || !isFiniteNumber(createdAt) || !isFiniteNumber(total) || total <= 0) return null;
  if (!isCurrency(currency) || !isMarket(market) || !Array.isArray(positions)) return null;
  const source = normalizeSource(raw);
  if (!source) return null;

  const clean: Operation['positions'] = [];
  for (const p of positions) {
    if (!isRecord(p) || typeof p.ticker !== 'string' || !isFiniteNumber(p.weight) || !isFiniteNumber(p.amount)) return null;
    clean.push({ ticker: p.ticker.slice(0, 12), weight: p.weight, amount: p.amount });
  }
  // Records made before dates/notes existed take the day they were saved.
  const saved = toISODate(new Date(createdAt));
  const date = typeof raw.date === 'string' && isValidDate(raw.date) ? raw.date : isValidDate(saved) ? saved : todayISO();
  const note = typeof raw.note === 'string' ? raw.note.trim().slice(0, NOTE_MAX) : '';
  const op: Operation = { id: id.slice(0, 40), createdAt, date, note, source, total, currency, market, positions: clean };
  if (isFiniteNumber(raw.updatedAt)) op.updatedAt = raw.updatedAt;
  return op;
}

function normalizeCustom(raw: unknown): CustomState {
  if (!isRecord(raw)) return defaultState.custom;
  const items = isRecord(raw.items) ? raw.items : {};
  return {
    market: isMarket(raw.market) ? raw.market : 'us',
    items: { us: normalizeItems(items.us, 'us'), ucits: normalizeItems(items.ucits, 'ucits') },
  };
}

/** Turns anything read from disk or an imported file into a safe AppState. */
export function normalizeState(raw: unknown): AppState {
  if (!isRecord(raw)) return defaultState;

  const answers: Answers = {};
  if (isRecord(raw.answers)) {
    for (const [k, v] of Object.entries(raw.answers)) {
      if (Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 3) answers[k] = v as number;
    }
  }

  return {
    answers,
    currency: isCurrency(raw.currency) ? raw.currency : defaultState.currency,
    market: isMarket(raw.market) ? raw.market : defaultState.market,
    amount: typeof raw.amount === 'string' ? raw.amount.slice(0, 20) : '',
    history: (Array.isArray(raw.history) ? raw.history : [])
      .map(normalizeOperation)
      .filter((p): p is Operation => p !== null)
      .slice(0, MAX_HISTORY),
    custom: normalizeCustom(raw.custom),
  };
}
