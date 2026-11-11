import { useSyncExternalStore } from 'react';
import { createIdbKv } from './kv';
import { webauthnPasskey } from './passkey';
import { createVault, type VaultSnapshot } from './vault';

const LEGACY_KEY = 'foxy-finance:v1';

export const vault = createVault({
  kv: createIdbKv(),
  passkey: webauthnPasskey,
  legacy: {
    read() {
      try {
        const raw = localStorage.getItem(LEGACY_KEY);
        return raw ? JSON.parse(raw) : undefined;
      } catch {
        return undefined;
      }
    },
    clear() {
      try {
        localStorage.removeItem(LEGACY_KEY);
      } catch {
        // ignore
      }
    },
  },
});

export const useVault = (): VaultSnapshot => useSyncExternalStore(vault.subscribe, vault.getSnapshot);
