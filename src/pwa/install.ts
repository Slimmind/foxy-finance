import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface InstallState {
  /** The browser handed us a native install prompt (Chrome, Edge, Samsung Internet…). */
  canPrompt: boolean;
  /** iOS has no install API — we show "Add to Home Screen" instructions instead. */
  ios: boolean;
  /** Already running as an installed app. */
  standalone: boolean;
}

const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

let deferred: BeforeInstallPromptEvent | null = null;
let state: InstallState = { canPrompt: false, ios: false, standalone: false };
const listeners = new Set<() => void>();

const update = (patch: Partial<InstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

/** Call once before rendering: `beforeinstallprompt` can fire before React mounts. */
export function initInstall(): void {
  state = { canPrompt: false, ios: isIos(), standalone: isStandalone() };

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e as BeforeInstallPromptEvent;
    update({ canPrompt: true });
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    update({ canPrompt: false, standalone: true });
  });
  window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => update({ standalone: e.matches }));
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferred) return 'unavailable';
  const evt = deferred;
  deferred = null; // the event can only be used once
  update({ canPrompt: false });
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  return outcome;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export const useInstallState = (): InstallState => useSyncExternalStore(subscribe, () => state);

export const isInstallAvailable = (s: InstallState): boolean => !s.standalone && (s.canPrompt || s.ios);
