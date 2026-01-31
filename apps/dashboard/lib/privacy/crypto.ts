"use client";

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

function ensureBrowserCrypto(): Crypto {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    throw new Error("WebCrypto not available");
  }
  return window.crypto;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(signature: Uint8Array): Promise<CryptoKey> {
  const crypto = ensureBrowserCrypto();
  const signatureBuffer = signature.buffer.slice(0) as ArrayBuffer;
  const hash = await crypto.subtle.digest("SHA-256", signatureBuffer);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptJson(
  signature: Uint8Array,
  payload: unknown,
): Promise<EncryptedPayload> {
  const crypto = ensureBrowserCrypto();
  const key = await deriveKey(signature);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const encodedBuffer = encoded.buffer.slice(0) as ArrayBuffer;
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedBuffer,
  );
  return {
    ciphertext: toBase64(new Uint8Array(ciphertext)),
    iv: toBase64(iv),
  };
}

export async function decryptJson<T>(
  signature: Uint8Array,
  encrypted: EncryptedPayload,
): Promise<T> {
  const crypto = ensureBrowserCrypto();
  const key = await deriveKey(signature);
  const iv = fromBase64(encrypted.iv);
  const ciphertext = fromBase64(encrypted.ciphertext);
  const ivBuffer = iv.buffer.slice(0) as ArrayBuffer;
  const ciphertextBuffer = ciphertext.buffer.slice(0) as ArrayBuffer;
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
    key,
    ciphertextBuffer,
  );
  const decoded = new TextDecoder().decode(plaintext);
  return JSON.parse(decoded) as T;
}
