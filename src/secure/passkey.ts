import { rand, type Bytes } from './crypto';
import { VaultError } from './errors';

/**
 * A passkey that can also produce a stable secret (WebAuthn PRF extension).
 * The secret never leaves the authenticator unless the user passes Face ID / Touch ID.
 */
export interface PasskeyProvider {
  isSupported(): Promise<boolean>;
  register(salt: Bytes): Promise<{ credentialId: Bytes; prf: Bytes }>;
  authenticate(credentialId: Bytes, salt: Bytes): Promise<Bytes>;
}

interface PrfResults {
  prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } };
}

const TIMEOUT = 60_000;

const asError = (e: unknown): VaultError => {
  if (e instanceof VaultError) return e;
  const name = (e as { name?: string } | null)?.name;
  if (name === 'NotAllowedError' || name === 'AbortError') return new VaultError('passkey-cancelled');
  return new VaultError('passkey-failed', String((e as Error)?.message ?? e));
};

export const webauthnPasskey: PasskeyProvider = {
  async isSupported() {
    if (typeof window === 'undefined' || !window.isSecureContext || !('PublicKeyCredential' in window)) return false;
    try {
      if (!(await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())) return false;
      const getCaps = (PublicKeyCredential as unknown as { getClientCapabilities?: () => Promise<Record<string, boolean>> })
        .getClientCapabilities;
      if (getCaps) {
        const caps = await getCaps.call(PublicKeyCredential);
        if (caps['extension:prf'] === false) return false;
      }
      return true;
    } catch {
      return false;
    }
  },

  async register(salt) {
    let cred: PublicKeyCredential | null;
    try {
      cred = (await navigator.credentials.create({
        publicKey: {
          rp: { id: location.hostname, name: 'Foxy Finance' },
          user: { id: rand(16), name: 'foxy-finance', displayName: 'Foxy Finance' },
          challenge: rand(32),
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 },
            { type: 'public-key', alg: -257 },
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            residentKey: 'required',
            userVerification: 'required',
          },
          timeout: TIMEOUT,
          extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;
    } catch (e) {
      throw asError(e);
    }
    if (!cred) throw new VaultError('passkey-failed');

    const ext = cred.getClientExtensionResults() as PrfResults;
    if (!ext.prf?.enabled && !ext.prf?.results?.first) throw new VaultError('passkey-unsupported');

    const credentialId = new Uint8Array(cred.rawId);
    // Some authenticators only confirm PRF support on create; the secret comes from a follow-up assertion.
    const prf = ext.prf?.results?.first ? new Uint8Array(ext.prf.results.first) : await this.authenticate(credentialId, salt);
    return { credentialId, prf };
  },

  async authenticate(credentialId, salt) {
    let cred: PublicKeyCredential | null;
    try {
      cred = (await navigator.credentials.get({
        publicKey: {
          rpId: location.hostname,
          challenge: rand(32),
          allowCredentials: [{ type: 'public-key', id: credentialId }],
          userVerification: 'required',
          timeout: TIMEOUT,
          extensions: { prf: { eval: { first: salt } } } as AuthenticationExtensionsClientInputs,
        },
      })) as PublicKeyCredential | null;
    } catch (e) {
      throw asError(e);
    }
    const first = (cred?.getClientExtensionResults() as PrfResults | undefined)?.prf?.results?.first;
    if (!first) throw new VaultError('passkey-unsupported');
    return new Uint8Array(first);
  },
};
