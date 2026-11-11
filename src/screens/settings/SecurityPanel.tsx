import { useState } from 'react';
import { useVault, vault } from '../../secure';
import { CodeForm, Message, useTask } from './shared';

export function SecurityPanel() {
  const { status, hasPasskey, hasCode, passkeySupported } = useVault();
  const { busy, msg, run } = useTask();
  const [codeForm, setCodeForm] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);

  const isProtected = status === 'unlocked';

  return (
    <section className="box stack" aria-labelledby="sec-title">
      <h2 id="sec-title" className="subtitle">
        Защита данных
      </h2>

      <p>
        {isProtected
          ? `Данные зашифрованы на устройстве. Вход: ${[hasPasskey && 'Face ID', hasCode && 'код'].filter(Boolean).join(' и ')}.`
          : 'Сейчас данные хранятся на устройстве без шифрования. Включи защиту, и без Face ID или кода их никто не откроет.'}
      </p>

      {!hasPasskey && (
        <div className="stack">
          <button
            className="btn btn--primary btn--block"
            disabled={busy || !passkeySupported}
            onClick={() => run(() => vault.enablePasskey(), 'Face ID включён.')}
          >
            Включить Face ID
          </button>
          {!passkeySupported && (
            <p className="muted">
              Этот браузер не умеет получать секрет из Face ID (нужен Safari 18, Chrome 116 или новее по HTTPS). Можно
              защитить данные кодом.
            </p>
          )}
        </div>
      )}

      {!codeForm && (
        <div className="row">
          <button className="btn" disabled={busy} onClick={() => setCodeForm(true)}>
            {hasCode ? 'Сменить код' : 'Задать код'}
          </button>
          {hasCode && hasPasskey && (
            <button className="btn" disabled={busy} onClick={() => run(() => vault.removeCode(), 'Код удалён.')}>
              Убрать код
            </button>
          )}
        </div>
      )}

      {codeForm && (
        <CodeForm
          busy={busy}
          submitLabel="Сохранить"
          onCancel={() => setCodeForm(false)}
          onSubmit={async (code) => {
            if (await run(() => vault.enableCode(code), 'Код сохранён.')) setCodeForm(false);
          }}
        />
      )}

      {isProtected && (
        <div className="stack">
          <button className="btn btn--block" onClick={() => void vault.lock()}>
            Заблокировать сейчас
          </button>
          {!confirmOff ? (
            <button className="btn btn--block" onClick={() => setConfirmOff(true)}>
              Выключить защиту
            </button>
          ) : (
            <div className="note stack">
              <p>Данные снова будут храниться без шифрования. Выключить?</p>
              <div className="row">
                <button className="btn" onClick={() => setConfirmOff(false)}>
                  Отмена
                </button>
                <button
                  className="btn btn--danger"
                  disabled={busy}
                  onClick={async () => {
                    if (await run(() => vault.disableProtection(), 'Защита выключена.')) setConfirmOff(false);
                  }}
                >
                  Выключить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Message msg={msg} />
      {isProtected && <p className="muted">Приложение блокируется само, если свернуть его больше чем на 30 секунд.</p>}
    </section>
  );
}
