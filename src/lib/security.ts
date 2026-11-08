/**
 * Security utilities for App Lock (PIN protection)
 */

export function generateSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${pin}:hishob_khata_secure_pepper`);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArr = Array.from(new Uint8Array(hashBuf));
  return hashArr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyPin(
  pin: string,
  salt: string,
  expectedHash: string
): Promise<boolean> {
  const computed = await hashPin(pin, salt);
  return computed === expectedHash;
}

