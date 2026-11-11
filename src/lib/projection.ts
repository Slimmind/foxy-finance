export interface ProjectionPoint {
  year: number;
  low: number;
  base: number;
  high: number;
  /** Money actually put in (no growth). */
  invested: number;
}

/** Future value of a lump sum plus monthly contributions at a yearly rate (%), compounded monthly-equivalent. */
export function futureValue(principal: number, monthly: number, annualRatePct: number, years: number): number {
  const r = annualRatePct / 100;
  const growth = (1 + r) ** years;
  const m = (1 + r) ** (1 / 12) - 1;
  const contributions = Math.abs(m) < 1e-12 ? monthly * 12 * years : (monthly * ((1 + m) ** (12 * years) - 1)) / m;
  return principal * growth + contributions;
}

export function project(
  principal: number,
  monthly: number,
  returns: { low: number; base: number; high: number },
  years: number,
): ProjectionPoint[] {
  return Array.from({ length: years + 1 }, (_, year) => ({
    year,
    low: futureValue(principal, monthly, returns.low, year),
    base: futureValue(principal, monthly, returns.base, year),
    high: futureValue(principal, monthly, returns.high, year),
    invested: principal + monthly * 12 * year,
  }));
}
