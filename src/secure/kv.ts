/** Minimal async key-value store. `apply` is atomic: either every change lands or none. */
export interface KV {
  get<T>(key: string): Promise<T | undefined>;
  apply(ops: { set?: Record<string, unknown>; del?: string[] }): Promise<void>;
  clear(): Promise<void>;
}

export function createMemoryKv(): KV {
  const map = new Map<string, unknown>();
  return {
    async get<T>(key: string) {
      return structuredClone(map.get(key)) as T | undefined;
    },
    async apply({ set = {}, del = [] }) {
      for (const [k, v] of Object.entries(set)) map.set(k, structuredClone(v));
      del.forEach((k) => map.delete(k));
    },
    async clear() {
      map.clear();
    },
  };
}

const DB_NAME = 'foxy-finance';
const STORE = 'kv';

const wrap = <T>(req: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const done = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

/** IndexedDB-backed store. Falls back to memory when IndexedDB is unavailable (e.g. some private modes). */
export function createIdbKv(): KV {
  let fallback: KV | null = null;
  let dbPromise: Promise<IDBDatabase> | null = null;

  const db = (): Promise<IDBDatabase> => {
    dbPromise ??= new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  };

  const withDb = async <T>(fn: (d: IDBDatabase) => Promise<T>, fb: (m: KV) => Promise<T>): Promise<T> => {
    if (!fallback) {
      try {
        return await fn(await db());
      } catch {
        fallback = createMemoryKv();
      }
    }
    return fb(fallback);
  };

  return {
    get: <T,>(key: string) =>
      withDb(
        async (d) => (await wrap(d.transaction(STORE).objectStore(STORE).get(key))) as T | undefined,
        (m) => m.get<T>(key),
      ),
    apply: (ops) =>
      withDb(
        async (d) => {
          const tx = d.transaction(STORE, 'readwrite');
          const store = tx.objectStore(STORE);
          for (const [k, v] of Object.entries(ops.set ?? {})) store.put(v, k);
          (ops.del ?? []).forEach((k) => store.delete(k));
          await done(tx);
        },
        (m) => m.apply(ops),
      ),
    clear: () =>
      withDb(
        async (d) => {
          const tx = d.transaction(STORE, 'readwrite');
          tx.objectStore(STORE).clear();
          await done(tx);
        },
        (m) => m.clear(),
      ),
  };
}
