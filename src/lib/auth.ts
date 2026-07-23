import { db } from "@/lib/db";
import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const SESSION_COOKIE = "nbconnect_session";
const SESSION_SECRET = new TextEncoder().encode(process.env.SESSION_SECRET || "fallback-secret-change-me");
const SESSION_TIMEOUT_MIN = Number(process.env.SESSION_TIMEOUT_MIN || 720);

export interface SessionUser {
  id: string;
  externalId: string;
  username: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  trustLevel: number;
  isAdmin: boolean;
  isModerator: boolean;
  isBanned: boolean;
}

export async function createSession(userId: string, pendingAuthorize?: string): Promise<string> {
  // Delete old sessions for user
  await db.session.deleteMany({ where: { userId } }).catch(() => {});

  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TIMEOUT_MIN * 60 * 1000);

  await db.session.create({
    data: {
      userId,
      token,
      expiresAt,
      pendingAuthorize: pendingAuthorize || null,
    },
  });

  return token;
}

export async function getSession(): Promise<{ user: SessionUser; sessionToken: string; pendingAuthorize: string | null } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  if (session.user.isBanned || session.user.isSuspended) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  return {
    user: {
      id: session.user.id,
      externalId: session.user.externalId,
      username: session.user.username,
      email: session.user.email,
      name: session.user.name,
      avatarUrl: session.user.avatarUrl,
      trustLevel: session.user.trustLevel,
      isAdmin: session.user.isAdmin,
      isModerator: session.user.isModerator,
      isBanned: session.user.isBanned,
    },
    sessionToken: token,
    pendingAuthorize: session.pendingAuthorize,
  };
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.session.deleteMany({ where: { token } }).catch(() => {});
  }
}

export async function clearPendingAuthorize(token: string): Promise<void> {
  await db.session.update({
    where: { token },
    data: { pendingAuthorize: null },
  }).catch(() => {});
}

export function getSessionCookieName(): string {
  return SESSION_COOKIE;
}

export function sessionCookieMaxAge(): number {
  return SESSION_TIMEOUT_MIN * 60;
}

/**
 * JWT signing using jose (edge-compatible) for OIDC id_token.
 */
export async function signJWT(payload: Record<string, any>, expiresIn: string = "1h"): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(SESSION_SECRET);
}

export async function verifyJWT(token: string): Promise<any> {
  const { payload } = await jwtVerify(token, SESSION_SECRET);
  return payload;
}

/**
 * Require a logged-in session or throw.
 */
export async function requireSession(): Promise<{ user: SessionUser; sessionToken: string; pendingAuthorize: string | null }> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

/**
 * Require an admin session or throw.
 */
export async function requireAdmin(): Promise<{ user: SessionUser; sessionToken: string }> {
  const s = await requireSession();
  if (!s.user.isAdmin) throw new Error("FORBIDDEN");
  return s;
}
