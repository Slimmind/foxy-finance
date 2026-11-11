import { formatDate } from '../lib/operations';
import { isStale } from '../lib/rates';
import { ratesStore, useRates } from '../lib/ratesClient';
import { staticPerUsd } from '../lib/money';

const rate4 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 4, maximumFractionDigits: 4 });
const rate2 = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const when = (ts: number) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(ts));

/** Shows which exchange rate the calculations use, how old it is, and lets the user refresh it. */
export function RateInfo() {
  const { rates, source, loading, failed } = useRates();
  const stale = rates ? isStale(rates, Date.now()) : false;

  let status: { text: string; warn: boolean };
  if (loading) status = { text: 'Обновляем курс…', warn: false };
  else if (!rates) {
    status = {
      text: failed
        ? `Курс получить не удалось. Для расчётов используется приблизительный: 1 $ ≈ ${staticPerUsd('BYN')} BYN, 1 € ≈ ${rate2.format(1 / staticPerUsd('EUR'))} $.`
        : 'Курс ещё не загружен.',
      warn: failed,
    };
  } else if (stale) {
    status = { text: `Курс устарел: он получен ${when(rates.fetchedAt)}. Подключись к интернету, чтобы обновить.`, warn: true };
  } else if (failed) {
    status = { text: `Не удалось обновить, показан сохранённый курс (получен ${when(rates.fetchedAt)}).`, warn: true };
  } else {
    status = { text: `${source === 'live' ? 'Обновлён' : 'Получен'} ${when(rates.fetchedAt)}.`, warn: false };
  }

  return (
    <section className="box stack" aria-labelledby="rate-title">
      <h2 id="rate-title" className="label">
        Курс Нацбанка РБ{rates && <span className="muted"> на {formatDate(rates.asOf, true)}</span>}
      </h2>

      {rates && (
        <dl className="facts">
          <dt>1 $</dt>
          <dd>{rate4.format(rates.usdByn)} BYN</dd>
          <dt>1 €</dt>
          <dd>
            {rate4.format(rates.eurByn)} BYN <span className="muted">· {rate2.format(rates.eurByn / rates.usdByn)} $</span>
          </dd>
        </dl>
      )}

      <p className={status.warn ? 'error' : 'muted'} role="status">
        {status.text}
      </p>
      <p className="muted">По курсу определяется, считается ли сумма небольшой (тогда в расчёте меньше фондов).</p>

      <button type="button" className="btn btn--small" disabled={loading} onClick={() => void ratesStore.refresh(true)}>
        Обновить курс
      </button>
    </section>
  );
}
