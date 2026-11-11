import './styles.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import Root from './Root';
import { initRates } from './lib/ratesClient';
import { initInstall } from './pwa/install';

// Must run before React mounts: `beforeinstallprompt` may fire very early.
initInstall();
initRates();
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
