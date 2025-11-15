// src/services/cryptoService.ts
// TypeScript, Browser Web Crypto API

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// Simple in-memory cache so we don't derive the same key
// (password + salt + iterations) on every page load.
const keyCache = new Map<string, CryptoKey>();

/* ---------- Helpers: base64 <-> ArrayBuffer ---------- */
export const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
};

export const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/* ---------- Salt erzeugen ---------- */
export const generateSalt = (length = 16): string => {
  const salt = crypto.getRandomValues(new Uint8Array(length));
  return arrayBufferToBase64(salt.buffer);
};

/* ---------- Key ableiten (PBKDF2 -> AES-GCM Key) ----------
   password: user password / secret (string)
   saltBase64: Base64 string (z.B. aus Firestore)
   iterations: z.B. 150000
*/
export const deriveKeyFromPassword = async (
  password: string,
  saltBase64: string,
  iterations = 150000
): Promise<CryptoKey> => {
  const cacheKey = `${password}:${saltBase64}:${iterations}`;
  const cached = keyCache.get(cacheKey);
  if (cached) return cached;

  const saltBuf = base64ToArrayBuffer(saltBase64);
  const pwKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations,
      hash: "SHA-256",
    },
    pwKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  keyCache.set(cacheKey, key);
  return key;
};

/* ---------- Encrypt String -> returns base64 of iv:ciphertext ---------- */
export const encryptString = async (plainText: string, key: CryptoKey): Promise<string> => {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes recommended for AES-GCM
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plainText)
  );

  // store as iv:ciphertext both base64
  const ivB64 = arrayBufferToBase64(iv.buffer);
  const ctB64 = arrayBufferToBase64(encrypted);
  return `${ivB64}:${ctB64}`;
};

/* ---------- Decrypt base64 iv:ciphertext -> plain string ---------- */
export const decryptString = async (payload: string, key: CryptoKey): Promise<string> => {
  const [ivB64, ctB64] = payload.split(":");
  if (!ivB64 || !ctB64) throw new Error("Invalid ciphertext format");
  const iv = new Uint8Array(base64ToArrayBuffer(ivB64));
  const ct = base64ToArrayBuffer(ctB64);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return decoder.decode(decrypted);
};
