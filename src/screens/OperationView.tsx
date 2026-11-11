import { useState } from 'react';
import { AllocationBar } from '../components/visuals';
import { CATEGORIES, fundById } from '../data/catalog';
import { MARKETS } from '../data/etfs';
import { formatMoney, formatPercent } from '../lib/money';
import { formatDate } from '../lib/operations';
import { sourceInfo } from '../lib/portfolio';
import type { Operation } from '../lib/storage';

interface Props {
  op: Operation;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReopen: () => void;
}

const FALLBACK_COLOR = '#9aa5c4';

const stamp = (ts: number) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(
    new Date(ts),
  );

export function OperationView({ op, onBack, onEdit, onDelete, onReopen }: Props) {
  const [confirming, setConfirming] = useState(false);
  const { label, color } = sourceInfo(op.source);

  // Every fund in an operation is in the catalog, so its colour matches the calculation screen.
  const colorOf = (ticker: string) => {
    const fund = fundById(`${op.market}:${ticker.toLowerCase()}`);
    return fund ? CATEGORIES[fund.category].color : FALLBACK_COLOR;
  };

  return (
    <section className="screen">
      <h1 className="title">Операция</h1>

      <div className="box stack">
        <div className="rb__head">
          <b style={{ color }}>{label}</b>
          <span className="muted">{formatDate(op.date, true)}</span>
        </div>
        <div className="pos__amount">{formatMoney(op.total, op.currency)}</div>
        <AllocationBar
          items={op.positions.map((p) => ({ key: p.ticker, weight: p.weight, label: p.ticker, color: colorOf(p.ticker) }))}
        />
        {op.note && <p className="opnote">{op.note}</p>}
      </div>

      <ul className="positions">
        {op.positions.map((p) => (
          <li key={p.ticker} className="pos box">
            <div className="pos__head">
              <span className="swatch" style={{ background: colorOf(p.ticker) }} />
              <b className="pos__ticker">{p.ticker}</b>
              <span className="pos__weight">{formatPercent(p.weight, 1)}</span>
            </div>
            <div className="pos__amount">{formatMoney(p.amount, op.currency)}</div>
          </li>
        ))}
      </ul>

      <dl className="facts box">
        <dt>Рынок</dt>
        <dd>{MARKETS[op.market].title}</dd>
        <dt>Валюта</dt>
        <dd>{op.currency}</dd>
        <dt>Записана</dt>
        <dd>{stamp(op.createdAt)}</dd>
        {op.updatedAt && (
          <>
            <dt>Изменена</dt>
            <dd>{stamp(op.updatedAt)}</dd>
          </>
        )}
      </dl>

      {confirming ? (
        <div className="note stack">
          <p>Удалить эту операцию? Вернуть её будет нельзя.</p>
          <div className="row">
            <button className="btn" onClick={() => setConfirming(false)}>
              Отмена
            </button>
            <button className="btn btn--danger" onClick={onDelete}>
              Удалить
            </button>
          </div>
        </div>
      ) : (
        <div className="stack">
          <div className="row">
            <button className="btn" onClick={() => setConfirming(true)}>
              Удалить
            </button>
            <button className="btn btn--primary" onClick={onEdit}>
              Изменить
            </button>
          </div>
          <button className="btn btn--block" onClick={onReopen}>
            Открыть расчёт
          </button>
          <button className="btn btn--block" onClick={onBack}>
            К списку операций
          </button>
        </div>
      )}
    </section>
  );
}
