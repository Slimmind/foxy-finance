import { useState } from 'react';
import { formatMoney, parseAmount } from '../lib/money';
import { NOTE_MAX, editOperation, formatDate, todayISO } from '../lib/operations';
import { sourceInfo } from '../lib/portfolio';
import type { Operation } from '../lib/storage';

interface Props {
  op: Operation;
  onSave: (updated: Operation) => void;
  onCancel: () => void;
}

const asInput = (n: number) => String(n).replace('.', ',');
const amountOf = (raw: string): number => {
  if (raw.trim() === '') return 0;
  const n = parseAmount(raw);
  return Number.isFinite(n) ? n : NaN;
};

export function OperationEdit({ op, onSave, onCancel }: Props) {
  const [date, setDate] = useState(op.date);
  const [note, setNote] = useState(op.note);
  const [amounts, setAmounts] = useState(() => op.positions.map((p) => asInput(p.amount)));
  const { label, color } = sourceInfo(op.source);

  const parsed = amounts.map(amountOf);
  const badAmount = parsed.some((a) => Number.isNaN(a) || a < 0);
  const total = parsed.reduce((s, a) => s + (Number.isFinite(a) && a > 0 ? a : 0), 0);
  const future = date > todayISO();
  const result = badAmount || future ? null : editOperation(op, { date, note, amounts: parsed });

  const error = future
    ? 'Дата не может быть в будущем.'
    : badAmount
      ? 'Суммы должны быть числами не меньше нуля.'
      : !result
        ? 'Укажи корректную дату и хотя бы одну сумму больше нуля.'
        : '';

  return (
    <form
      className="screen"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (result) onSave(result);
      }}
    >
      <h1 className="title">Изменить операцию</h1>
      <p className="muted">
        <b style={{ color }}>{label}</b>, валюта {op.currency}
      </p>

      <div className="box stack">
        <div className="field">
          <label htmlFor="edit-date" className="label">
            Дата операции
          </label>
          <input
            id="edit-date"
            className="input input--small"
            type="date"
            value={date}
            max={todayISO()}
            required
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="edit-note" className="label">
            Заметка
          </label>
          <textarea
            id="edit-note"
            className="input input--small textarea"
            rows={2}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <div className="box stack">
        <h2 className="subtitle">Фактические суммы</h2>
        <p className="muted">
          Исправь суммы, если купил(а) не совсем по расчёту. Пустое значение или 0 уберёт фонд из операции.
        </p>
        {op.positions.map((p, i) => (
          <div key={p.ticker} className="field">
            <label htmlFor={`edit-amount-${i}`} className="label">
              {p.ticker}
            </label>
            <input
              id={`edit-amount-${i}`}
              className="input input--small"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={amounts[i]}
              aria-invalid={Number.isNaN(parsed[i])}
              onChange={(e) => {
                const next = [...amounts];
                next[i] = e.target.value.replace(/[^\d\s.,]/g, '');
                setAmounts(next);
              }}
            />
          </div>
        ))}
        <p>
          Итого: <b>{formatMoney(Math.round(total * 100) / 100, op.currency)}</b>
          <span className="muted"> · было {formatMoney(op.total, op.currency)}</span>
        </p>
      </div>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {date !== op.date && !future && <p className="muted">Новая дата: {formatDate(date, true)}</p>}

      <div className="row">
        <button type="button" className="btn" onClick={onCancel}>
          Отмена
        </button>
        <button type="submit" className="btn btn--primary" disabled={!result}>
          Сохранить
        </button>
      </div>
    </form>
  );
}
