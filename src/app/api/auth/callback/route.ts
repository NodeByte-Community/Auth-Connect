import { NextRequest, NextResponse } from "next/server";
import { decodePayload, verifySignature } from "@/lib/sso";
import { db } from "@/lib/db";
import { createSession, getSessionCookieName, sessionCookieMaxAge } from "@/lib/auth";
import { getUserByExternalId, resolveAvatarUrl } from "@/lib/discourse";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/callback?sso=...&sig=...&return_to=...
 * Discourse redirects back here after login.
 * - Verifies signature
 * - Upserts local user
 * - Fetches fresh trust_level + admin status from Discourse
 * - Creates session
 * - If return_to present -> redirect there; else -> home "/"
 */
export async function GET(req: NextRequest) {
  const sso = req.nextUrl.searchParams.get("sso");
  const sig = req.nextUrl.searchParams.get("sig");
  const returnTo = req.nextUrl.searchParams.get("return_to");
  const secret = process.env.DISCOURSE_CONNECT_SECRET || "";

  if (!sso || !sig) {
    return NextResponse.json({ error: "Missing sso or sig" }, { status: 400 });
  }

  if (!verifySignature(sso, sig, secret)) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 403 });
  }

  const payload = decodePayload(sso);
  const externalId = payload.external_id;
  const email = payload.email;
  const username = payload.username;
  const name = payload.name || username;
  const avatarUrl = payload.avatar_url ? (payload.avatar_url.startsWith("http") ? payload.avatar_url : `${process.env.DISCOURSE_BASE_URL}${payload.avatar_url}`) : null;
  const admin = payload.admin === "true";
  const moderator = payload.moderator === "true";

  if (!externalId || !email || !username) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Fetch fresh trust_level from Discourse API
  let trustLevel = 0;
  try {
    const detail = await getUserByExternalId(externalId);
    if (detail) {
      trustLevel = detail.trust_level ?? 0;
    }
  } catch (e) {
    console.error("[callback] getUserByExternalId failed:", e);
  }

  // Determine admin status
  const adminGroupName = process.env.ADMIN_GROUP_NAME || "admins";
  const adminTrustLevel = Number(process.env.ADMIN_TRUST_LEVEL || 4);
  let isAdmin = admin || moderator;
  if (!isAdmin && trustLevel >= adminTrustLevel) isAdmin = true;

  // Check group membership via Discourse API for robustness
  try {
    const groupRes = await fetch(`${process.env.DISCOURSE_BASE_URL}/groups/${adminGroupName}/members.json`, {
      headers: {
        "Api-Key": process.env.DISCOURSE_API_KEY || "",
        "Api-Username": process.env.DISCOURSE_API_USERNAME || "system",
      },
    });
    if (groupRes.ok) {
      const groupData = await groupRes.json();
      const members: any[] = groupData.members || [];
      if (members.some((m) => m.username === username)) {
        isAdmin = true;
      }
    }
  } catch (e) {
    console.error("[callback] group check failed:", e);
  }

  // Upsert user
  const user = await db.user.upsert({
    where: { externalId },
    create: {
      externalId,
      email,
      username,
      name,
      avatarUrl,
      trustLevel,
      isAdmin,
      isModerator: moderator,
      lastLoginAt: new Date(),
    },
    update: {
      email,
      username,
      name,
      avatarUrl,
      trustLevel,
      isAdmin,
      isModerator: moderator,
      lastLoginAt: new Date(),
    },
  });

  const sessionToken = await createSession(user.id, returnTo || undefined);
  await logAction({ userId: user.id, action: "LOGIN", ip: req.headers.get("x-forwarded-for") || undefined });

  // Use request origin for the post-login redirect (works in both dev and prod)
  const response = NextResponse.redirect(new URL(returnTo || "/", req.nextUrl.origin));
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge(),
  });

  return response;
}
