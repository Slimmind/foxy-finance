import { useState } from 'react';
import { InstallButton } from '../../components/InstallPrompt';
import type { AppState } from '../../lib/storage';
import { vault } from '../../secure';
import { BackupPanel } from './BackupPanel';
import { SecurityPanel } from './SecurityPanel';
import { Message, useTask } from './shared';

interface Props {
  app: AppState;
  onReplaceState: (next: AppState) => void;
  onWiped: () => void;
  onOpenInstall: () => void;
}

export function Settings({ app, onReplaceState, onWiped, onOpenInstall }: Props) {
  const [confirm, setConfirm] = useState(false);
  const { busy, msg, run } = useTask();

  return (
    <section className="screen">
      <h1 className="title">Защита и данные</h1>

      <SecurityPanel />
      <BackupPanel app={app} onReplaceState={onReplaceState} />

      <section className="box stack" aria-labelledby="danger-title">
        <h2 id="danger-title" className="subtitle">
          Приложение
        </h2>
        <InstallButton onClick={onOpenInstall} />

        {!confirm ? (
          <button className="btn btn--block" onClick={() => setConfirm(true)}>
            Удалить все данные
          </button>
        ) : (
          <div className="note stack">
            <p>Профиль, планы и защита будут удалены с этого устройства без возможности вернуть. Удалить?</p>
            <div className="row">
              <button className="btn" onClick={() => setConfirm(false)}>
                Отмена
              </button>
              <button
                className="btn btn--danger"
                disabled={busy}
                onClick={async () => {
                  if (await run(() => vault.wipe())) {
                    setConfirm(false);
                    onWiped();
                  }
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        )}
        <Message msg={msg} />
      </section>
    </section>
  );
}
