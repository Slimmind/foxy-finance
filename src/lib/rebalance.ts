import { apportion, fromCents, toCents } from './money';

export interface RebalanceRow {
  key: string;
  current: number;
  target: number;
  /** >0 buy, <0 sell. */
  action: number;
}

/**
 * Compares current holdings with the target mix (`weights`, key -> percent).
 * With `allowSell = false` only new money is used: it is spread over the underweight positions.
 */
export function rebalance(
  current: Record<string, number>,
  newMoney: number,
  weights: Record<string, number>,
  allowSell: boolean,
): RebalanceRow[] {
  const keys = Object.keys(weights);
  // Holdings outside the model (e.g. an old position) still count and are suggested to be sold.
  const extra = Object.keys(current).filter((k) => !keys.includes(k) && (current[k] ?? 0) > 0);
  const all = [...keys, ...extra];

  const held = all.reduce((s, k) => s + (current[k] ?? 0), 0);
  const total = held + newMoney;

  const rows = all.map((key) => {
    const cur = current[key] ?? 0;
    const target = (total * (weights[key] ?? 0)) / 100;
    return { key, current: cur, target, diff: target - cur };
  });

  if (allowSell) {
    return rows.map((r) => ({ key: r.key, current: r.current, target: r.target, action: Math.round(r.diff * 100) / 100 }));
  }

  const deficits = rows.map((r) => Math.max(0, r.diff));
  const spread = apportion(toCents(newMoney), deficits);
  return rows.map((r, i) => ({ key: r.key, current: r.current, target: r.target, action: fromCents(spread[i]) }));
}
