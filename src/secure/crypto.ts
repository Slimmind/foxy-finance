export type Bytes = Uint8Array<ArrayBuffer>;

const subtle = globalThis.crypto.subtle;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const rand = (n: number): Bytes => globalThis.crypto.getRandomValues(new Uint8Array(n));

export const toB64 = (bytes: Bytes): string => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
export const fromB64 = (s: string): Bytes => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export interface Sealed {
  iv: string;
  ct: string;
}

/** AAD labels bind a ciphertext to its purpose, so blobs can't be swapped between slots. */
export const AAD = { dek: 'foxy:dek:v1', data: 'foxy:data:v1', backup: 'foxy:backup:v1' } as const;

export const generateDek = (): Promise<CryptoKey> =>
  subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);

export const exportRaw = async (key: CryptoKey): Promise<Bytes> => new Uint8Array(await subtle.exportKey('raw', key));

export const importDek = (raw: Bytes): Promise<CryptoKey> =>
  subtle.importKey('raw', raw, 'AES-GCM', true, ['encrypt', 'decrypt']);

export async function seal(key: CryptoKey, data: Bytes, aad: string): Promise<Sealed> {
  const iv = rand(12);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(aad) }, key, data));
  return { iv: toB64(iv), ct: toB64(ct) };
}

/** Throws if the key is wrong or the data was tampered with. */
export async function unseal(key: CryptoKey, sealed: Sealed, aad: string): Promise<Bytes> {
  return new Uint8Array(
    await subtle.decrypt(
      { name: 'AES-GCM', iv: fromB64(sealed.iv), additionalData: encoder.encode(aad) },
      key,
      fromB64(sealed.ct),
    ),
  );
}

export const sealJson = (key: CryptoKey, value: unknown, aad: string): Promise<Sealed> =>
  seal(key, encoder.encode(JSON.stringify(value)), aad);

export async function unsealJson(key: CryptoKey, sealed: Sealed, aad: string): Promise<unknown> {
  return JSON.parse(decoder.decode(await unseal(key, sealed, aad)));
}

/** Key-encryption key from a WebAuthn PRF output. */
export async function kekFromPrf(prf: Bytes): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', prf, 'HKDF', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: encoder.encode('foxy-finance/kek/v1') },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Key-encryption key from a user-chosen code or password. */
export async function kekFromPassword(password: string, salt: Bytes, iterations: number): Promise<CryptoKey> {
  const base = await subtle.importKey('raw', encoder.encode(password.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
