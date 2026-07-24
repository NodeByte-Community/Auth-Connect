import { NextRequest, NextResponse } from "next/server";
import { decodePayload, verifySignature } from "@/lib/sso";
import { db } from "@/lib/db";
import { createSession, getSessionCookieName } from "@/lib/auth";
import { getUserByExternalId } from "@/lib/discourse";
import { logAction } from "@/lib/logs";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

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
  const avatarUrl = payload.avatar_url
    ? (payload.avatar_url.startsWith("http")
      ? payload.avatar_url
      : `${process.env.DISCOURSE_BASE_URL}${payload.avatar_url}`)
    : null;
  const admin = payload.admin === "true";
  const moderator = payload.moderator === "true";

  if (!externalId || !email || !username) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Fetch fresh trust_level from Discourse API (may fail if API not configured)
  let trustLevel = 0;
  // Also check if SSO payload includes trust_level (some Discourse configs do)
  const payloadTrustLevel = (payload as any).trust_level;
  if (payloadTrustLevel != null) {
    trustLevel = Number(payloadTrustLevel);
  } else {
    try {
      const detail = await getUserByExternalId(externalId);
      if (detail) {
        trustLevel = detail.trust_level ?? 0;
      }
    } catch (e) {
      console.error("[callback] getUserByExternalId failed, trust_level defaults to 0:", e);
    }
  }

  // Determine admin status
  const adminGroupName = process.env.ADMIN_GROUP_NAME || "admins";
  const adminTrustLevel = Number(process.env.ADMIN_TRUST_LEVEL || 4);
  let isAdmin = admin || moderator;
  if (!isAdmin && trustLevel >= adminTrustLevel) isAdmin = true;

  // Check group membership via Discourse API (may fail if API not configured)
  try {
    const groupRes = await fetch(`${process.env.DISCOURSE_BASE_URL}/groups/${adminGroupName}/members.json`, {
      headers: {
        "Api-Key": process.env.DISCOURSE_API_KEY || "",
        "Api-Username": process.env.DISCOURSE_API_USERNAME || "system",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (groupRes.ok) {
      const groupData = await groupRes.json();
      const members: any[] = groupData.members || [];
      if (members.some((m) => m.username === username)) {
        isAdmin = true;
      }
    }
  } catch (e) {
    console.error("[callback] group check failed (non-fatal):", e);
  }

  // Upsert user
  const user = await db.user.upsert({
    where: { externalId },
    create: {
      externalId, email, username, name, avatarUrl,
      trustLevel, isAdmin, isModerator: moderator,
      lastLoginAt: new Date(),
    },
    update: {
      email, username, name, avatarUrl,
      trustLevel, isAdmin, isModerator: moderator,
      lastLoginAt: new Date(),
    },
  });

  // Only store pendingAuthorize if it's an OAuth authorize URL (not plain "/")
  // This prevents infinite redirect loop when returnTo is just "/"
  const pendingAuthorize = (returnTo && returnTo.startsWith("/api/oauth/authorize")) ? returnTo : undefined;
  const sessionToken = await createSession(user.id, pendingAuthorize);
  await logAction({ userId: user.id, action: "LOGIN", ip: req.headers.get("x-forwarded-for") || undefined });

  // Fix: Use BASE_URL from env instead of req.nextUrl.origin (which returns 0.0.0.0)
  const baseUrl = getBaseUrl(req);
  const response = NextResponse.redirect(new URL(returnTo || "/", baseUrl));
  // Session cookie: no maxAge = deleted when browser closes (auto logout)
  // Server-side session still expires after SESSION_TIMEOUT_MIN
  response.cookies.set(getSessionCookieName(), sessionToken, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    path: "/",
  });

  return response;
}
