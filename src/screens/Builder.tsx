import { useMemo } from 'react';
import { FoxSays } from '../components/Fox';
import { FundInfo } from '../components/FundInfo';
import { AllocationBar } from '../components/visuals';
import { CATEGORIES, fundById } from '../data/catalog';
import { MARKETS, type AssetClass, type Market } from '../data/etfs';
import { equityShare } from '../lib/allocate';
import { formatPercent } from '../lib/money';
import { analyzeCustom, equalWeights, normalizeWeights, removeFund, weightTotal, type CustomItem } from '../lib/portfolio';
import type { RiskResult } from '../lib/scoring';

interface Props {
  market: Market;
  items: CustomItem[];
  risk: RiskResult | null;
  onMarket: (m: Market) => void;
  onItems: (items: CustomItem[]) => void;
  onOpenCatalog: () => void;
  onCalculate: () => void;
}

const num1 = (v: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(v);

const CLASS_LABELS: Record<AssetClass, string> = {
  equity: 'Акции',
  bonds: 'Облигации',
  cash: 'Кэш',
  gold: 'Золото',
};

export function Builder({ market, items, risk, onMarket, onItems, onOpenCatalog, onCalculate }: Props) {
  const total = weightTotal(items);
  const analysis = useMemo(() => analyzeCustom(items), [items]);
  const ready = items.length > 0 && total === 100;
  const zero = items.filter((i) => i.weight === 0);
  const used = items.length - zero.length;

  const setWeight = (fundId: string, raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 3);
    const weight = Math.min(100, digits === '' ? 0 : Number(digits));
    onItems(items.map((i) => (i.fundId === fundId ? { ...i, weight } : i)));
  };

  const barItems = items
    .filter((i) => i.weight > 0 && fundById(i.fundId))
    .map((i) => {
      const f = fundById(i.fundId)!;
      return { key: f.id, weight: (i.weight / total) * 100, label: f.ticker, color: CATEGORIES[f.category].color };
    });

  const profile = risk?.profile;
  const dd = analysis.drawdown;
  const compare = !profile || analysis.total === 0 ? null : dd > profile.drawdown + 5 ? 'выше' : dd < profile.drawdown - 5 ? 'ниже' : 'близка к';

  return (
    <section className="screen">
      <h1 className="title">Свой портфель</h1>
      <p>Выбери фонды из каталога, задай доли и посмотри, что получится: состав, комиссию и оценку колебаний.</p>

      <fieldset className="box stack choice">
        <legend className="label">Рынок</legend>
        <div className="chips">
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <label key={m} className={`chip ${market === m ? 'is-selected' : ''}`}>
              <input type="radio" name="builder-market" checked={market === m} onChange={() => onMarket(m)} />
              {MARKETS[m].title}
            </label>
          ))}
        </div>
        <p className="muted">Фонды разных рынков в одном портфеле не смешиваются: для каждого рынка список свой.</p>
      </fieldset>

      {items.length === 0 ? (
        <>
          <FoxSays>Портфель пока пуст. Открой каталог, прочитай описания и добавь подходящие фонды.</FoxSays>
          <button className="btn btn--primary btn--block" onClick={onOpenCatalog}>
            Открыть каталог
          </button>
        </>
      ) : (
        <>
          <ul className="funds">
            {items.map((it) => {
              const f = fundById(it.fundId);
              if (!f) return null;
              const cat = CATEGORIES[f.category];
              return (
                <li key={f.id} className="fund box">
                  <div className="pos__head">
                    <span className="swatch" style={{ background: cat.color }} />
                    <b className="pos__ticker">{f.ticker}</b>
                    <span className="pos__weight">{cat.short}</span>
                  </div>
                  <p className="fund__name">{f.name}</p>
                  <div className="weightrow">
                    <label htmlFor={`w-${f.id}`} className="label">
                      Доля, %
                    </label>
                    <input
                      id={`w-${f.id}`}
                      className="input input--small weightrow__input"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="0"
                      value={it.weight === 0 ? '' : String(it.weight)}
                      onChange={(e) => setWeight(f.id, e.target.value)}
                    />
                    <button className="btn btn--small" onClick={() => onItems(removeFund(items, f.id))}>
                      Убрать<span className="sr-only"> {f.ticker}</span>
                    </button>
                  </div>
                  {it.weight === 0 && <p className="warn">Доля 0%: фонд пока не войдёт в расчёт.</p>}
                  <details className="pos__more">
                    <summary>О фонде</summary>
                    <FundInfo fund={f} />
                  </details>
                </li>
              );
            })}
          </ul>

          <div className="row">
            <button className="btn" onClick={onOpenCatalog}>
              Добавить фонд
            </button>
            <button className="btn" onClick={() => onItems(equalWeights(items))}>
              Поровну
            </button>
            {total !== 100 && total > 0 && (
              <button className="btn" onClick={() => onItems(normalizeWeights(items))}>
                К 100%
              </button>
            )}
          </div>

          <div className={`box sum ${total === 100 && zero.length === 0 ? 'is-ok' : ''}`} role="status">
            <p>
              Сумма долей: <b>{total}%</b>
            </p>
            <p className={total === 100 ? (zero.length > 0 ? 'warn' : 'ok') : 'muted'}>
              {total === 100
                ? zero.length > 0
                  ? `В расчёт войдёт ${used} из ${items.length} фондов: у остальных доля 0%. Нажми «Поровну», чтобы разделить сумму между всеми.`
                  : 'Можно рассчитывать.'
                : total < 100
                  ? `Осталось распределить ${100 - total}%.`
                  : `Превышение на ${total - 100}%. Уменьши доли или нажми «К 100%».`}
            </p>
          </div>

          {analysis.total > 0 && (
            <div className="box stack">
              <h2 className="subtitle">Состав и оценка</h2>
              <AllocationBar items={barItems} />
              <ul className="legend">
                {(Object.keys(CLASS_LABELS) as AssetClass[])
                  .filter((c) => analysis.byClass[c] > 0)
                  .map((c) => (
                    <li key={c}>
                      {CLASS_LABELS[c]} <b>{formatPercent(analysis.byClass[c], 0)}</b>
                    </li>
                  ))}
              </ul>

              <dl className="facts">
                <dt>Комиссия</dt>
                <dd>≈ {formatPercent(analysis.ter, 2)} в год</dd>
                <dt>Сценарии, % в год</dt>
                <dd>
                  {num1(analysis.returns.low)} / {num1(analysis.returns.base)} / {num1(analysis.returns.high)}
                  <span className="muted"> (пессимистично / базово / оптимистично)</span>
                </dd>
                <dt>Возможная просадка</dt>
                <dd>до -{Math.round(dd)}% (оценка)</dd>
              </dl>

              {profile && compare && (
                <p className="note">
                  Твой профиль по тесту: {profile.name}, акции {equityShare(profile)}%, просадка до -{profile.drawdown}%.
                  Оценка для этого портфеля {compare} модели профиля: акции {Math.round(analysis.equityShare)}%, просадка
                  до -{Math.round(dd)}%.
                </p>
              )}

              {analysis.notes.length > 0 && (
                <div>
                  <h3 className="label">Обрати внимание</h3>
                  <ul className="notes">
                    {analysis.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="muted">
                Сценарии и просадка оцениваются по категориям фондов, а не по реальной истории, и служат ориентиром, а не
                прогнозом.
              </p>
            </div>
          )}

          <button className="btn btn--primary btn--block" disabled={!ready} onClick={onCalculate}>
            Рассчитать на сумму
          </button>
          {!ready && <p className="muted">Расчёт доступен, когда сумма долей равна 100%.</p>}
        </>
      )}

      <p className="fineprint">
        Конструктор показывает справочный расчёт, а не рекомендацию. Состав портфеля, фонды и доли выбираешь ты сам.
        Инвестиции связаны с риском потери средств.
      </p>
    </section>
  );
}
