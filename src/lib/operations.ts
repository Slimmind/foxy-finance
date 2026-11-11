import type { Plan } from './allocate';
import { fromCents, toCents, type Currency } from './money';
import type { PortfolioSource } from './portfolio';
import type { Operation } from './storage';

export const NOTE_MAX = 200;
const MAX_AMOUNT = 1_000_000_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** Local calendar date as YYYY-MM-DD (what `<input type="date">` produces). */
export const toISODate = (d: Date): string => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const todayISO = (): string => toISODate(new Date());

export function parseISODate(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (y < 1990 || y > 2100) return null;
  const date = new Date(y, mo - 1, d);
  return date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d ? date : null;
}

export const isValidDate = (s: string): boolean => parseISODate(s) !== null;

export function formatDate(s: string, long = false): string {
  const d = parseISODate(s);
  if (!d) return s;
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: long ? 'long' : 'short', year: 'numeric' }).format(d);
}

export const cleanNote = (note: string): string => note.trim().slice(0, NOTE_MAX);

export interface RecordMeta {
  date: string;
  note: string;
}

/** A calculation the user confirms as a completed purchase. */
export function createOperation(plan: Plan, source: PortfolioSource, meta: RecordMeta, now = Date.now()): Operation {
  return {
    id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    date: isValidDate(meta.date) ? meta.date : todayISO(),
    note: cleanNote(meta.note),
    source,
    total: plan.total,
    currency: plan.currency,
    market: plan.market,
    positions: plan.positions.map((p) => ({ ticker: p.etf.ticker, weight: p.weight, amount: p.amount })),
  };
}

export interface EditInput {
  date: string;
  note: string;
  /** Actual amount per position, in the same order as `operation.positions`. 0 removes the position. */
  amounts: number[];
}

/**
 * Applies the user's corrections. Returns null if the result would be invalid
 * (bad date, wrong number of amounts, or nothing left to record).
 * Total and weights are always recomputed from the amounts, so they cannot drift apart.
 */
export function editOperation(op: Operation, input: EditInput, now = Date.now()): Operation | null {
  if (!isValidDate(input.date) || input.amounts.length !== op.positions.length) return null;
  const cents = input.amounts.map((a) => (Number.isFinite(a) && a > 0 && a <= MAX_AMOUNT ? toCents(a) : 0));
  const total = cents.reduce((s, c) => s + c, 0);
  if (total <= 0) return null;

  const positions = op.positions
    .map((p, i) => ({ ticker: p.ticker, c: cents[i] }))
    .filter((x) => x.c > 0)
    .map((x) => ({ ticker: x.ticker, weight: (x.c / total) * 100, amount: fromCents(x.c) }));

  return { ...op, date: input.date, note: cleanNote(input.note), total: fromCents(total), positions, updatedAt: now };
}

/** Newest operation first; ties broken by when the record was made. */
export const sortOperations = (ops: Operation[]): Operation[] =>
  [...ops].sort((a, b) => (a.date === b.date ? b.createdAt - a.createdAt : a.date < b.date ? 1 : -1));

export interface CurrencyTotal {
  currency: Currency;
  total: number;
  count: number;
}

export function summarizeByCurrency(ops: Operation[]): CurrencyTotal[] {
  const cents = new Map<Currency, { total: number; count: number }>();
  for (const op of ops) {
    const e = cents.get(op.currency) ?? { total: 0, count: 0 };
    e.total += toCents(op.total);
    e.count += 1;
    cents.set(op.currency, e);
  }
  return [...cents].map(([currency, e]) => ({ currency, total: fromCents(e.total), count: e.count }));
}
