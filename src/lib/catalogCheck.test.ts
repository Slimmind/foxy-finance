import { describe, expect, it } from 'vitest';
import { FUNDS, fundById, fundLinks } from '../data/catalog';
import { classConflict, evaluateFund, isValidIsin, matchesIssuer } from './catalogCheck';

/** Names below were returned by the real OpenFIGI on 2026-11-12. */
const figi = {
  vuaaWrong: ['AM CORE MSCI WORLD U ETF ACC', 'AMUNDI MSCI WORLD'],
  vuaaRight: ['VANG S&P500 USDA'],
  ibtsWrong: ['ISHARES TRSY 1-3YR USD ACC B', 'ISHARES  TREASURY BOND 1-3YR'],
  ibtsRight: ['ISHARES USD TRSRY 1-3Y USD D', 'ISHARES BG   TREASURY BD 1-3'],
};

describe('isValidIsin', () => {
  it('accepts real ISINs and rejects typos and malformed input', () => {
    for (const ok of ['IE00BK5BQT80', 'IE00B4L5Y983', 'IE00BFMXXD54', 'IE00B14X4S71', 'US0378331005']) expect(isValidIsin(ok), ok).toBe(true);
    for (const bad of ['IE00BK5BQT81', 'IE00BK5BQT8', 'ie00bk5bqt80', '', 'IE00BK5BQT8O', 'XXXXXXXXXXXX']) expect(isValidIsin(bad), bad).toBe(false);
  });

  it('holds for every ISIN in the catalog', () => {
    for (const f of FUNDS) if (f.isin) expect(isValidIsin(f.isin), `${f.ticker} ${f.isin}`).toBe(true);
  });
});

describe('matchesIssuer', () => {
  it('recognises the abbreviations OpenFIGI uses', () => {
    expect(matchesIssuer(['VANG FTSE AW USDA'], 'Vanguard')).toBe(true);
    expect(matchesIssuer(['VG MORNINGSTAR TS MKT ETF-US'], 'Vanguard')).toBe(true);
    expect(matchesIssuer(['ISHR IBX USD INVGD CB ETF-UI'], 'iShares (BlackRock)')).toBe(true);
    expect(matchesIssuer(['X MSCI WORLD INFO TECH 1C'], 'Xtrackers (DWS)')).toBe(true);
    expect(matchesIssuer(['SPDR GOLD MINISHARES TRUST'], 'State Street (SPDR)')).toBe(true);
  });

  it('rejects a different issuer and does not judge unknown ones', () => {
    expect(matchesIssuer(figi.vuaaWrong, 'Vanguard')).toBe(false);
    expect(matchesIssuer(['SOMETHING ELSE'], 'Some New Issuer')).toBe(true);
  });
});

describe('classConflict', () => {
  it('flags an accumulating name for a distributing fund and vice versa', () => {
    expect(classConflict(figi.ibtsWrong, 'dist')).toMatch(/накопительный/);
    expect(classConflict(['VANG S&P500 USDD'], 'acc')).toMatch(/с выплатами/);
  });

  it('stays quiet when the names agree, are silent, or point both ways', () => {
    expect(classConflict(figi.ibtsRight, 'dist')).toBeNull();
    expect(classConflict(figi.vuaaRight, 'acc')).toBeNull();
    expect(classConflict(['ISHARES CORE MSCI WORLD'], 'acc')).toBeNull();
    expect(classConflict(['X FUND 1C', 'X FUND USD D'], 'acc')).toBeNull();
  });
});

describe('evaluateFund: the two ISIN mistakes found on 2026-11-12 would have been caught', () => {
  const errors = (id: string, isin: string, names: string[] | null) =>
    evaluateFund({ ...fundById(id)!, isin }, names).filter((f) => f.level === 'error');

  it('VUAA with another issuer’s ISIN', () => {
    expect(errors('ucits:vuaa', 'IE000BI8OT95', figi.vuaaWrong).map((e) => e.text).join(' ')).toMatch(/не похоже на эмитента/);
  });

  it('IBTS with the accumulating class ISIN', () => {
    expect(errors('ucits:ibts', 'IE00B3VWN179', figi.ibtsWrong).map((e) => e.text).join(' ')).toMatch(/накопительный/);
  });

  it('an ISIN OpenFIGI does not know, and a typo', () => {
    expect(errors('ucits:vwce', 'IE00BK5BQT80', null)[0].text).toMatch(/не знает/);
    expect(errors('ucits:vwce', 'IE00BK5BQT81', ['VANG FTSE AW USDA'])[0].text).toMatch(/контрольная цифра/);
  });

  it('the corrected catalog entries pass', () => {
    expect(errors('ucits:vuaa', fundById('ucits:vuaa')!.isin!, figi.vuaaRight)).toEqual([]);
    expect(errors('ucits:ibts', fundById('ucits:ibts')!.isin!, figi.ibtsRight)).toEqual([]);
  });

  it('reports unchecked facts and stale checks as warnings, not errors', () => {
    const fund = fundById('ucits:vwce')!;
    const now = Date.parse('2026-11-13');
    const fresh = evaluateFund(fund, ['VANG FTSE AW USDA'], now);
    expect(fresh.every((f) => f.level === 'warn')).toBe(true);
    expect(fresh.map((f) => f.text).join(' ')).toMatch(/не сверены с документами/);
    const stale = evaluateFund(fund, ['VANG FTSE AW USDA'], Date.parse('2027-06-01'));
    expect(stale.map((f) => f.text).join(' ')).toMatch(/сверялись давно/);
    const checked = evaluateFund({ ...fund, factsChecked: '2026-11-10' }, ['VANG FTSE AW USDA'], now);
    expect(checked).toEqual([]);
  });
});

describe('verification data in the catalog', () => {
  it('has a check date for every fund and no facts check yet (nothing was verified against documents)', () => {
    for (const f of FUNDS) {
      expect(f.idsChecked, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(f.factsChecked, f.id).toBeUndefined();
    }
  });

  it('links every UCITS fund to a reference page and uses only https links', () => {
    for (const f of FUNDS) {
      const links = fundLinks(f);
      if (f.market === 'ucits') expect(links.length, f.id).toBeGreaterThan(0);
      for (const l of links) expect(l.url, f.id).toMatch(/^https:\/\//);
    }
    expect(fundLinks(fundById('ucits:vuaa')!).map((l) => l.label)).toContain('Документ KID эмитента');
    expect(fundLinks(fundById('us:voo')!)).toHaveLength(1); // official page only, no ISIN-based link for US funds
    expect(fundLinks(fundById('us:vti')!)).toHaveLength(0); // nothing confirmed, so nothing invented
  });
});
