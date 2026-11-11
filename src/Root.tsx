import { useEffect, useState } from 'react';
import App from './App';
import { Fox } from './components/Fox';
import { InstallDialog, wasInstallDismissedRecently } from './components/InstallPrompt';
import { Lock } from './screens/Lock';
import { useVault, vault } from './secure';

/** How long the app may stay in the background before it locks itself. */
const AUTO_LOCK_MS = 30_000;

export default function Root() {
  const { status } = useVault();
  const [installOpen, setInstallOpen] = useState(() => !wasInstallDismissedRecently());

  useEffect(() => {
    void vault.init().then(() => navigator.storage?.persist?.().catch(() => undefined));
  }, []);

  useEffect(() => {
    if (status !== 'unlocked') return;
    let hiddenAt: number | null = null;
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (hiddenAt !== null && Date.now() - hiddenAt > AUTO_LOCK_MS) void vault.lock();
      hiddenAt = null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [status]);

  return (
    <>
      {status === 'loading' && (
        <div className="splash" role="status" aria-label="Загрузка">
          <Fox scale={8} />
        </div>
      )}
      {status === 'locked' && <Lock />}
      {(status === 'plain' || status === 'unlocked') && (
        <App initialState={vault.getState()} onOpenInstall={() => setInstallOpen(true)} />
      )}
      <InstallDialog open={installOpen} onClose={() => setInstallOpen(false)} />
    </>
  );
}
