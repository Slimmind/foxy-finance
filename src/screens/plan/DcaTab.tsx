import { useMemo, useState } from 'react';
import { splitDca, type Plan } from '../../lib/allocate';
import { formatMoney, fromCents, toCents } from '../../lib/money';

const OPTIONS = [1, 3, 6, 12];

const dateLabel = (monthsAhead: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).format(d);
};

export function DcaTab({ plan }: { plan: Plan }) {
  const [parts, setParts] = useState(3);
  const rows = useMemo(() => splitDca(plan, parts), [plan, parts]);
  const purchases = Array.from({ length: parts }, (_, k) =>
    fromCents(rows.reduce((s, row) => s + toCents(row[k]), 0)),
  );

  return (
    <div className="stack">
      <p>
        Покупка частями сглаживает риск неудачного момента входа: часть денег купит дорого, часть дёшево.
      </p>

      <fieldset className="box stack choice">
        <legend className="label">Сколько покупок (раз в месяц)</legend>
        <div className="chips">
          {OPTIONS.map((n) => (
            <label key={n} className={`chip ${parts === n ? 'is-selected' : ''}`}>
              <input type="radio" name="parts" checked={parts === n} onChange={() => setParts(n)} />
              {n === 1 ? 'Сразу' : n}
            </label>
          ))}
        </div>
      </fieldset>

      <ul className="schedule">
        {purchases.map((sum, k) => (
          <li key={k} className="box">
            <details open={k === 0}>
              <summary>
                <span>
                  {k === 0 ? 'Сегодня' : dateLabel(k)}
                </span>
                <b>{formatMoney(sum, plan.currency)}</b>
              </summary>
              <ul className="schedule__items">
                {plan.positions.map((p, i) => (
                  <li key={p.key}>
                    <span>{p.etf.ticker}</span>
                    <span>{formatMoney(rows[i][k], plan.currency)}</span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
