import { createHash, randomBytes } from "node:crypto";

export const ADMIN_SESSION_COOKIE_NAME = "replica_admin_session";
export const ADMIN_SESSION_TTL_MS = 12 * 60 * 60 * 1000;

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function createSessionExpiry(now = new Date()): Date {
  return new Date(now.getTime() + ADMIN_SESSION_TTL_MS);
}

export function hashContextValue(value: string | undefined): string | null {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  return createHash("sha256").update(trimmed).digest("hex");
}
