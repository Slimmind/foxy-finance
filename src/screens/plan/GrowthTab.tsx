import { useMemo, useState } from 'react';
import { GrowthChart } from '../../components/visuals';
import type { Plan } from '../../lib/allocate';
import type { PortfolioModel } from '../../lib/portfolio';
import { formatMoney, formatPercent, parseAmount } from '../../lib/money';
import { project } from '../../lib/projection';

export function GrowthTab({ plan, model }: { plan: Plan; model: PortfolioModel }) {
  const [years, setYears] = useState(10);
  const [monthlyRaw, setMonthlyRaw] = useState('');
  const monthlyParsed = parseAmount(monthlyRaw);
  const monthly = Number.isFinite(monthlyParsed) ? monthlyParsed : 0;

  const points = useMemo(
    () => project(plan.total, monthly, model.returns, years),
    [plan.total, monthly, model.returns, years],
  );
  const last = points[points.length - 1];
  const money = (v: number) => formatMoney(Math.round(v), plan.currency);

  return (
    <div className="stack">
      <div className="box stack">
        <label htmlFor="years" className="label">
          Горизонт: {years} {years === 1 ? 'год' : years < 5 ? 'года' : 'лет'}
        </label>
        <input id="years" className="range" type="range" min={1} max={30} value={years} onChange={(e) => setYears(Number(e.target.value))} />

        <label htmlFor="monthly" className="label">
          Ежемесячный взнос
        </label>
        <input
          id="monthly"
          className="input"
          type="text"
          inputMode="decimal"
          placeholder="0"
          value={monthlyRaw}
          onChange={(e) => setMonthlyRaw(e.target.value.replace(/[^\d\s.,]/g, ''))}
        />
      </div>

      <GrowthChart points={points} />

      <ul className="legend legend--col">
        <li>
          <span className="swatch swatch--high" /> Оптимистично ({formatPercent(model.returns.high)} в год):{' '}
          <b>{money(last.high)}</b>
        </li>
        <li>
          <span className="swatch swatch--base" /> Базово ({formatPercent(model.returns.base)}): <b>{money(last.base)}</b>
        </li>
        <li>
          <span className="swatch swatch--low" /> Пессимистично ({formatPercent(model.returns.low)}):{' '}
          <b>{money(last.low)}</b>
        </li>
        <li>
          <span className="swatch swatch--invested" /> Внесено своих: <b>{money(last.invested)}</b>
        </li>
      </ul>
      <p className="muted">
        Сценарии иллюстративные, без учёта налогов и инфляции. В реальности путь будет рваным: в худшие годы
        такой портфель может проседать до -{Math.round(model.drawdown)}%.
      </p>
    </div>
  );
}
