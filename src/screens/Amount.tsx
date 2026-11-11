import { useState } from 'react';
import { FoxSays } from '../components/Fox';
import { RateInfo } from '../components/RateInfo';
import { MARKETS, type Market } from '../data/etfs';
import { CURRENCIES, formatMoney, parseAmount, type Currency } from '../lib/money';

interface Props {
  /** What the amount will be spread over: a risk profile or the user's own portfolio. */
  target: { kind: 'profile' | 'custom'; label: string; color: string };
  /** Funds of a hand-built portfolio belong to one market, so the choice is not offered. */
  showMarket: boolean;
  amount: string;
  currency: Currency;
  market: Market;
  onChange: (patch: { amount?: string; currency?: Currency; market?: Market }) => void;
  onSubmit: (total: number) => void;
  onBack: () => void;
}

const MAX = 1_000_000_000;
const QUICK = [500, 1000, 5000, 10000];
/** Round figures per currency for the quick buttons; deliberately not tied to the live rate, so they stay tidy. */
const QUICK_SCALE: Record<Currency, number> = { USD: 1, EUR: 1, BYN: 3 };

export function Amount({ target, showMarket, amount, currency, market, onChange, onSubmit, onBack }: Props) {
  const [touched, setTouched] = useState(false);
  const value = parseAmount(amount);
  const valid = Number.isFinite(value) && value >= 1 && value <= MAX;
  const quickScale = QUICK_SCALE[currency];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (valid) onSubmit(value);
  };

  return (
    <form className="screen" onSubmit={submit} noValidate>
      <h1 className="title">Сколько вложим?</h1>
      <p className="muted">
        {target.kind === 'profile' ? 'Профиль' : 'Портфель'}: <b style={{ color: target.color }}>{target.label}</b>
      </p>

      <div className="box stack">
        <label htmlFor="amount" className="label">
          Сумма
        </label>
        <input
          id="amount"
          className="input"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          value={amount}
          aria-invalid={touched && !valid}
          aria-describedby="amount-hint"
          onChange={(e) => onChange({ amount: e.target.value.replace(/[^\d\s.,]/g, '') })}
        />
        <p id="amount-hint" className={touched && !valid ? 'error' : 'muted'}>
          {touched && !valid
            ? 'Введи сумму больше нуля, например 1000 или 2500,50'
            : valid
              ? `Вложим ${formatMoney(value, currency)}`
              : 'Только та сумма, которую не страшно потерять в ближайшие годы'}
        </p>

        <div className="chips" aria-label="Быстрый выбор суммы">
          {QUICK.map((q) => (
            <button key={q} type="button" className="chip" onClick={() => onChange({ amount: String(q * quickScale) })}>
              {formatMoney(q * quickScale, currency)}
            </button>
          ))}
        </div>
      </div>

      <fieldset className="box stack choice">
        <legend className="label">Валюта</legend>
        <div className="chips">
          {CURRENCIES.map((c) => (
            <label key={c.code} className={`chip ${currency === c.code ? 'is-selected' : ''}`}>
              <input type="radio" name="currency" checked={currency === c.code} onChange={() => onChange({ currency: c.code })} />
              {c.code}
            </label>
          ))}
        </div>
      </fieldset>

      <RateInfo />

      {showMarket && (
      <fieldset className="box stack choice">
        <legend className="label">Где покупаешь ETF</legend>
        <div className="chips">
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <label key={m} className={`chip ${market === m ? 'is-selected' : ''}`}>
              <input type="radio" name="market" checked={market === m} onChange={() => onChange({ market: m })} />
              {MARKETS[m].title}
            </label>
          ))}
        </div>
        <p className="muted">{MARKETS[market].hint}</p>
      </fieldset>
      )}

      <FoxSays>
        При небольшой сумме в расчёте остаётся меньше фондов: так комиссии брокера меньше влияют на результат.
      </FoxSays>

      <div className="row">
        <button type="button" className="btn" onClick={onBack}>
          Назад
        </button>
        <button type="submit" className="btn btn--primary">
          Рассчитать
        </button>
      </div>
    </form>
  );
}
