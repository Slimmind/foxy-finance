import { useEffect, useRef } from 'react';
import { isInstallAvailable, promptInstall, useInstallState } from '../pwa/install';
import { Fox } from './Fox';

const DISMISS_KEY = 'foxy-finance:install-dismissed';
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

export function wasInstallDismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY));
    return Number.isFinite(at) && at > 0 && Date.now() - at < SNOOZE_MS;
  } catch {
    return false;
  }
}

const rememberDismiss = () => {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // ignore: the dialog will simply show again next time
  }
};

export function InstallDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const state = useInstallState();
  const primary = useRef<HTMLButtonElement>(null);
  const visible = open && isInstallAvailable(state);

  useEffect(() => {
    if (!visible) return;
    primary.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        rememberDismiss();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible, onClose]);

  if (!visible) return null;

  const dismiss = () => {
    rememberDismiss();
    onClose();
  };

  const install = async () => {
    const result = await promptInstall();
    if (result !== 'dismissed') onClose();
    else dismiss();
  };

  return (
    <div className="modal" role="presentation">
      <div className="modal__window box" role="dialog" aria-modal="true" aria-labelledby="install-title">
        <Fox scale={6} mood="happy" className="modal__fox" />
        <h2 id="install-title" className="title">
          Установи Foxy!
        </h2>
        <p>
          Добавь приложение на экран: оно запускается как обычное, работает без интернета и ничего не весит.
        </p>

        {state.canPrompt ? (
          <div className="modal__actions">
            <button ref={primary} className="btn btn--primary" onClick={install}>
              Установить
            </button>
            <button className="btn" onClick={dismiss}>
              Позже
            </button>
          </div>
        ) : (
          <>
            <ol className="steps">
              <li>
                Нажми <b>«Поделиться»</b> в панели Safari
              </li>
              <li>
                Выбери <b>«На экран Домой»</b>
              </li>
              <li>
                Нажми <b>«Добавить»</b>
              </li>
            </ol>
            <div className="modal__actions">
              <button ref={primary} className="btn btn--primary" onClick={dismiss}>
                Понятно
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function InstallButton({ onClick }: { onClick: () => void }) {
  const state = useInstallState();
  if (!isInstallAvailable(state)) return null;
  return (
    <button className="btn btn--small btn--gold" onClick={onClick}>
      Установить
    </button>
  );
}
