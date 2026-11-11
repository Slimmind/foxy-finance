export type Currency = 'USD' | 'EUR' | 'BYN';

/**
 * `perUsd` is only a fallback: roughly how many units equal 1 USD. The live National Bank rates
 * (see rates.ts) replace it as soon as they are available.
 */
export const CURRENCIES: { code: Currency; perUsd: number }[] = [
  { code: 'USD', perUsd: 1 },
  { code: 'EUR', perUsd: 0.9 },
  { code: 'BYN', perUsd: 3 },
];

export const staticPerUsd = (currency: Currency): number => CURRENCIES.find((c) => c.code === currency)?.perUsd ?? 1;

export const formatMoney = (amount: number, currency: Currency): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);

export const formatPercent = (value: number, digits = 1): string =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits }).format(value)}%`;

/**
 * Splits `totalCents` proportionally to `weights` so that parts are integers and
 * always add up to exactly `totalCents` (largest remainder method).
 */
export function apportion(totalCents: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0 || sum <= 0 || totalCents <= 0) return weights.map(() => 0);

  const exact = weights.map((w) => (totalCents * w) / sum);
  const parts = exact.map(Math.floor);
  let left = totalCents - parts.reduce((a, b) => a + b, 0);

  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left--) parts[order[k].i] += 1;
  return parts;
}

/** Parses user input like "1 234,56" or "1234.56". Returns NaN for anything else. */
export const parseAmount = (raw: string): number => {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === '' || cleaned === '.') return NaN;
  return Number(cleaned);
};

export const toCents =(amount: number): number => Math.round(amount * 100);
export const fromCents = (cents: number): number => cents / 100;
