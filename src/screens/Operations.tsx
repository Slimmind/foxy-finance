import { useState } from 'react';
import { FoxSays } from '../components/Fox';
import { formatMoney } from '../lib/money';
import { formatDate, sortOperations, summarizeByCurrency } from '../lib/operations';
import { sourceInfo } from '../lib/portfolio';
import type { Operation } from '../lib/storage';

interface Props {
  items: Operation[];
  onOpen: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
  onHome: () => void;
}

export function Operations({ items, onOpen, onEdit, onDelete, onClear, onHome }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const sorted = sortOperations(items);
  const totals = summarizeByCurrency(items);

  return (
    <section className="screen">
      <h1 className="title">Операции</h1>

      {items.length === 0 ? (
        <>
          <FoxSays>
            Операций пока нет. Сделай расчёт и, если покупка совершена, нажми «Записать операцию».
          </FoxSays>
          <button className="btn btn--primary btn--block" onClick={onHome}>
            На главную
          </button>
        </>
      ) : (
        <>
          <div className="box stack">
            <h2 className="subtitle">Всего записано</h2>
            <ul className="stack">
              {totals.map((t) => (
                <li key={t.currency}>
                  <div className="pos__amount">{formatMoney(t.total, t.currency)}</div>
                  <div className="muted">операций: {t.count}</div>
                </li>
              ))}
            </ul>
            <p className="muted">Суммы по операциям, которые ты записал(а) сам(а). Приложение сделок не совершает.</p>
          </div>

          <ul className="schedule">
            {sorted.map((op) => {
              const { label, color } = sourceInfo(op.source);
              return (
                <li key={op.id} className="box stack">
                  <div className="rb__head">
                    <b style={{ color }}>{label}</b>
                    <span className="muted">{formatDate(op.date)}</span>
                  </div>
                  <div className="pos__amount">{formatMoney(op.total, op.currency)}</div>
                  <p className="muted">{op.positions.map((p) => `${p.ticker} ${Math.round(p.weight)}%`).join(' · ')}</p>
                  {op.note && <p className="opnote">{op.note}</p>}

                  {deleting === op.id ? (
                    <div className="note stack">
                      <p>Удалить операцию от {formatDate(op.date)} на {formatMoney(op.total, op.currency)}?</p>
                      <div className="row">
                        <button className="btn btn--small" onClick={() => setDeleting(null)}>
                          Отмена
                        </button>
                        <button
                          className="btn btn--small btn--danger"
                          onClick={() => {
                            onDelete(op.id);
                            setDeleting(null);
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="row">
                      <button className="btn btn--small" onClick={() => setDeleting(op.id)}>
                        Удалить
                      </button>
                      <button className="btn btn--small" onClick={() => onEdit(op.id)}>
                        Изменить
                      </button>
                      <button className="btn btn--small btn--primary" onClick={() => onOpen(op.id)}>
                        Открыть
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {!clearing ? (
            <button className="btn btn--block" onClick={() => setClearing(true)}>
              Удалить все операции
            </button>
          ) : (
            <div className="note stack">
              <p>Все операции ({items.length}) будут удалены без возможности вернуть. Удалить?</p>
              <div className="row">
                <button className="btn" onClick={() => setClearing(false)}>
                  Отмена
                </button>
                <button
                  className="btn btn--danger"
                  onClick={() => {
                    onClear();
                    setClearing(false);
                  }}
                >
                  Удалить все
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
