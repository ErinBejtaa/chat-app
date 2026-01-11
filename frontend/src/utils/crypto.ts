import type { EncryptedPayload } from "../types/chat";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (data: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(data)));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export const generateKeyPair = () =>
  crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

export const exportPublicKey = async (key: CryptoKey) => {
  const jwk = await crypto.subtle.exportKey("jwk", key);
  return JSON.stringify(jwk);
};

export const importPublicKey = async (payload: string) => {
  const jwk = JSON.parse(payload) as JsonWebKey;
  return crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
};

export const deriveSharedKey = (privateKey: CryptoKey, publicKey: CryptoKey) =>
  crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

export const encryptPayload = async (key: CryptoKey, text: string) => {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(text)
  );
  return {
    ciphertext: toBase64(ciphertext),
    nonce: toBase64(iv.buffer),
    algorithm: "ECDH-AES-GCM"
  } satisfies EncryptedPayload;
};

export const decryptPayload = async (key: CryptoKey, payload: EncryptedPayload) => {
  if (!payload.nonce) return null;
  const iv = fromBase64(payload.nonce);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromBase64(payload.ciphertext)
  );
  return decoder.decode(plaintext);
};
