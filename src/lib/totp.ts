import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

// Two-step login codes (the 6-digit numbers in Google Authenticator, Authy,
// 1Password, Microsoft Authenticator, Apple Passwords, etc.). Standard
// RFC 6238 time-based codes, so any of those apps works.

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP_SECONDS = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("bad base32");
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** A fresh random 160-bit secret, base32 encoded. */
export function newTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", secret).update(msg).digest();
  const off = h[h.length - 1] & 0x0f;
  const code = ((h[off] & 0x7f) << 24) | (h[off + 1] << 16) | (h[off + 2] << 8) | h[off + 3];
  return String(code % 10 ** DIGITS).padStart(DIGITS, "0");
}

export function currentStep(now = Date.now()): number {
  return Math.floor(now / 1000 / STEP_SECONDS);
}

/** Check a code against the secret, allowing one step either side for clock
 * drift. Returns the matching time step (so the caller can refuse to accept
 * the same step twice), or null. */
export function verifyTotp(secretBase32: string, code: string, now = Date.now()): number | null {
  const cleaned = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleaned)) return null;
  const secret = base32Decode(secretBase32);
  const step = currentStep(now);
  let matched: number | null = null;
  for (const delta of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(secret, step + delta));
    if (timingSafeEqual(expected, Buffer.from(cleaned)) && matched === null) matched = step + delta;
  }
  return matched;
}

export function otpauthUrl(secretBase32: string, accountEmail: string): string {
  const issuer = "Tazewell Place";
  const label = encodeURIComponent(`${issuer}:${accountEmail}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${DIGITS}&period=${STEP_SECONDS}`;
}

/** Reference vector from RFC 6238 appendix B (secret "12345678901234567890"). */
export function selfTest(): boolean {
  const secret = Buffer.from("12345678901234567890");
  return hotp(secret, Math.floor(59 / 30)) === "287082";
}
