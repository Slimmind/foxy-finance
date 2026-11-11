import { describe, expect, it } from 'vitest';
import { defaultState, normalizeState, type AppState } from '../lib/storage';
import { BackupError, createBackup, readBackup } from './backup';
import { VaultError } from './errors';
import { createMemoryKv, type KV } from './kv';
import type { PasskeyProvider } from './passkey';
import { createVault } from './vault';

const SECRET_MARK = 'SECRET-AMOUNT-777123';

const state: AppState = {
  ...defaultState,
  amount: SECRET_MARK,
  answers: { horizon: 2, drop: 3 },
  currency: 'EUR',
  history: [
    {
      id: '1',
      createdAt: 1,
      date: '2026-11-11',
      note: 'первая покупка',
      source: { kind: 'profile', profileId: 'clever' },
      total: 1000,
      currency: 'EUR',
      market: 'ucits',
      positions: [{ ticker: 'VWCE', weight: 100, amount: 1000 }],
    },
  ],
};

/** Deterministic stand-in for an authenticator: PRF = SHA-256(credentialId || salt). */
function fakePasskey(opts: { supported?: boolean; failAuth?: boolean } = {}): PasskeyProvider {
  const credentialId = new Uint8Array([1, 2, 3, 4]);
  const prf = async (salt: Uint8Array) => {
    const input = new Uint8Array([...credentialId, ...salt]);
    return new Uint8Array(await crypto.subtle.digest('SHA-256', input));
  };
  return {
    isSupported: async () => opts.supported ?? true,
    register: async (salt) => ({ credentialId, prf: await prf(salt) }),
    authenticate: async (_id, salt) => {
      if (opts.failAuth) throw new VaultError('passkey-cancelled');
      return prf(salt);
    },
  };
}

const open = (kv: KV, passkey = fakePasskey(), legacy?: Parameters<typeof createVault>[0]['legacy']) =>
  createVault({ kv, passkey, legacy, codeIterations: 1000 });

const dump = async (kv: KV) => JSON.stringify([await kv.get('config'), await kv.get('data')]);

describe('vault without protection', () => {
  it('persists plain state across restarts', async () => {
    const kv = createMemoryKv();
    const a = open(kv);
    await a.init();
    expect(a.getSnapshot().status).toBe('plain');
    await a.save(state);

    const b = open(kv);
    await b.init();
    expect(b.getState()).toEqual(state);
  });

  it('migrates data from the legacy localStorage source once', async () => {
    const kv = createMemoryKv();
    let cleared = false;
    const v = open(kv, fakePasskey(), { read: () => state, clear: () => (cleared = true) });
    await v.init();
    expect(v.getState().amount).toBe(SECRET_MARK);
    expect(cleared).toBe(true);
    expect(await kv.get('data')).toEqual({ plain: state });
  });
});

describe('vault with a code', () => {
  it('encrypts at rest, locks, and unlocks with the right code only', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.save(state);
    await v.enableCode('correct horse');
    expect(v.getSnapshot()).toMatchObject({ status: 'unlocked', hasCode: true, hasPasskey: false });

    await v.save({ ...state, amount: SECRET_MARK });
    expect(await dump(kv)).not.toContain(SECRET_MARK);

    await v.lock();
    expect(v.getSnapshot().status).toBe('locked');
    expect(v.getState()).toEqual(defaultState); // nothing left in memory

    await expect(v.unlockWithCode('wrong code')).rejects.toMatchObject({ code: 'wrong-code' });
    expect(v.getSnapshot().status).toBe('locked');

    await v.unlockWithCode('correct horse');
    expect(v.getState().amount).toBe(SECRET_MARK);
  });

  it('stays locked after a restart', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.enableCode('correct horse');

    const again = open(kv);
    await again.init();
    expect(again.getSnapshot().status).toBe('locked');
    await again.unlockWithCode('correct horse');
    expect(again.getSnapshot().status).toBe('unlocked');
  });

  it('rejects codes that are too short', async () => {
    const v = open(createMemoryKv());
    await v.init();
    await expect(v.enableCode('123')).rejects.toBeInstanceOf(VaultError);
  });

  it('detects tampered data', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.enableCode('correct horse');
    const data = (await kv.get<{ enc: { iv: string; ct: string } }>('data'))!;
    const flipped = data.enc.ct.startsWith('A') ? 'B' : 'A';
    await kv.apply({ set: { data: { enc: { ...data.enc, ct: flipped + data.enc.ct.slice(1) } } } });
    await v.lock();
    await expect(v.unlockWithCode('correct horse')).rejects.toMatchObject({ code: 'corrupt' });
  });
});

describe('vault with a passkey', () => {
  it('unlocks via passkey after restart', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.save(state);
    await v.enablePasskey();
    expect(await dump(kv)).not.toContain(SECRET_MARK);

    const again = open(kv);
    await again.init();
    expect(again.getSnapshot()).toMatchObject({ status: 'locked', hasPasskey: true, passkeySupported: true });
    await again.unlockWithPasskey();
    expect(again.getState()).toEqual(state);
  });

  it('stays locked when the user cancels', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.enablePasskey();

    const again = open(kv, fakePasskey({ failAuth: true }));
    await again.init();
    await expect(again.unlockWithPasskey()).rejects.toMatchObject({ code: 'passkey-cancelled' });
    expect(again.getSnapshot().status).toBe('locked');
  });

  it('supports both factors on the same data key and never removes the last one', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.save(state);
    await v.enablePasskey();
    await v.enableCode('correct horse');
    expect(v.getSnapshot()).toMatchObject({ hasPasskey: true, hasCode: true });

    await v.lock();
    await v.unlockWithCode('correct horse');
    expect(v.getState()).toEqual(state);
    await v.lock();
    await v.unlockWithPasskey();
    expect(v.getState()).toEqual(state);

    await v.removeCode();
    expect(v.getSnapshot().hasCode).toBe(false);

    const codeOnly = open(createMemoryKv());
    await codeOnly.init();
    await codeOnly.enableCode('correct horse');
    await expect(codeOnly.removeCode()).rejects.toMatchObject({ code: 'bad-state' });
  });

  it('disabling protection returns to plain storage', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.save(state);
    await v.enablePasskey();
    await v.disableProtection();
    expect(v.getSnapshot().status).toBe('plain');
    expect(await kv.get('config')).toBeUndefined();

    const again = open(kv);
    await again.init();
    expect(again.getState()).toEqual(state);
  });

  it('wipe removes everything', async () => {
    const kv = createMemoryKv();
    const v = open(kv);
    await v.init();
    await v.enableCode('correct horse');
    await v.wipe();
    expect(v.getSnapshot()).toMatchObject({ status: 'plain', hasCode: false });
    expect(await kv.get('config')).toBeUndefined();
    expect(await kv.get('data')).toBeUndefined();
  });
});

describe('backup', () => {
  it('round-trips with the right password', async () => {
    const text = await createBackup(state, 'long enough pw', 1000);
    expect(text).not.toContain(SECRET_MARK);
    expect(await readBackup(text, 'long enough pw')).toEqual(state);
  });

  it('rejects a wrong password and a tampered file', async () => {
    const text = await createBackup(state, 'long enough pw', 1000);
    await expect(readBackup(text, 'nope nope nope')).rejects.toMatchObject({ code: 'wrong-password' });

    const file = JSON.parse(text);
    file.ct = (file.ct.startsWith('A') ? 'B' : 'A') + file.ct.slice(1);
    await expect(readBackup(JSON.stringify(file), 'long enough pw')).rejects.toBeInstanceOf(BackupError);
  });

  it('rejects files that are not backups, including absurd iteration counts', async () => {
    await expect(readBackup('not json', 'x')).rejects.toMatchObject({ code: 'bad-file' });
    await expect(readBackup('{"app":"other"}', 'x')).rejects.toMatchObject({ code: 'bad-file' });

    const file = JSON.parse(await createBackup(state, 'long enough pw', 1000));
    file.kdf.iterations = 900_000_000;
    await expect(readBackup(JSON.stringify(file), 'long enough pw')).rejects.toMatchObject({ code: 'bad-file' });
  });
});

describe('normalizeState', () => {
  it('drops malformed entries instead of crashing later', () => {
    const dirty = {
      answers: { horizon: 2, bad: 99, worse: 'x' },
      currency: 'UAH',
      market: 'moon',
      amount: 12345,
      history: [state.history[0], { ...state.history[0], source: { kind: 'profile', profileId: 'nope' } }, 'junk', null],
    };
    const clean = normalizeState(dirty);
    expect(clean.answers).toEqual({ horizon: 2 });
    expect(clean.currency).toBe('USD');
    expect(clean.market).toBe('us');
    expect(clean.amount).toBe('');
    expect(clean.history).toHaveLength(1);
  });

  it('survives non-objects', () => {
    expect(normalizeState(null)).toEqual(defaultState);
    expect(normalizeState('str')).toEqual(defaultState);
  });
});
