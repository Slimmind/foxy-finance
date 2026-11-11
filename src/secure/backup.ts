import { normalizeState, type AppState } from '../lib/storage';
import { AAD, fromB64, kekFromPassword, rand, toB64, unsealJson, sealJson } from './crypto';

export const MIN_BACKUP_PASSWORD = 8;
const BACKUP_ITERATIONS = 600_000;
const MAX_ITERATIONS = 2_000_000; // guards against a crafted file that would freeze the device

export class BackupError extends Error {
  constructor(public readonly code: 'bad-file' | 'wrong-password') {
    super(code);
    this.name = 'BackupError';
  }
}

interface BackupFile {
  app: 'foxy-finance';
  v: 1;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  iv: string;
  ct: string;
}

export async function createBackup(
  state: AppState,
  password: string,
  iterations = BACKUP_ITERATIONS,
): Promise<string> {
  const salt = rand(16);
  const key = await kekFromPassword(password, salt, iterations);
  const sealed = await sealJson(key, { exportedAt: Date.now(), state }, AAD.backup);
  const file: BackupFile = {
    app: 'foxy-finance',
    v: 1,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toB64(salt) },
    ...sealed,
  };
  return JSON.stringify(file);
}

const isBackupFile = (x: unknown): x is BackupFile => {
  const f = x as BackupFile | null;
  return (
    !!f &&
    f.app === 'foxy-finance' &&
    f.v === 1 &&
    f.kdf?.name === 'PBKDF2' &&
    f.kdf.hash === 'SHA-256' &&
    Number.isInteger(f.kdf.iterations) &&
    f.kdf.iterations >= 1000 &&
    f.kdf.iterations <= MAX_ITERATIONS &&
    typeof f.kdf.salt === 'string' &&
    typeof f.iv === 'string' &&
    typeof f.ct === 'string'
  );
};

export async function readBackup(text: string, password: string): Promise<AppState> {
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw new BackupError('bad-file');
  }
  if (!isBackupFile(file)) throw new BackupError('bad-file');

  let payload: unknown;
  try {
    const key = await kekFromPassword(password, fromB64(file.kdf.salt), file.kdf.iterations);
    payload = await unsealJson(key, { iv: file.iv, ct: file.ct }, AAD.backup);
  } catch {
    // AES-GCM can't tell a wrong password from a damaged file.
    throw new BackupError('wrong-password');
  }
  return normalizeState((payload as { state?: unknown } | null)?.state);
}
