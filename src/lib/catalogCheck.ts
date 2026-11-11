import type { Fund } from '../data/catalog';

/** ISIN check digit: letters become numbers (A=10..Z=35), then the Luhn algorithm. Catches typos, not wrong-but-real codes. */
export function isValidIsin(isin: string): boolean {
  if (!/^[A-Z]{2}[A-Z0-9]{9}\d$/.test(isin)) return false;
  const digits = [...isin].map((c) => (/\d/.test(c) ? c : String(c.charCodeAt(0) - 55))).join('');
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = Number(digits[i]);
    if (double) d = d * 2 > 9 ? d * 2 - 9 : d * 2;
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

/** How each issuer appears in the abbreviated names that OpenFIGI returns (e.g. "VANG FTSE AW USDA"). */
const FAMILIES: { issuer: RegExp; figi: RegExp }[] = [
  { issuer: /vanguard/i, figi: /\b(VANG|VANGUARD|VG)\b/i },
  { issuer: /ishares|blackrock/i, figi: /\b(ISHARES|ISHR|ISHS)\b/i },
  { issuer: /invesco/i, figi: /\b(INVESCO|INVS)\b/i },
  { issuer: /schwab/i, figi: /\bSCHWAB\b/i },
  { issuer: /spdr|state street/i, figi: /\b(SPDR|SSGA)\b/i },
  { issuer: /xtrackers|dws/i, figi: /^X\b|\bXTRACKERS\b/i },
];

/** True when at least one OpenFIGI name looks like it belongs to the fund's issuer (unknown issuers are not judged). */
export function matchesIssuer(figiNames: string[], issuer: string): boolean {
  const family = FAMILIES.find((f) => f.issuer.test(issuer));
  return !family || figiNames.some((n) => family.figi.test(n));
}

const ACC = /\bACC\b|\bUSDA\b|\b1C\b/i;
const DIST = /\bUSDD\b|\bDIST\b|\b(USD|EUR|GBP) D\b/i;

/**
 * Returns a description when the share class in the OpenFIGI names contradicts the catalog.
 * Deliberately conservative: silent unless the names point clearly one way.
 */
export function classConflict(figiNames: string[], distribution: Fund['distribution']): string | null {
  const acc = figiNames.some((n) => ACC.test(n));
  const dist = figiNames.some((n) => DIST.test(n));
  if (distribution === 'dist' && acc && !dist) return 'в названии OpenFIGI класс накопительный, а в каталоге — с выплатами';
  if (distribution === 'acc' && dist && !acc) return 'в названии OpenFIGI класс с выплатами, а в каталоге — накопительный';
  return null;
}

export type Level = 'error' | 'warn';
export interface Finding {
  level: Level;
  text: string;
}

export const STALE_DAYS = 120;
const DAY = 86_400_000;

/**
 * Judges one fund. `figiNames` is null when OpenFIGI did not know the identifier,
 * otherwise the distinct names it returned for it.
 */
export function evaluateFund(fund: Fund, figiNames: string[] | null, now = Date.now()): Finding[] {
  const out: Finding[] = [];
  if (fund.isin && !isValidIsin(fund.isin)) out.push({ level: 'error', text: `ISIN ${fund.isin}: неверная контрольная цифра` });

  if (!figiNames || figiNames.length === 0) {
    out.push({ level: 'error', text: `${fund.isin ?? fund.ticker}: OpenFIGI такой идентификатор не знает` });
  } else {
    if (!matchesIssuer(figiNames, fund.issuer)) {
      out.push({
        level: 'error',
        text: `название в OpenFIGI не похоже на эмитента «${fund.issuer}»: ${figiNames.slice(0, 2).join(' / ')}`,
      });
    }
    const conflict = classConflict(figiNames, fund.distribution);
    if (conflict) out.push({ level: 'error', text: `${conflict} (${figiNames.slice(0, 2).join(' / ')})` });
  }

  const checked = fund.idsChecked ? Date.parse(fund.idsChecked) : NaN;
  if (Number.isNaN(checked)) out.push({ level: 'warn', text: 'идентификаторы никогда не сверялись' });
  else if (now - checked > STALE_DAYS * DAY) out.push({ level: 'warn', text: `идентификаторы сверялись давно (${fund.idsChecked})` });

  if (!fund.factsChecked) out.push({ level: 'warn', text: 'комиссия и состав не сверены с документами эмитента' });
  else if (now - Date.parse(fund.factsChecked) > STALE_DAYS * DAY) {
    out.push({ level: 'warn', text: `комиссия и состав сверялись давно (${fund.factsChecked})` });
  }
  return out;
}
