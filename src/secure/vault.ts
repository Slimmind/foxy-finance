import { defaultState, normalizeState, type AppState } from '../lib/storage';
import {
  AAD,
  exportRaw,
  fromB64,
  generateDek,
  importDek,
  kekFromPassword,
  kekFromPrf,
  rand,
  seal,
  sealJson,
  toB64,
  unseal,
  unsealJson,
  type Sealed,
} from './crypto';
import { VaultError } from './errors';
import type { KV } from './kv';
import type { PasskeyProvider } from './passkey';

export type VaultStatus = 'loading' | 'plain' | 'locked' | 'unlocked';

export interface VaultSnapshot {
  status: VaultStatus;
  hasPasskey: boolean;
  hasCode: boolean;
  passkeySupported: boolean;
}

/** The data key (DEK) wrapped by a key derived from a passkey. */
interface PrfWrap extends Sealed {
  credentialId: string;
  salt: string;
}
/** The data key (DEK) wrapped by a key derived from a code. */
interface CodeWrap extends Sealed {
  salt: string;
  iterations: number;
}
interface VaultConfig {
  v: 1;
  prf?: PrfWrap;
  code?: CodeWrap;
}
type StoredData = { plain: unknown } | { enc: Sealed };

export interface LegacySource {
  read(): unknown;
  clear(): void;
}

export const MIN_CODE_LENGTH = 6;
export const DEFAULT_CODE_ITERATIONS = 600_000;

interface Deps {
  kv: KV;
  passkey: PasskeyProvider;
  legacy?: LegacySource;
  codeIterations?: number;
}

export function createVault({ kv, passkey, legacy, codeIterations = DEFAULT_CODE_ITERATIONS }: Deps) {
  let config: VaultConfig | null = null;
  let dek: CryptoKey | null = null;
  let current: AppState = defaultState;
  let snapshot: VaultSnapshot = { status: 'loading', hasPasskey: false, hasCode: false, passkeySupported: false };
  let queue: Promise<void> = Promise.resolve();
  let initPromise: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  const publish = (patch: Partial<VaultSnapshot>) => {
    snapshot = { ...snapshot, ...patch, hasPasskey: !!config?.prf, hasCode: !!config?.code };
    listeners.forEach((l) => l());
  };

  const writeData = async () => {
    if (snapshot.status === 'unlocked' && dek) {
      await kv.apply({ set: { data: { enc: await sealJson(dek, current, AAD.data) } } });
    } else if (snapshot.status === 'plain') {
      await kv.apply({ set: { data: { plain: current } } });
    }
  };

  const flush = () => queue;

  const requireOpen = () => {
    if (snapshot.status !== 'plain' && snapshot.status !== 'unlocked') throw new VaultError('bad-state');
  };
  const requireUnlocked = () => {
    if (snapshot.status !== 'unlocked' || !dek) throw new VaultError('bad-state');
  };

  /** Writes config and re-encrypted data in one atomic step, then switches to the unlocked state. */
  const commit = async (next: VaultConfig, key: CryptoKey) => {
    await flush();
    const enc = await sealJson(key, current, AAD.data);
    await kv.apply({ set: { config: next, data: { enc } } });
    config = next;
    dek = key;
    publish({ status: 'unlocked' });
  };

  const finishUnlock = async (kek: CryptoKey, wrap: Sealed, failure: 'wrong-code' | 'corrupt') => {
    let key: CryptoKey;
    try {
      key = await importDek(await unseal(kek, wrap, AAD.dek));
    } catch {
      throw new VaultError(failure);
    }
    const stored = await kv.get<StoredData>('data');
    let state = defaultState;
    if (stored && 'enc' in stored) {
      try {
        state = normalizeState(await unsealJson(key, stored.enc, AAD.data));
      } catch {
        throw new VaultError('corrupt');
      }
    }
    dek = key;
    current = state;
    publish({ status: 'unlocked' });
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getState: () => current,

    init(): Promise<void> {
      initPromise ??= (async () => {
        const supported = passkey.isSupported().catch(() => false);
        config = (await kv.get<VaultConfig>('config')) ?? null;
        if (config) {
          publish({ status: 'locked', passkeySupported: await supported });
          return;
        }

        const stored = await kv.get<StoredData>('data');
        if (stored && 'plain' in stored) {
          current = normalizeState(stored.plain);
        } else if (!stored) {
          const old = legacy?.read();
          if (old !== undefined) {
            current = normalizeState(old);
            await kv.apply({ set: { data: { plain: current } } });
          }
        }
        legacy?.clear();
        publish({ status: 'plain', passkeySupported: await supported });
      })();
      return initPromise;
    },

    /** Called on every state change; writes are serialised and coalesced. */
    save(state: AppState): Promise<void> {
      current = state;
      if (snapshot.status === 'plain' || snapshot.status === 'unlocked') {
        queue = queue.then(writeData).catch(() => undefined);
      }
      return queue;
    },
    flush,

    async unlockWithPasskey() {
      if (!config?.prf) throw new VaultError('passkey-unsupported');
      const wrap = config.prf;
      const prf = await passkey.authenticate(fromB64(wrap.credentialId), fromB64(wrap.salt));
      await finishUnlock(await kekFromPrf(prf), wrap, 'corrupt');
    },

    async unlockWithCode(code: string) {
      if (!config?.code) throw new VaultError('bad-state');
      const wrap = config.code;
      const kek = await kekFromPassword(code, fromB64(wrap.salt), wrap.iterations);
      await finishUnlock(kek, wrap, 'wrong-code');
    },

    async enablePasskey() {
      await flush();
      requireOpen();
      const salt = rand(32);
      const { credentialId, prf } = await passkey.register(salt);
      const key = dek ?? (await generateDek());
      const sealed = await seal(await kekFromPrf(prf), await exportRaw(key), AAD.dek);
      await commit(
        { ...config, v: 1, prf: { credentialId: toB64(credentialId), salt: toB64(salt), ...sealed } },
        key,
      );
    },

    async enableCode(code: string) {
      await flush();
      requireOpen();
      if (code.length < MIN_CODE_LENGTH) throw new VaultError('bad-state', 'code too short');
      const salt = rand(16);
      const key = dek ?? (await generateDek());
      const sealed = await seal(await kekFromPassword(code, salt, codeIterations), await exportRaw(key), AAD.dek);
      await commit(
        { ...config, v: 1, code: { salt: toB64(salt), iterations: codeIterations, ...sealed } },
        key,
      );
    },

    async removeCode() {
      requireUnlocked();
      if (!config?.prf) throw new VaultError('bad-state'); // never remove the last way in
      const next: VaultConfig = { v: 1, prf: config.prf };
      await kv.apply({ set: { config: next } });
      config = next;
      publish({});
    },

    async disableProtection() {
      requireUnlocked();
      await flush();
      await kv.apply({ set: { data: { plain: current } }, del: ['config'] });
      config = null;
      dek = null;
      publish({ status: 'plain' });
    },

    async lock() {
      if (snapshot.status !== 'unlocked') return;
      await flush();
      dek = null;
      current = defaultState;
      publish({ status: 'locked' });
    },

    async wipe() {
      await flush();
      await kv.clear();
      legacy?.clear();
      config = null;
      dek = null;
      current = defaultState;
      publish({ status: 'plain' });
    },
  };
}

export type Vault = ReturnType<typeof createVault>;
