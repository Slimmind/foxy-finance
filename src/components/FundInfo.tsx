import { CATEGORIES, fundLinks, type Fund } from '../data/catalog';
import { formatPercent } from '../lib/money';
import { formatDate } from '../lib/operations';

export const distributionLabel = (f: Fund) => (f.distribution === 'acc' ? 'Накопительный' : 'Выплачивает доход');

/** The full factual description of a fund, used in the catalog and in the builder. */
export function FundInfo({ fund }: { fund: Fund }) {
  const cat = CATEGORIES[fund.category];
  const links = fundLinks(fund);
  return (
    <div className="stack fundinfo">
      <p>{fund.summary}</p>
      {fund.note && <p className="note">{fund.note}</p>}

      <dl className="facts">
        <dt>Комиссия</dt>
        <dd>≈ {formatPercent(fund.ter, 2)} в год</dd>
        <dt>Эмитент</dt>
        <dd>{fund.issuer}</dd>
        <dt>Индекс</dt>
        <dd>{fund.index}</dd>
        <dt>Состав</dt>
        <dd>{fund.holdings}</dd>
        <dt>Доход</dt>
        <dd>
          {distributionLabel(fund)}
          <span className="muted">
            {fund.distribution === 'acc' ? ': доход реинвестируется внутри фонда' : ': дивиденды и проценты поступают на счёт'}
          </span>
        </dd>
        <dt>Валюта фонда</dt>
        <dd>{fund.currency}</dd>
        {fund.isin && (
          <>
            <dt>ISIN</dt>
            <dd>{fund.isin}</dd>
          </>
        )}
      </dl>

      <div>
        <h4 className="label">Когда рассматривают</h4>
        <p>{cat.fits}</p>
      </div>
      <div>
        <h4 className="label">Риски и нюансы</h4>
        <p>{cat.risks}</p>
      </div>

      <div className="stack">
        <h4 className="label">Проверка данных</h4>
        {fund.idsChecked && (
          <p className="muted">
            Тикер и ISIN сверены {formatDate(fund.idsChecked)} по базе OpenFIGI.
          </p>
        )}
        {fund.factsChecked ? (
          <p className="ok">Комиссия и состав сверены с документами эмитента {formatDate(fund.factsChecked)}.</p>
        ) : (
          <p className="warn">
            Комиссия и состав пока не сверены с документами эмитента: цифры приблизительные. Перед покупкой проверь их в
            проспекте и документе KID/KIID.
          </p>
        )}
        {links.length > 0 && (
          <ul className="links">
            {links.map((l) => (
              <li key={l.url}>
                <a className="link" href={l.url} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
