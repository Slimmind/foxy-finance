import { useEffect, useMemo, useState } from 'react';
import { FoxSays } from '../../components/Fox';
import { AllocationBar } from '../../components/visuals';
import type { Market } from '../../data/etfs';
import { PROFILES, getProfile, type ProfileId } from '../../data/profiles';
import { buildPlan, type Plan } from '../../lib/allocate';
import { formatMoney, formatPercent, type Currency } from '../../lib/money';
import { modelOf, type PortfolioSource } from '../../lib/portfolio';
import { useRates } from '../../lib/ratesClient';
import type { Operation } from '../../lib/storage';
import { DcaTab } from './DcaTab';
import { GrowthTab } from './GrowthTab';
import { RebalanceTab } from './RebalanceTab';
import { RecordPanel } from './RecordPanel';

export interface PlanInput {
  source: PortfolioSource;
  total: number;
  currency: Currency;
  market: Market;
}

interface Props {
  input: PlanInput;
  quizProfileId?: ProfileId;
  operations: Operation[];
  /** Records this calculation as a completed operation and returns its id. */
  onRecord: (plan: Plan, source: PortfolioSource, meta: { date: string; note: string }) => string;
  onOpenOperation: (id: string) => void;
  onProfileChange: (id: ProfileId) => void;
  onEdit: () => void;
  onEditPortfolio: () => void;
}

type Tab = 'plan' | 'growth' | 'dca' | 'rebalance';
const TABS: { id: Tab; label: string }[] = [
  { id: 'plan', label: 'План' },
  { id: 'growth', label: 'Рост' },
  { id: 'dca', label: 'Докупки' },
  { id: 'rebalance', label: 'Баланс' },
];

function planAsText(plan: Plan, label: string): string {
  const lines = plan.positions.map(
    (p) => `${p.etf.ticker} ${Math.round(p.weight)}% - ${formatMoney(p.amount, plan.currency)}`,
  );
  return [`Foxy Finance - ${label}`, `Сумма: ${formatMoney(plan.total, plan.currency)}`, ...lines].join('\n');
}

export function PlanView({
  input,
  quizProfileId,
  operations,
  onRecord,
  onOpenOperation,
  onProfileChange,
  onEdit,
  onEditPortfolio,
}: Props) {
  const [tab, setTab] = useState<Tab>('plan');
  const [status, setStatus] = useState('');
  const [recordedId, setRecordedId] = useState<string | null>(null);
  const { source } = input;
  const profile = source.kind === 'profile' ? getProfile(source.profileId) : undefined;
  const model = useMemo(() => modelOf(source, input.market, profile), [source, input.market, profile]);
  const { rates } = useRates();
  const perUsd = rates?.perUsd[input.currency];
  const plan = useMemo(
    () => buildPlan(input.total, model, input.market, input.currency, perUsd),
    [input.total, model, input.market, input.currency, perUsd],
  );

  // A different calculation is a different potential operation.
  const inputKey = JSON.stringify(input);
  useEffect(() => setRecordedId(null), [inputKey]);
  const recorded = operations.find((o) => o.id === recordedId);

  const share = async () => {
    const text = planAsText(plan, model.label);
    try {
      if (navigator.share) await navigator.share({ title: 'Foxy Finance', text });
      else {
        await navigator.clipboard.writeText(text);
        setStatus('План скопирован');
      }
    } catch (e) {
      if ((e as DOMException).name !== 'AbortError') setStatus('Не удалось поделиться');
    }
  };

  const manual = source.kind === 'profile' && quizProfileId !== undefined && quizProfileId !== source.profileId;

  return (
    <section className="screen">
      <h1 className="title">
        {formatMoney(plan.total, plan.currency)} <span className="muted">в ETF</span>
      </h1>

      {source.kind === 'profile' ? (
        <fieldset className="levels">
          <legend className="muted">
            Профиль: <b style={{ color: model.color }}>{model.label}</b>
            {manual && ' (выбран вручную)'}
          </legend>
          <div className="levels__row">
            {PROFILES.map((p) => (
              <label
                key={p.id}
                className={`level ${p.id === source.profileId ? 'is-selected' : ''}`}
                style={p.id === source.profileId ? { background: p.color } : undefined}
              >
                <input type="radio" name="level" checked={p.id === source.profileId} onChange={() => onProfileChange(p.id)} />
                <span aria-hidden="true">{p.level}</span>
                <span className="sr-only">{p.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="stack">
          <p className="muted">
            Портфель: <b style={{ color: model.color }}>{model.label}</b> ({Object.keys(model.weights).length} фондов)
          </p>
          <button className="btn btn--small" onClick={onEditPortfolio}>
            Изменить состав
          </button>
        </div>
      )}

      <nav className="tabs" aria-label="Разделы плана">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`tab ${tab === t.id ? 'is-active' : ''}`}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'plan' && (
        <div className="stack">
          <AllocationBar
            items={plan.positions.map((p) => ({ key: p.key, weight: p.weight, label: p.etf.ticker, color: p.color }))}
          />

          {plan.trimmedFrom && (
            <p className="note">
              Сумма небольшая, поэтому оставлено {plan.positions.length} крупнейших позиции из {plan.trimmedFrom}: так
              комиссии брокера не съедят доход. Вырастет сумма, вырастет и список.
            </p>
          )}

          <ul className="positions">
            {plan.positions.map((p) => (
              <li key={p.key} className="pos box">
                <div className="pos__head">
                  <span className="swatch" style={{ background: p.color }} />
                  <b className="pos__ticker">{p.etf.ticker}</b>
                  <span className="pos__weight">{formatPercent(p.weight, 0)}</span>
                </div>
                <div className="pos__amount">{formatMoney(p.amount, plan.currency)}</div>
                <details className="pos__more">
                  <summary>{p.title}</summary>
                  <p>{p.etf.name}</p>
                  {p.etf.isin && <p className="muted">ISIN {p.etf.isin}</p>}
                  <p className="muted">Комиссия фонда: {formatPercent(p.etf.ter, 2)} в год</p>
                  <p>{p.blurb}</p>
                </details>
              </li>
            ))}
          </ul>

          <div className="box">
            <p>
              Средняя комиссия фондов: <b>{formatPercent(plan.ter, 2)}</b> в год, примерно{' '}
              <b>{formatMoney(Math.round(plan.yearlyFee * 100) / 100, plan.currency)}</b>.
            </p>
          </div>

          <FoxSays mood="happy">
            Сумму можно вкладывать не сразу, а частями — пример графика покупок во вкладке «Докупки».
          </FoxSays>

          <RecordPanel
            recorded={recorded}
            onRecord={(meta) => setRecordedId(onRecord(plan, source, meta))}
            onOpenRecorded={() => recorded && onOpenOperation(recorded.id)}
            onRecordAgain={() => setRecordedId(null)}
          />

          <div className="row">
            <button className="btn" onClick={onEdit}>
              Изменить
            </button>
            <button className="btn" onClick={share}>
              Поделиться
            </button>
          </div>
          <p className="muted" role="status">
            {status}
          </p>
        </div>
      )}

      {tab === 'growth' && <GrowthTab plan={plan} model={model} />}
      {tab === 'dca' && <DcaTab plan={plan} />}
      {tab === 'rebalance' && <RebalanceTab model={model} currency={input.currency} />}

      <p className="fineprint">
        Расчёт учебный. Состав портфеля — {source.kind === 'profile' ? 'типовые модели' : 'выбранные тобой фонды и доли'}, комиссии
        фондов приблизительные, сценарии доходности — иллюстрация, а не прогноз. Прошлые результаты не гарантируют
        будущих. Это не инвестиционная рекомендация.
      </p>
    </section>
  );
}
