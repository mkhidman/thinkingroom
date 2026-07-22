import { GOOGLE_TOKEN_ENCRYPTION_KEY } from './config.ts';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
};

const base64ToBytes = (value: string) => {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const keyPromise = (() => {
  const keyBytes = base64ToBytes(GOOGLE_TOKEN_ENCRYPTION_KEY);
  if (keyBytes.byteLength !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY harus base64 dari 32 byte.');
  return crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['encrypt', 'decrypt']);
})();

export const encryptSecret = async (plainText: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await keyPromise, encoder.encode(plainText)));
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(cipher)}`;
};

export const decryptSecret = async (payload: string) => {
  const [version, ivValue, cipherValue] = payload.split(':');
  if (version !== 'v1' || !ivValue || !cipherValue) throw new Error('Format token terenkripsi tidak dikenali.');
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivValue) },
    await keyPromise,
    base64ToBytes(cipherValue)
  );
  return decoder.decode(plain);
};

export const randomState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

export const sha256Hex = async (value: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
  return Array.from(digest).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};
