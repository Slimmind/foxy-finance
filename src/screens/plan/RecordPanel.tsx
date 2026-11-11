import { useState } from 'react';
import { NOTE_MAX, formatDate, todayISO } from '../../lib/operations';
import type { Operation } from '../../lib/storage';

interface Props {
  /** The operation recorded from this calculation, if the user already did it. */
  recorded: Operation | undefined;
  onRecord: (meta: { date: string; note: string }) => void;
  onOpenRecorded: () => void;
  onRecordAgain: () => void;
}

export function RecordPanel({ recorded, onRecord, onOpenRecorded, onRecordAgain }: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(todayISO);
  const [note, setNote] = useState('');

  const today = todayISO();
  const future = date > today;
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && !future;

  if (recorded && !open) {
    return (
      <div className="box stack offer is-done" role="status">
        <h2 className="subtitle">Операция записана</h2>
        <p className="ok">Покупка от {formatDate(recorded.date)} добавлена в список операций.</p>
        <div className="row">
          <button className="btn" onClick={() => {
            setDate(todayISO());
            setNote('');
            setOpen(true);
            onRecordAgain();
          }}>
            Записать ещё одну
          </button>
          <button className="btn btn--primary" onClick={onOpenRecorded}>
            Открыть операцию
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="box stack offer">
      <h2 className="subtitle">Записать как операцию</h2>
      <p>
        Если ты уже совершил(а) покупку по этому расчёту, запиши её. Операция попадёт в список, и её можно будет
        просмотреть, изменить или удалить.
      </p>
      <p className="muted">Приложение само не совершает сделок: записи отражают только то, что ты отметил(а).</p>

      {!open ? (
        <button className="btn btn--primary btn--block" onClick={() => setOpen(true)}>
          Записать операцию
        </button>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onRecord({ date, note });
            setOpen(false);
          }}
        >
          <div className="field">
            <label htmlFor="op-date" className="label">
              Дата операции
            </label>
            <input
              id="op-date"
              className="input input--small"
              type="date"
              value={date}
              max={today}
              required
              aria-invalid={!valid}
              onChange={(e) => setDate(e.target.value)}
            />
            {future && <p className="error">Дата не может быть в будущем.</p>}
          </div>
          <div className="field">
            <label htmlFor="op-note" className="label">
              Заметка (необязательно)
            </label>
            <textarea
              id="op-note"
              className="input input--small textarea"
              rows={2}
              maxLength={NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={() => setOpen(false)}>
              Отмена
            </button>
            <button type="submit" className="btn btn--primary" disabled={!valid}>
              Записать
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
