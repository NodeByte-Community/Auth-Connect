import { createHmac, randomBytes, randomUUID } from "crypto";

/**
 * HMAC-SHA256 signing for Discourse Connect (SSO) protocol.
 */

export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifySignature(payload: string, sig: string, secret: string): boolean {
  const expected = signPayload(payload, secret);
  // timing-safe compare
  if (expected.length !== sig.length) return false;
  let result = 0;
  for (let i = 0; i < expected.length; i++) {
    result |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return result === 0;
}

export function encodePayload(obj: Record<string, string>): string {
  const qs = new URLSearchParams(obj).toString();
  return Buffer.from(qs, "utf-8").toString("base64");
}

export function decodePayload(b64: string): Record<string, string> {
  const qs = Buffer.from(b64, "base64").toString("utf-8");
  const params = new URLSearchParams(qs);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
}

export function generateNonce(): string {
  return randomBytes(16).toString("hex");
}

export function generateAppId(): string {
  return "nb_" + randomBytes(12).toString("hex");
}

export function generateClientSecret(): string {
  return randomBytes(32).toString("hex");
}

export function generateCode(): string {
  // 6-digit verification code
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateAuthCode(): string {
  return randomBytes(24).toString("hex");
}

export function generateUUID(): string {
  return randomUUID();
}
