import { SLOTS, type Etf, type Market } from '../data/etfs';
import type { Profile } from '../data/profiles';
import { apportion, fromCents, staticPerUsd, toCents, type Currency } from './money';
import type { PortfolioModel } from './portfolio';

export interface Position {
  /** Slot id for profile portfolios, fund id for custom ones. */
  key: string;
  etf: Etf;
  title: string;
  blurb: string;
  color: string;
  /** Share of the plan, %. */
  weight: number;
  amount: number;
}

export interface Plan {
  total: number;
  currency: Currency;
  market: Market;
  positions: Position[];
  /** Weighted average expense ratio, % per year. */
  ter: number;
  /** Estimated yearly fund fees in `currency`. */
  yearlyFee: number;
  /** Set when a small budget made us keep only the biggest positions. */
  trimmedFrom?: number;
}

/** Fewer positions for small budgets so broker minimums and fees don't eat the return. */
export function maxPositionsFor(total: number, currency: Currency, perUsd: number = staticPerUsd(currency)): number {
  const usd = total / perUsd;
  if (usd < 300) return 2;
  if (usd < 1500) return 4;
  return Infinity;
}

/** `perUsd` is the units of `currency` per 1 USD; pass the live rate when known. */
export function buildPlan(
  total: number,
  model: PortfolioModel,
  market: Market,
  currency: Currency,
  perUsd?: number,
): Plan {
  const entries = Object.entries(model.weights).filter(([, w]) => w > 0);
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);

  const limit = maxPositionsFor(total, currency, perUsd);
  const kept = sorted.slice(0, limit);
  const trimmed = kept.length < entries.length;

  const weightSum = kept.reduce((s, [, w]) => s + w, 0);
  const cents = apportion(
    toCents(total),
    kept.map(([, w]) => w),
  );

  const positions: Position[] = kept.map(([key, w], i) => ({
    key,
    ...model.holdings[key],
    weight: (w / weightSum) * 100,
    amount: fromCents(cents[i]),
  }));

  const ter = positions.reduce((s, p) => s + (p.weight * p.etf.ter) / 100, 0);
  return {
    total: fromCents(toCents(total)),
    currency,
    market,
    positions,
    ter,
    yearlyFee: (total * ter) / 100,
    trimmedFrom: trimmed ? entries.length : undefined,
  };
}

/** Splits every position into `parts` purchases (dollar-cost averaging). Row sums are exact. */
export function splitDca(plan: Plan, parts: number): number[][] {
  return plan.positions.map((p) => {
    const cents = toCents(p.amount);
    const base = Math.floor(cents / parts);
    const extra = cents - base * parts;
    return Array.from({ length: parts }, (_, i) => fromCents(base + (i < extra ? 1 : 0)));
  });
}

export function equityShare(profile: Profile): number {
  return Object.entries(profile.weights)
    .filter(([slot]) => SLOTS[slot as keyof typeof SLOTS].assetClass === 'equity')
    .reduce((s, [, w]) => s + (w ?? 0), 0);
}
