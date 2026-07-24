import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/userinfo
 * OAuth2 / OIDC UserInfo endpoint. Requires Bearer access token.
 *
 * Always returns login, username, preferred_username, sub (even with minimal scope)
 * to ensure compatibility with OIDC clients that require these fields.
 */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  }
  const token = auth.slice(7);
  const at = await db.accessToken.findUnique({
    where: { token },
    include: { user: true, app: true },
  });
  if (!at) return NextResponse.json({ error: "invalid_token" }, { status: 401 });
  if (at.expiresAt < new Date()) return NextResponse.json({ error: "invalid_token", error_description: "expired" }, { status: 401 });
  if (at.app.status !== "approved") return NextResponse.json({ error: "access_denied" }, { status: 403 });

  const u = at.user;
  if (u.isBanned || u.isSuspended) {
    return NextResponse.json({ error: "access_denied", error_description: "user banned" }, { status: 403 });
  }

  const scopes = at.scopes.split(/\s+/);

  // ALWAYS include these fields regardless of scope
  // Many OIDC clients (e.g., Gitea, Forgejo) require "login" field
  const claims: any = {
    sub: u.externalId,
    login: u.username,
    username: u.username,
    preferred_username: u.username,
    name: u.name || u.username,
  };

  if (scopes.includes("profile") || scopes.includes("openid")) {
    claims.picture = u.avatarUrl;
    claims.trust_level = u.trustLevel;
    claims.is_admin = u.isAdmin;
    claims.is_moderator = u.isModerator;
  }
  if (scopes.includes("email") || scopes.includes("openid")) {
    claims.email = u.email;
    claims.email_verified = true;
  }

  return NextResponse.json(claims);
}
