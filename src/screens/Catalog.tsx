import { useMemo, useState } from 'react';
import { distributionLabel, FundInfo } from '../components/FundInfo';
import { RiskMeter } from '../components/visuals';
import { CATEGORIES, CATEGORY_ORDER, fundsOf, type CategoryId, type Fund } from '../data/catalog';
import { MARKETS, type Market } from '../data/etfs';
import { formatPercent } from '../lib/money';
import { MAX_CUSTOM_FUNDS } from '../lib/portfolio';

interface Props {
  market: Market;
  selected: Set<string>;
  onMarket: (m: Market) => void;
  onToggle: (fund: Fund) => void;
  onOpenBuilder: () => void;
}

type Sort = 'ticker' | 'ter' | 'risk';
const SORTS: { id: Sort; label: string }[] = [
  { id: 'ticker', label: 'По тикеру' },
  { id: 'ter', label: 'По комиссии (меньше сверху)' },
  { id: 'risk', label: 'По уровню риска (спокойные сверху)' },
];

export function Catalog({ market, selected, onMarket, onToggle, onOpenBuilder }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<CategoryId | 'all'>('all');
  const [sort, setSort] = useState<Sort>('ticker');

  const all = useMemo(() => fundsOf(market), [market]);
  const categories = useMemo(() => CATEGORY_ORDER.filter((id) => all.some((f) => f.category === id)), [all]);
  const activeCategory = category !== 'all' && categories.includes(category) ? category : 'all';

  const funds = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = all.filter(
      (f) =>
        (activeCategory === 'all' || f.category === activeCategory) &&
        (!q || [f.ticker, f.name, f.issuer, f.index, f.isin ?? ''].some((s) => s.toLowerCase().includes(q))),
    );
    return [...list].sort((a, b) =>
      sort === 'ter'
        ? a.ter - b.ter || a.ticker.localeCompare(b.ticker)
        : sort === 'risk'
          ? CATEGORIES[a.category].riskLevel - CATEGORIES[b.category].riskLevel || a.ticker.localeCompare(b.ticker)
          : a.ticker.localeCompare(b.ticker),
    );
  }, [all, activeCategory, query, sort]);

  const full = selected.size >= MAX_CUSTOM_FUNDS;

  return (
    <section className="screen">
      <h1 className="title">Каталог фондов</h1>
      <p>
        Справочник популярных ETF с описанием: что внутри, сколько стоит, какие риски. Фонды можно добавить в свой
        портфель.
      </p>

      <fieldset className="box stack choice">
        <legend className="label">Рынок</legend>
        <div className="chips">
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <label key={m} className={`chip ${market === m ? 'is-selected' : ''}`}>
              <input type="radio" name="catalog-market" checked={market === m} onChange={() => onMarket(m)} />
              {MARKETS[m].title}
            </label>
          ))}
        </div>
        <p className="muted">{MARKETS[market].hint}</p>
      </fieldset>

      <div className="box stack">
        <div className="field">
          <label htmlFor="fund-search" className="label">
            Поиск
          </label>
          <input
            id="fund-search"
            className="input input--small"
            type="search"
            autoComplete="off"
            placeholder="Тикер или название"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="field">
          <span className="label" id="cat-label">
            Категория
          </span>
          <div className="chips" role="group" aria-labelledby="cat-label">
            <button type="button" className={`chip ${activeCategory === 'all' ? 'is-selected' : ''}`} aria-pressed={activeCategory === 'all'} onClick={() => setCategory('all')}>
              Все
            </button>
            {categories.map((id) => (
              <button
                key={id}
                type="button"
                className={`chip ${activeCategory === id ? 'is-selected' : ''}`}
                aria-pressed={activeCategory === id}
                onClick={() => setCategory(id)}
              >
                {CATEGORIES[id].short}
              </button>
            ))}
          </div>
          {activeCategory !== 'all' && <p className="muted">{CATEGORIES[activeCategory].about}</p>}
        </div>

        <div className="field">
          <label htmlFor="fund-sort" className="label">
            Сортировка
          </label>
          <select id="fund-sort" className="select" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            {SORTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bar box">
        <span>
          В портфеле: <b>{selected.size}</b>
        </span>
        <button className="btn btn--small btn--gold" onClick={onOpenBuilder}>
          Открыть портфель
        </button>
      </div>

      <p className="muted" role="status">
        Найдено: {funds.length}
        {full && ` · в портфеле максимум ${MAX_CUSTOM_FUNDS} фондов`}
      </p>

      <ul className="funds">
        {funds.map((f) => {
          const cat = CATEGORIES[f.category];
          const isSelected = selected.has(f.id);
          return (
            <li key={f.id} className="fund box">
              <div className="pos__head">
                <span className="swatch" style={{ background: cat.color }} />
                <b className="pos__ticker">{f.ticker}</b>
                <span className="pos__weight">≈ {formatPercent(f.ter, 2)}</span>
              </div>
              <p className="fund__name">{f.name}</p>
              <div className="tags">
                <span className="tag">{cat.short}</span>
                <span className="tag">{distributionLabel(f)}</span>
                {!f.factsChecked && <span className="tag tag--warn">Комиссия не сверена</span>}
              </div>
              <div className="fund__risk">
                <span className="muted">Риск</span>
                <RiskMeter level={cat.riskLevel} color={cat.color} />
              </div>
              <details className="pos__more">
                <summary>Подробнее о фонде</summary>
                <FundInfo fund={f} />
              </details>
              <button
                className={`btn btn--small ${isSelected ? '' : 'btn--primary'}`}
                disabled={!isSelected && full}
                aria-pressed={isSelected}
                onClick={() => onToggle(f)}
              >
                {isSelected ? 'Убрать из портфеля' : 'В портфель'}
              </button>
            </li>
          );
        })}
      </ul>

      {funds.length === 0 && <p className="muted">Ничего не найдено. Попробуй изменить поиск или категорию.</p>}

      <p className="fineprint">
        Описания справочные и составлены по открытым данным эмитентов. Комиссии и состав приблизительны и со временем
        меняются. Это не рекомендация покупать или продавать какие-либо ценные бумаги. Перед покупкой изучи проспект и
        KID/KIID фонда.
      </p>
    </section>
  );
}
