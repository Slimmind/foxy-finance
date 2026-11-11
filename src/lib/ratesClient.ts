import { useSyncExternalStore } from 'react';
import { createRatesStore, type RatesSnapshot } from './rates';

const CACHE_KEY = 'foxy-finance:rates:v1';
const TIMEOUT_MS = 10_000;

/** Public, non-personal data: it is cached in plain localStorage, outside the encrypted vault. */
export const ratesStore = createRatesStore({
  async fetchJson(url) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      // No cookies and no referrer: the request carries nothing about the user except what any request reveals.
      const res = await fetch(url, { signal: ctl.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  },
  load: () => {
    try {
      return localStorage.getItem(CACHE_KEY);
    } catch {
      return null;
    }
  },
  save: (value) => localStorage.setItem(CACHE_KEY, value),
  now: () => Date.now(),
});

/** Call once before rendering. Re-checks when the app comes back to the foreground or the network returns. */
export function initRates(): void {
  void ratesStore.init();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void ratesStore.refresh();
  });
  window.addEventListener('online', () => void ratesStore.refresh(true));
}

export const useRates = (): RatesSnapshot => useSyncExternalStore(ratesStore.subscribe, ratesStore.getSnapshot);
