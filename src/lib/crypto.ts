import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Encryption at rest for everything sensitive that is stored in the database:
// uploaded documents, fillable forms, filled-out form answers, and the
// two-step-login secrets.
//
// Why this exists on top of the database's own disk encryption: a copy of the
// database (a leaked backup, a stolen connection string, someone browsing the
// Supabase dashboard) shows only scrambled bytes. The key is NOT in the
// database — it lives only in the hosting provider's environment variables
// (DATA_ENCRYPTION_KEY), so reading the files needs BOTH the database AND the
// hosting account.
//
// Algorithm: AES-256-GCM (encrypts AND detects tampering). Every value gets
// its own random IV. Each value is also bound to the row it belongs to (the
// "context"), so a stored file can't be quietly swapped onto another row.
//
// Stored layout:  "HOAENC" | version(1) | keyId(4) | iv(12) | ciphertext | tag(16)
//
// Key rotation: set the new key as DATA_ENCRYPTION_KEY and move the old one to
// DATA_ENCRYPTION_KEY_PREVIOUS. Old rows keep opening; the admin Security
// page re-encrypts them under the new key.

const MAGIC = Buffer.from("HOAENC", "ascii");
const VERSION = 1;
const HEADER_LEN = MAGIC.length + 1 + 4;
const IV_LEN = 12;
const TAG_LEN = 16;

type Key = { id: Buffer; bytes: Buffer };

function parseKey(raw: string | undefined): Key | null {
  if (!raw) return null;
  const v = raw.trim();
  let bytes: Buffer | null = null;
  if (/^[0-9a-fA-F]{64}$/.test(v)) bytes = Buffer.from(v, "hex");
  else {
    const b = Buffer.from(v, "base64");
    if (b.length === 32) bytes = b;
  }
  if (!bytes) {
    throw new Error("DATA_ENCRYPTION_KEY must be 32 random bytes (base64 or 64 hex characters)");
  }
  return { id: createHash("sha256").update(bytes).digest().subarray(0, 4), bytes };
}

function currentKey(): Key {
  const k = parseKey(process.env.DATA_ENCRYPTION_KEY);
  if (!k) {
    throw new Error(
      "DATA_ENCRYPTION_KEY is not set — refusing to store sensitive data unencrypted. Add it in the hosting environment variables."
    );
  }
  return k;
}

function keyById(id: Buffer): Key | null {
  for (const raw of [process.env.DATA_ENCRYPTION_KEY, process.env.DATA_ENCRYPTION_KEY_PREVIOUS]) {
    const k = parseKey(raw);
    if (k && timingSafeEqual(k.id, id)) return k;
  }
  return null;
}

/** True when encryption is configured (a key is present and valid). */
export function encryptionConfigured(): boolean {
  try {
    return parseKey(process.env.DATA_ENCRYPTION_KEY) !== null;
  } catch {
    return false;
  }
}

/** True when these bytes are in the encrypted format (old, not-yet-encrypted
 * rows return false). */
export function isEncrypted(data: Uint8Array | Buffer): boolean {
  const b = Buffer.from(data.buffer, data.byteOffset, Math.min(data.byteLength, MAGIC.length));
  return b.length === MAGIC.length && b.equals(MAGIC);
}

/** True when these bytes are encrypted under the CURRENT key. */
export function isCurrentKey(data: Uint8Array | Buffer): boolean {
  if (!isEncrypted(data) || data.byteLength < HEADER_LEN) return false;
  const buf = Buffer.from(data.buffer, data.byteOffset, data.byteLength);
  return buf.subarray(MAGIC.length + 1, HEADER_LEN).equals(currentKey().id);
}

export function encryptBytes(plain: Buffer | Uint8Array, context: string): Buffer {
  const key = currentKey();
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key.bytes, iv, { authTagLength: TAG_LEN });
  cipher.setAAD(Buffer.from(context, "utf8"));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([MAGIC, Buffer.from([VERSION]), key.id, iv, body, cipher.getAuthTag()]);
}

/** Decrypt, or pass through bytes that were stored before encryption was
 * switched on (those get encrypted by the backfill on the Security page).
 * Throws if the data was tampered with, moved to a different row, or the key
 * is wrong. */
export function decryptBytes(stored: Buffer | Uint8Array, context: string): Buffer {
  const buf = Buffer.from(stored.buffer, stored.byteOffset, stored.byteLength);
  if (!isEncrypted(buf)) return buf;
  if (buf.length < HEADER_LEN + IV_LEN + TAG_LEN) throw new Error("stored data is damaged");
  if (buf[MAGIC.length] !== VERSION) throw new Error("unknown encryption version");
  const key = keyById(buf.subarray(MAGIC.length + 1, HEADER_LEN));
  if (!key) throw new Error("no matching encryption key — was DATA_ENCRYPTION_KEY changed without keeping the old one?");
  const iv = buf.subarray(HEADER_LEN, HEADER_LEN + IV_LEN);
  const tag = buf.subarray(buf.length - TAG_LEN);
  const body = buf.subarray(HEADER_LEN + IV_LEN, buf.length - TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key.bytes, iv, { authTagLength: TAG_LEN });
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(body), decipher.final()]);
  } catch {
    throw new Error("integrity check failed — this stored item was altered or doesn't belong to this record");
  }
}

// ---- JSON (filled-form answers live in a jsonb column) --------------------

export type EncryptedJson = { enc: string };

export function isEncryptedJson(v: unknown): v is EncryptedJson {
  return !!v && typeof v === "object" && !Array.isArray(v) && typeof (v as EncryptedJson).enc === "string";
}

export function encryptJson(value: unknown, context: string): EncryptedJson {
  return { enc: encryptBytes(Buffer.from(JSON.stringify(value), "utf8"), context).toString("base64") };
}

/** Open a jsonb value that is either encrypted ({enc}) or an older plain one. */
export function decryptJson<T>(stored: unknown, context: string): T {
  if (isEncryptedJson(stored)) {
    return JSON.parse(decryptBytes(Buffer.from(stored.enc, "base64"), context).toString("utf8")) as T;
  }
  return stored as T;
}

// ---- Short text (two-step-login secrets) ----------------------------------

const TEXT_PREFIX = "enc1:";

export function encryptText(plain: string, context: string): string {
  return TEXT_PREFIX + encryptBytes(Buffer.from(plain, "utf8"), context).toString("base64");
}

export function decryptText(stored: string, context: string): string {
  // Fail closed: these values are never stored in the clear, so anything
  // without the marker is not something this app wrote.
  if (!stored.startsWith(TEXT_PREFIX)) throw new Error("stored secret is not in the expected encrypted form");
  return decryptBytes(Buffer.from(stored.slice(TEXT_PREFIX.length), "base64"), context).toString("utf8");
}

// What each stored value is bound to. Changing these would make existing
// encrypted rows unreadable — don't.
export const ctx = {
  document: (id: string) => `documents.file_data:${id}`,
  form: (id: string) => `forms.file_data:${id}`,
  answers: (id: string) => `form_submissions.answers:${id}`,
  announcementImage: (id: string) => `announcements.image_data:${id}`,
};

/** The first 4 bytes identifying the current key (as stored in each value's
 * header), or null if no key is configured. Used to find rows still under an
 * older key. */
export function currentKeyId(): Buffer | null {
  try {
    return parseKey(process.env.DATA_ENCRYPTION_KEY)?.id ?? null;
  } catch {
    return null;
  }
}

export const MAGIC_BYTES = MAGIC;
