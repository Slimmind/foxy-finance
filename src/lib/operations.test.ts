import { describe, expect, it } from 'vitest';
import { buildPlan } from './allocate';
import {
  NOTE_MAX,
  todayISO,
  createOperation,
  editOperation,
  formatDate,
  isValidDate,
  parseISODate,
  sortOperations,
  summarizeByCurrency,
  toISODate,
} from './operations';
import { profileModel } from './portfolio';
import { PROFILES } from '../data/profiles';
import { toCents } from './money';
import { normalizeState } from './storage';

const plan = buildPlan(10_000.01, profileModel(PROFILES[2], 'us'), 'us', 'USD');
const source = { kind: 'profile', profileId: 'clever' } as const;
const NOW = Date.UTC(2026, 10, 12, 9, 0, 0);

describe('dates', () => {
  it('accepts real calendar days only', () => {
    expect(isValidDate('2026-11-12')).toBe(true);
    expect(isValidDate('2024-02-29')).toBe(true);
    expect(isValidDate('2026-02-29')).toBe(false);
    expect(isValidDate('2026-13-01')).toBe(false);
    expect(isValidDate('12.11.2026')).toBe(false);
    expect(isValidDate('')).toBe(false);
    expect(isValidDate('1800-01-01')).toBe(false);
  });

  it('round-trips through toISODate in local time', () => {
    expect(toISODate(parseISODate('2026-01-05')!)).toBe('2026-01-05');
  });

  it('formats in Russian and passes bad input through unchanged', () => {
    expect(formatDate('2026-11-12', true)).toMatch(/12 ноября 2026/);
    expect(formatDate('garbage')).toBe('garbage');
  });
});

describe('createOperation', () => {
  it('copies the calculation and trims the note', () => {
    const op = createOperation(plan, source, { date: '2026-11-10', note: `  ${'x'.repeat(300)}  ` }, NOW);
    expect(op.date).toBe('2026-11-10');
    expect(op.note).toHaveLength(NOTE_MAX);
    expect(op.total).toBe(plan.total);
    expect(op.positions.reduce((s, p) => s + toCents(p.amount), 0)).toBe(toCents(plan.total));
    expect(op.positions.map((p) => p.ticker)).toEqual(plan.positions.map((p) => p.etf.ticker));
    expect(op.updatedAt).toBeUndefined();
  });

  it('falls back to today when the date is invalid and gives unique ids', () => {
    const a = createOperation(plan, source, { date: 'nope', note: '' }, NOW);
    const b = createOperation(plan, source, { date: 'nope', note: '' }, NOW);
    expect(a.date).toBe(todayISO());
    expect(a.id).not.toBe(b.id);
  });
});

describe('editOperation', () => {
  const op = createOperation(plan, source, { date: '2026-11-10', note: '' }, NOW);
  const same = op.positions.map((p) => p.amount);

  it('keeps everything when nothing changes, and stamps updatedAt', () => {
    const e = editOperation(op, { date: op.date, note: '', amounts: same }, NOW + 1)!;
    expect(e.total).toBe(op.total);
    expect(e.updatedAt).toBe(NOW + 1);
    expect(e.id).toBe(op.id);
    expect(e.createdAt).toBe(op.createdAt);
  });

  it('recomputes total and weights from the actual amounts', () => {
    const amounts = [...same];
    amounts[0] = 100;
    const e = editOperation(op, { date: '2026-11-11', note: 'докупил частично', amounts })!;
    expect(e.date).toBe('2026-11-11');
    expect(e.note).toBe('докупил частично');
    expect(e.positions.reduce((s, p) => s + toCents(p.amount), 0)).toBe(toCents(e.total));
    expect(e.positions.reduce((s, p) => s + p.weight, 0)).toBeCloseTo(100);
    expect(e.positions[0].amount).toBe(100);
  });

  it('drops positions set to zero', () => {
    const amounts = same.map((a, i) => (i === 1 ? 0 : a));
    const e = editOperation(op, { date: op.date, note: '', amounts })!;
    expect(e.positions).toHaveLength(op.positions.length - 1);
    expect(e.positions.some((p) => p.ticker === op.positions[1].ticker)).toBe(false);
  });

  it('rejects invalid edits', () => {
    expect(editOperation(op, { date: 'x', note: '', amounts: same })).toBeNull();
    expect(editOperation(op, { date: op.date, note: '', amounts: same.slice(1) })).toBeNull();
    expect(editOperation(op, { date: op.date, note: '', amounts: same.map(() => 0) })).toBeNull();
    expect(editOperation(op, { date: op.date, note: '', amounts: same.map(() => NaN) })).toBeNull();
    expect(editOperation(op, { date: op.date, note: '', amounts: same.map(() => -5) })).toBeNull();
  });

  it('does not mutate the original', () => {
    const before = JSON.stringify(op);
    editOperation(op, { date: '2026-01-01', note: 'x', amounts: same.map((a) => a + 1) });
    expect(JSON.stringify(op)).toBe(before);
  });
});

describe('sorting and totals', () => {
  const mk = (date: string, createdAt: number, total = 100, currency: 'USD' | 'EUR' = 'USD') => ({
    ...createOperation(plan, source, { date, note: '' }, createdAt),
    total,
    currency,
  });

  it('sorts by date desc, then by record time desc', () => {
    const a = mk('2026-11-01', 1);
    const b = mk('2026-11-05', 2);
    const c = mk('2026-11-05', 3);
    expect(sortOperations([a, b, c]).map((o) => o.createdAt)).toEqual([3, 2, 1]);
  });

  it('sums per currency in whole cents', () => {
    const t = summarizeByCurrency([mk('2026-11-01', 1, 0.1), mk('2026-11-02', 2, 0.2), mk('2026-11-03', 3, 50, 'EUR')]);
    expect(t).toEqual([
      { currency: 'USD', total: 0.3, count: 2 },
      { currency: 'EUR', total: 50, count: 1 },
    ]);
  });
});

describe('storage migration of operations', () => {
  it('gives records made before dates existed the day they were saved', () => {
    const createdAt = new Date(2026, 5, 20, 12).getTime();
    const s = normalizeState({
      history: [
        { id: '1', createdAt, source: { kind: 'profile', profileId: 'clever' }, total: 10, currency: 'USD', market: 'us', positions: [] },
      ],
    });
    expect(s.history[0].date).toBe('2026-06-20');
    expect(s.history[0].note).toBe('');
    expect(s.history[0].updatedAt).toBeUndefined();
  });

  it('keeps valid dates and notes, repairs bad ones', () => {
    const base = { id: '1', createdAt: 1, source: { kind: 'profile', profileId: 'clever' }, total: 10, currency: 'USD', market: 'us', positions: [] };
    const s = normalizeState({
      history: [
        { ...base, date: '2026-03-04', note: ' hi ', updatedAt: 5 },
        { ...base, id: '2', date: '2026-02-31', note: 42 },
      ],
    });
    expect(s.history[0]).toMatchObject({ date: '2026-03-04', note: 'hi', updatedAt: 5 });
    expect(s.history[1].note).toBe('');
    expect(isValidDate(s.history[1].date)).toBe(true);
  });
});
