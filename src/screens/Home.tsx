import { Coin, Fox } from '../components/Fox';
import { InstallButton } from '../components/InstallPrompt';

interface Props {
  hasProfile: boolean;
  profileName?: string;
  onStart: () => void;
  onContinue: () => void;
  onInstall: () => void;
  onCatalog: () => void;
  onBuilder: () => void;
}

export function Home({ hasProfile, profileName, onStart, onContinue, onInstall, onCatalog, onBuilder }: Props) {
  return (
    <section className="screen screen--center">
      <div className="hero">
        <Coin scale={5} className="hero__coin hero__coin--a" />
        <Fox scale={12} className="hero__fox" />
        <Coin scale={4} className="hero__coin hero__coin--b" />
      </div>

      <h1 className="logo">
        <span>FOXY</span> <span className="logo__gold">FINANCE</span>
      </h1>
      <p className="lead">Узнай свой риск-профиль и получи готовый план покупки ETF на любую сумму.</p>

      <ol className="quest">
        <li>
          <b>1</b> Тест на риск
        </li>
        <li>
          <b>2</b> Твоя сумма
        </li>
        <li>
          <b>3</b> План по ETF
        </li>
      </ol>

      <div className="stack">
        {hasProfile && (
          <button className="btn btn--primary btn--block" onClick={onContinue}>
            Продолжить: {profileName}
          </button>
        )}
        <button className={`btn btn--block ${hasProfile ? '' : 'btn--primary'}`} onClick={onStart}>
          {hasProfile ? 'Пройти тест заново' : 'Начать игру'}
        </button>
        <button className="btn btn--block" onClick={onBuilder}>
          Собрать свой портфель
        </button>
        <button className="btn btn--block" onClick={onCatalog}>
          Каталог фондов
        </button>
        <InstallButton onClick={onInstall} />
      </div>

      <p className="fineprint">
        Учебный инструмент, а не инвестиционная рекомендация. Все данные хранятся только на твоём устройстве.
      </p>
    </section>
  );
}
