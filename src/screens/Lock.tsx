import { useState } from 'react';
import { Fox } from '../components/Fox';
import { explainError } from '../secure/errors';
import { useVault, vault } from '../secure';

export function Lock() {
  const { hasPasskey, hasCode } = useVault();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);

  const attempt = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(explainError(e));
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="main">
      <section className="screen screen--center">
        <Fox scale={8} />
        <h1 className="title title--big">Foxy спит</h1>
        <p className="lead">Данные защищены. Подтверди, что это ты, чтобы войти.</p>

        {hasPasskey && (
          <div className="stack lock__block">
            <button className="btn btn--primary btn--block" disabled={busy} onClick={() => attempt(() => vault.unlockWithPasskey())}>
              Войти по Face ID
            </button>
            <p className="muted">На телефонах без Face ID система предложит отпечаток или код устройства.</p>
          </div>
        )}

        {hasCode && (
          <form
            className="stack lock__block"
            onSubmit={(e) => {
              e.preventDefault();
              if (code) void attempt(() => vault.unlockWithCode(code));
            }}
          >
            <label htmlFor="unlock-code" className="label">
              Код
            </label>
            <input
              id="unlock-code"
              className="input"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? 'lock-error' : undefined}
            />
            <button type="submit" className={`btn btn--block ${hasPasskey ? '' : 'btn--primary'}`} disabled={busy || !code}>
              Войти по коду
            </button>
          </form>
        )}

        <p id="lock-error" className="error" role="alert">
          {error}
        </p>

        {!resetting ? (
          <button className="btn btn--small" onClick={() => setResetting(true)}>
            Нет доступа?
          </button>
        ) : (
          <div className="box stack lock__block">
            <p>
              Без Face ID и кода открыть данные нельзя. Можно удалить их с этого устройства и начать заново, а потом
              восстановить из резервной копии (Защита, Резервная копия).
            </p>
            <div className="row">
              <button className="btn" onClick={() => setResetting(false)}>
                Отмена
              </button>
              <button className="btn btn--danger" onClick={() => void vault.wipe()}>
                Удалить данные
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
