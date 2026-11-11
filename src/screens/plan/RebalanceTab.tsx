import { useMemo, useState } from 'react';
import { formatMoney, parseAmount, type Currency } from '../../lib/money';
import type { PortfolioModel } from '../../lib/portfolio';
import { rebalance } from '../../lib/rebalance';

const num = (raw: string | undefined): number => {
  if (!raw) return 0;
  const n = parseAmount(raw);
  return Number.isFinite(n) ? n : 0;
};

export function RebalanceTab({ model, currency }: { model: PortfolioModel; currency: Currency }) {
  const keys = useMemo(() => Object.keys(model.weights), [model]);
  const [holdings, setHoldings] = useState<Record<string, string>>({});
  const [newMoney, setNewMoney] = useState('');
  const [allowSell, setAllowSell] = useState(false);

  const current = useMemo(() => {
    const out: Record<string, number> = {};
    keys.forEach((k) => (out[k] = num(holdings[k])));
    return out;
  }, [holdings, keys]);

  const rows = useMemo(
    () => rebalance(current, num(newMoney), model.weights, allowSell),
    [current, newMoney, model, allowSell],
  );

  const hasInput = keys.some((k) => (current[k] ?? 0) > 0) || num(newMoney) > 0;
  const clean = (v: string) => v.replace(/[^\d\s.,]/g, '');
  const tickerOf = (key: string) => model.holdings[key]?.etf.ticker ?? key;

  return (
    <div className="stack">
      <p>Впиши, сколько у тебя уже лежит в каждом фонде, и лисичка подскажет, что докупить, чтобы вернуться к модели.</p>

      <div className="box stack">
        {keys.map((k) => (
          <div key={k} className="field">
            <label htmlFor={`h-${k}`} className="label">
              {tickerOf(k)} <span className="muted">(цель {Math.round(model.weights[k])}%)</span>
            </label>
            <input
              id={`h-${k}`}
              className="input input--small"
              type="text"
              inputMode="decimal"
              placeholder="0"
              value={holdings[k] ?? ''}
              onChange={(e) => setHoldings({ ...holdings, [k]: clean(e.target.value) })}
            />
          </div>
        ))}
        <div className="field">
          <label htmlFor="new-money" className="label">
            Новые деньги
          </label>
          <input
            id="new-money"
            className="input input--small"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={newMoney}
            onChange={(e) => setNewMoney(clean(e.target.value))}
          />
        </div>
        <label className="check">
          <input type="checkbox" checked={allowSell} onChange={(e) => setAllowSell(e.target.checked)} />
          <span className="check__mark" aria-hidden="true" />
          Разрешить продажи (налоги и комиссии)
        </label>
      </div>

      {hasInput ? (
        <ul className="schedule">
          {rows.map((r) => {
            const out = !model.weights[r.key];
            return (
              <li key={r.key} className="box rb">
                <div className="rb__head">
                  <b>{tickerOf(r.key)}</b>
                  <span className="muted">
                    есть {formatMoney(r.current, currency)} / нужно {formatMoney(Math.round(r.target), currency)}
                  </span>
                </div>
                <div className={`rb__action ${r.action > 0 ? 'is-buy' : r.action < 0 ? 'is-sell' : ''}`}>
                  {r.action > 0 && `Докупить ${formatMoney(r.action, currency)}`}
                  {r.action < 0 && `Продать ${formatMoney(-r.action, currency)}${out ? ' (нет в модели)' : ''}`}
                  {r.action === 0 && 'Всё в норме'}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="muted">Введи текущие суммы, чтобы увидеть расчёт.</p>
      )}
    </div>
  );
}
