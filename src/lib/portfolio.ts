import { CATEGORIES, fundById, type Fund } from '../data/catalog';
import { SLOTS, SLOT_COLORS, type AssetClass, type Etf, type Market, type SlotId } from '../data/etfs';
import { getProfile, type Profile, type ProfileId } from '../data/profiles';
import { apportion } from './money';

export interface Returns {
  low: number;
  base: number;
  high: number;
}

export interface CustomItem {
  fundId: string;
  /** Whole percent. */
  weight: number;
}

export type PortfolioSource = { kind: 'profile'; profileId: ProfileId } | { kind: 'custom'; items: CustomItem[] };

export interface Holding {
  etf: Etf;
  title: string;
  blurb: string;
  color: string;
}

/** Everything the plan screens need to know about a portfolio, whether from a profile or built by hand. */
export interface PortfolioModel {
  label: string;
  color: string;
  /** key -> percent, sums to 100 */
  weights: Record<string, number>;
  holdings: Record<string, Holding>;
  returns: Returns;
  drawdown: number;
  equityShare: number;
}

export const CUSTOM_LABEL = 'Свой портфель';
export const CUSTOM_COLOR = '#ffd23f';
export const MAX_CUSTOM_FUNDS = 12;

export function profileModel(profile: Profile, market: Market): PortfolioModel {
  const weights: Record<string, number> = {};
  const holdings: Record<string, Holding> = {};
  let equity = 0;
  for (const [slot, w] of Object.entries(profile.weights) as [SlotId, number][]) {
    if (!w) continue;
    weights[slot] = w;
    holdings[slot] = {
      etf: SLOTS[slot].etf[market],
      title: SLOTS[slot].title,
      blurb: SLOTS[slot].blurb,
      color: SLOT_COLORS[slot],
    };
    if (SLOTS[slot].assetClass === 'equity') equity += w;
  }
  return {
    label: profile.name,
    color: profile.color,
    weights,
    holdings,
    returns: profile.returns,
    drawdown: profile.drawdown,
    equityShare: equity,
  };
}

const toEtf = (f: Fund): Etf => ({ ticker: f.ticker, name: f.name, ter: f.ter, isin: f.isin });

export function fundHolding(f: Fund): Holding {
  return { etf: toEtf(f), title: CATEGORIES[f.category].title, blurb: f.summary, color: CATEGORIES[f.category].color };
}

const knownItems = (items: CustomItem[]) =>
  items.filter((i) => i.weight > 0 && fundById(i.fundId)).map((i) => ({ fund: fundById(i.fundId)!, weight: i.weight }));

export const weightTotal = (items: CustomItem[]): number => items.reduce((s, i) => s + i.weight, 0);

export interface CustomAnalysis {
  total: number;
  /** Shares of the entered weights, in percent of the total (0 when nothing is entered). */
  byClass: Record<AssetClass, number>;
  equityShare: number;
  /** Weighted expense ratio, % per year. */
  ter: number;
  returns: Returns;
  drawdown: number;
  notes: string[];
}

const ZERO_CLASSES = (): Record<AssetClass, number> => ({ equity: 0, bonds: 0, cash: 0, gold: 0 });

export function analyzeCustom(items: CustomItem[]): CustomAnalysis {
  const known = knownItems(items);
  const total = known.reduce((s, k) => s + k.weight, 0);
  const byClass = ZERO_CLASSES();
  const empty: CustomAnalysis = {
    total,
    byClass,
    equityShare: 0,
    ter: 0,
    returns: { low: 0, base: 0, high: 0 },
    drawdown: 0,
    notes: [],
  };
  if (total <= 0) return empty;

  let ter = 0;
  let drawdown = 0;
  const returns = { low: 0, base: 0, high: 0 };
  const byCategory = new Map<string, { share: number; funds: Fund[] }>();

  for (const { fund, weight } of known) {
    const share = weight / total;
    const cat = CATEGORIES[fund.category];
    byClass[cat.assetClass] += share * 100;
    ter += share * fund.ter;
    drawdown += share * cat.drawdown;
    returns.low += share * cat.returns.low;
    returns.base += share * cat.returns.base;
    returns.high += share * cat.returns.high;
    const entry = byCategory.get(cat.id) ?? { share: 0, funds: [] };
    entry.share += share * 100;
    entry.funds.push(fund);
    byCategory.set(cat.id, entry);
  }

  const notes: string[] = [];
  const pct = (n: number) => `${Math.round(n)}%`;

  if (known.length === 1) {
    notes.push('В портфеле один фонд: диверсификация есть только внутри него, между классами активов её нет.');
  }
  const top = known.reduce((a, b) => (b.weight > a.weight ? b : a));
  if (known.length > 1 && (top.weight / total) * 100 >= 50) {
    notes.push(`${top.fund.ticker} занимает ${pct((top.weight / total) * 100)}: результат сильно зависит от одного фонда.`);
  }
  if (byCategory.has('world') && (byCategory.has('usa') || byCategory.has('tech'))) {
    notes.push(
      'Фонд «весь мир» уже включает американские компании (больше половины его веса), поэтому добавление фондов США или технологий увеличивает долю американского рынка.',
    );
  }
  for (const [id, entry] of byCategory) {
    if (entry.funds.length > 1) {
      notes.push(
        `Несколько фондов категории «${CATEGORIES[id as keyof typeof CATEGORIES].short}» (${entry.funds
          .map((f) => f.ticker)
          .join(', ')}): их составы сильно пересекаются.`,
      );
    }
  }
  const equity = byClass.equity;
  if (equity >= 90) notes.push(`Акции составляют ${pct(equity)}: защитной части почти нет, просадки могут быть глубокими.`);
  if (equity === 0) notes.push('В портфеле нет акций: колебания меньше, но потенциал роста тоже ниже.');
  const narrow = (['tech', 'em', 'small', 'reit'] as const).reduce((s, id) => s + (byCategory.get(id)?.share ?? 0), 0);
  if (narrow > 30) {
    notes.push(`Узкие категории (технологии, развивающиеся рынки, малые компании, недвижимость) занимают ${pct(narrow)}: они колеблются сильнее широкого рынка.`);
  }
  if (byClass.gold > 20) notes.push(`Золото занимает ${pct(byClass.gold)}: оно не приносит дивидендов и процентов.`);
  const dists = new Set(known.map((k) => k.fund.distribution));
  if (dists.size > 1) {
    notes.push('Есть и накопительные, и выплачивающие фонды: доход в виде выплат поступает только от части портфеля.');
  }

  return { total, byClass, equityShare: equity, ter, returns, drawdown, notes: notes.slice(0, 6) };
}

export function customModel(items: CustomItem[]): PortfolioModel {
  const known = knownItems(items);
  const total = known.reduce((s, k) => s + k.weight, 0) || 1;
  const a = analyzeCustom(items);
  const weights: Record<string, number> = {};
  const holdings: Record<string, Holding> = {};
  for (const { fund, weight } of known) {
    weights[fund.id] = (weight / total) * 100;
    holdings[fund.id] = fundHolding(fund);
  }
  return {
    label: CUSTOM_LABEL,
    color: CUSTOM_COLOR,
    weights,
    holdings,
    returns: a.returns,
    drawdown: a.drawdown,
    equityShare: a.equityShare,
  };
}

export function modelOf(source: PortfolioSource, market: Market, profile?: Profile): PortfolioModel {
  if (source.kind === 'custom') return customModel(source.items);
  if (!profile) throw new Error('profile required');
  return profileModel(profile, market);
}

/** Splits 100% evenly between the funds (remainder goes to the first ones). */
export function equalWeights(items: CustomItem[]): CustomItem[] {
  if (items.length === 0) return items;
  const parts = apportion(100, items.map(() => 1));
  return items.map((it, i) => ({ ...it, weight: parts[i] }));
}

/** Scales the current weights proportionally so they add up to exactly 100. */
export function normalizeWeights(items: CustomItem[]): CustomItem[] {
  if (weightTotal(items) <= 0) return equalWeights(items);
  const parts = apportion(
    100,
    items.map((i) => i.weight),
  );
  return items.map((it, i) => ({ ...it, weight: parts[i] }));
}

/** Display name and colour of where an operation's mix came from. */
export function sourceInfo(source: PortfolioSource): { label: string; color: string } {
  if (source.kind === 'custom') return { label: CUSTOM_LABEL, color: CUSTOM_COLOR };
  const p = getProfile(source.profileId);
  return { label: p.name, color: p.color };
}

const sameWeights = (a: CustomItem[], b: CustomItem[]) => a.length === b.length && a.every((it, i) => it.weight === b[i].weight);

/** True while the weights are exactly an even split (or nothing is set yet), i.e. the user has not tuned them. */
export const isEvenSplit = (items: CustomItem[]): boolean =>
  items.length === 0 || weightTotal(items) === 0 || sameWeights(items, equalWeights(items));

/**
 * Adds a fund. While the user has not customised the weights the portfolio stays an even split, so the money
 * is shared between all funds; once they have, the new fund starts at 0% and the existing choices are untouched.
 */
export function addFund(items: CustomItem[], fundId: string): CustomItem[] {
  if (items.length >= MAX_CUSTOM_FUNDS || items.some((i) => i.fundId === fundId)) return items;
  const next = [...items, { fundId, weight: 0 }];
  return isEvenSplit(items) ? equalWeights(next) : next;
}

/** Removes a fund; an untouched even split is re-split among the rest, custom weights are left as they are. */
export function removeFund(items: CustomItem[], fundId: string): CustomItem[] {
  const rest = items.filter((i) => i.fundId !== fundId);
  return rest.length > 0 && isEvenSplit(items) ? equalWeights(rest) : rest;
}
