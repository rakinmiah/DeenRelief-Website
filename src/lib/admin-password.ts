import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from "node:crypto";

/**
 * Per-user password hashing for admin accounts (the custom HMAC admin
 * auth — separate from Supabase sponsor auth).
 *
 * Uses Node's built-in scrypt (no external dependency). scrypt is
 * memory-hard, so it resists GPU brute-forcing far better than a plain
 * hash. Parameters below cost ~16 MB and a few tens of ms per hash —
 * negligible for the occasional admin login, painful at attack scale.
 *
 * Stored format (single self-describing string, salt included):
 *   scrypt$<N>$<r>$<p>$<salt_b64>$<hash_b64>
 * Storing N/r/p inline means we can raise the cost later without
 * breaking the ability to verify older hashes.
 */

/**
 * Promise wrapper around scrypt's options-overload (promisify's typing
 * only captures the 3-arg form, so we wrap the callback manually).
 */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// Cost parameters. memory ≈ 128 * r * N bytes ≈ 16 MB at N=16384, r=8.
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
// scrypt's default maxmem is 32 MB; 16 MB fits, but pass it explicitly
// so a future bump to N doesn't silently throw.
const MAXMEM = 64 * 1024 * 1024;

/** Minimum length we accept for an admin's chosen password. */
export const ADMIN_PASSWORD_MIN_LENGTH = 10;

/**
 * Validate a candidate password. Returns an error string, or null if OK.
 * Deliberately simple: length is the dominant factor for entropy; we
 * don't impose composition rules (which push users toward predictable
 * patterns) beyond rejecting whitespace-only / trivially short inputs.
 */
export function validateAdminPassword(password: string): string | null {
  if (typeof password !== "string" || password.length < ADMIN_PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${ADMIN_PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.trim().length < ADMIN_PASSWORD_MIN_LENGTH) {
    return "Password must not be mostly spaces.";
  }
  if (password.length > 256) {
    return "Password is too long.";
  }
  return null;
}

/** Hash a plaintext password into the storable scrypt string. */
export async function hashAdminPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const derived = (await scryptAsync(password, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    maxmem: MAXMEM,
  })) as Buffer;
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    derived.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verify of a plaintext password against a stored hash.
 * Returns false (never throws) on any malformed/legacy/empty input.
 */
export async function verifyAdminPassword(
  password: string,
  stored: string | null | undefined
): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(parts[4], "base64");
    expected = Buffer.from(parts[5], "base64");
  } catch {
    return false;
  }
  if (salt.length === 0 || expected.length === 0) return false;

  let derived: Buffer;
  try {
    derived = (await scryptAsync(password, salt, expected.length, {
      N: n,
      r,
      p,
      maxmem: MAXMEM,
    })) as Buffer;
  } catch {
    return false;
  }

  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
