import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  type BinaryLike,
  type ScryptOptions,
} from "node:crypto";

const PASSWORD_HASH_ALGORITHM = "scrypt";
const PASSWORD_HASH_VERSION = "v1";
const KEY_LENGTH = 64;
const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_MAXMEM = 64 * 1024 * 1024;

function getScryptOptions(n: number, r: number, p: number): ScryptOptions {
  return {
    N: n,
    r,
    p,
    maxmem: SCRYPT_MAXMEM,
  };
}

function scrypt(
  password: BinaryLike,
  salt: BinaryLike,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(derivedKey);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derivedKey = await scrypt(
    password,
    salt,
    KEY_LENGTH,
    getScryptOptions(SCRYPT_N, SCRYPT_R, SCRYPT_P),
  );

  return [
    PASSWORD_HASH_ALGORITHM,
    PASSWORD_HASH_VERSION,
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt,
    derivedKey.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parts = encodedHash.split("$");

  if (parts.length !== 7) {
    return false;
  }

  const [algorithm, version, nValue, rValue, pValue, salt, expectedHash] =
    parts;

  if (
    algorithm !== PASSWORD_HASH_ALGORITHM ||
    version !== PASSWORD_HASH_VERSION ||
    !nValue ||
    !rValue ||
    !pValue ||
    !salt ||
    !expectedHash
  ) {
    return false;
  }

  const n = Number.parseInt(nValue, 10);
  const r = Number.parseInt(rValue, 10);
  const p = Number.parseInt(pValue, 10);

  if (!Number.isInteger(n) || !Number.isInteger(r) || !Number.isInteger(p)) {
    return false;
  }

  const expected = Buffer.from(expectedHash, "base64url");
  const actual = await scrypt(
    password,
    salt,
    expected.length,
    getScryptOptions(n, r, p),
  );

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
}
