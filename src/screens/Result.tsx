import { AllocationBar, RiskMeter } from '../components/visuals';
import { Fox, FoxSays } from '../components/Fox';
import { SLOTS, SLOT_COLORS, type SlotId } from '../data/etfs';
import { equityShare } from '../lib/allocate';
import { formatPercent } from '../lib/money';
import type { RiskResult } from '../lib/scoring';

interface Props {
  risk: RiskResult;
  showSecurityNudge: boolean;
  onSecure: () => void;
  onNext: () => void;
  onRetake: () => void;
  onBuilder: () => void;
}

export function Result({ risk, showSecurityNudge, onSecure, onNext, onRetake, onBuilder }: Props) {
  const { profile } = risk;
  const items = (Object.entries(profile.weights) as [SlotId, number][]).map(([slot, weight]) => ({
    slot,
    key: slot,
    weight,
    label: SLOTS[slot].title,
    color: SLOT_COLORS[slot],
  }));

  return (
    <section className="screen">
      <div className="center">
        <Fox scale={8} mood="happy" />
      </div>
      <p className="muted center">Твой риск-профиль</p>
      <h1 className="title title--big" style={{ color: profile.color }}>
        {profile.name}
      </h1>
      <p className="center tagline">{profile.tagline}</p>

      <div className="box stack">
        <RiskMeter level={profile.level} color={profile.color} />
        <p>{profile.description}</p>
        {risk.capped && (
          <p className="note">
            По характеру ты смелее, но короткий горизонт или отсутствие подушки безопасности не позволяют рисковать
            сильнее. Лисичка подстраховала.
          </p>
        )}
      </div>

      <div className="box stack">
        <h2 className="subtitle">Состав портфеля</h2>
        <AllocationBar items={items} />
        <ul className="legend">
          {items.map((i) => (
            <li key={i.slot}>
              <span className="swatch" style={{ background: i.color }} />
              {i.label} <b>{i.weight}%</b>
            </li>
          ))}
        </ul>
      </div>

      <div className="stats">
        <div className="stat box">
          <span className="muted">Акции</span>
          <b>{formatPercent(equityShare(profile), 0)}</b>
        </div>
        <div className="stat box">
          <span className="muted">Типичная просадка</span>
          <b>до -{profile.drawdown}%</b>
        </div>
      </div>

      {showSecurityNudge && (
        <div className="box stack">
          <h2 className="subtitle">Защити свои данные</h2>
          <p>Профиль и планы лежат на устройстве. Включи вход по Face ID, и они будут зашифрованы.</p>
          <button className="btn btn--gold" onClick={onSecure}>
            Включить защиту
          </button>
        </div>
      )}

      <FoxSays>Дальше укажи сумму: по ней рассчитается распределение по ETF для этого профиля.</FoxSays>

      <div className="stack">
        <button className="btn btn--primary btn--block" onClick={onNext}>
          Ввести сумму
        </button>
        <button className="btn btn--block" onClick={onBuilder}>
          Собрать портфель самому
        </button>
        <button className="btn btn--block" onClick={onRetake}>
          Пройти заново
        </button>
      </div>
    </section>
  );
}
