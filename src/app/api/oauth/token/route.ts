import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateToken } from "@/lib/sso";
import { signJWT } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * POST /api/oauth/token
 * OAuth2 / OIDC Token endpoint.
 *
 * grant_type=authorization_code: exchange code for tokens
 * grant_type=refresh_token: refresh
 *
 * Auth: HTTP Basic with client_id:client_secret OR body client_id+client_secret.
 */
export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") || "";
  let form: Record<string, string> = {};

  if (contentType.includes("application/json")) {
    form = await req.json();
  } else {
    const text = await req.text();
    const params = new URLSearchParams(text);
    params.forEach((v, k) => (form[k] = v));
  }

  // Basic auth header
  const authHeader = req.headers.get("authorization") || "";
  if (authHeader.startsWith("Basic ")) {
    try {
      const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
      const [cid, csec] = decoded.split(":");
      if (cid && csec) {
        form.client_id = form.client_id || cid;
        form.client_secret = form.client_secret || csec;
      }
    } catch {}
  }

  const { grant_type, client_id, client_secret, code, redirect_uri, refresh_token } = form;

  if (!client_id) return NextResponse.json({ error: "invalid_client" }, { status: 401 });

  const app = await db.application.findUnique({ where: { appId: client_id } });
  if (!app || app.clientSecret !== client_secret) {
    return NextResponse.json({ error: "invalid_client" }, { status: 401 });
  }
  if (app.status !== "approved") {
    return NextResponse.json({ error: "access_denied", error_description: "应用已停用" }, { status: 403 });
  }

  if (grant_type === "authorization_code") {
    if (!code || !redirect_uri) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    const authCode = await db.authCode.findUnique({ where: { code } });
    if (!authCode || authCode.used) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (authCode.expiresAt < new Date()) {
      return NextResponse.json({ error: "invalid_grant", error_description: "code expired" }, { status: 400 });
    }
    if (authCode.appId !== app.id) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    if (authCode.redirectUri !== redirect_uri) {
      return NextResponse.json({ error: "invalid_grant", error_description: "redirect_uri mismatch" }, { status: 400 });
    }

    await db.authCode.update({ where: { id: authCode.id }, data: { used: true } });

    const user = await db.user.findUnique({ where: { id: authCode.userId } });
    if (!user) return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    if (user.isBanned || user.isSuspended) {
      return NextResponse.json({ error: "access_denied", error_description: "user banned" }, { status: 403 });
    }

    const accessToken = generateToken();
    const refreshToken = generateToken();
    const expiresIn = 3600;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    await db.accessToken.create({
      data: {
        token: accessToken,
        refreshToken,
        appId: app.id,
        userId: user.id,
        scopes: authCode.scopes,
        expiresAt,
      },
    });

    await logAction({ userId: user.id, action: "OAUTH_TOKEN_ISSUED", details: `App: ${app.name}` });

    const response: any = {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: authCode.scopes,
    };

    // Always include user info fields in token response
    // Many OAuth2 clients (Gitea, Forgejo, etc.) parse these directly without calling userinfo
    response.login = user.username;
    response.username = user.username;
    response.name = user.name || user.username;
    response.sub = user.externalId;

    // OIDC: if scope includes openid, issue id_token
    if (authCode.scopes.includes("openid")) {
      const claims: any = {
        sub: user.externalId,
        iss: process.env.BASE_URL,
        aud: app.appId,
        name: user.name || user.username,
        preferred_username: user.username,
        login: user.username,
        username: user.username,
        email: user.email,
        email_verified: true,
        picture: user.avatarUrl,
        trust_level: user.trustLevel,
      };
      // nonce binding if provided in original authorize (stored on authCode? we stored scopes only)
      // For simplicity we don't store nonce on authCode; clients without nonce are fine.
      const idToken = await signJWT(claims, "1h");
      response.id_token = idToken;
    }

    return NextResponse.json(response);
  }

  if (grant_type === "refresh_token") {
    if (!refresh_token) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    const existing = await db.accessToken.findUnique({ where: { refreshToken: refresh_token } });
    if (!existing || existing.appId !== app.id) {
      return NextResponse.json({ error: "invalid_grant" }, { status: 400 });
    }
    const user = await db.user.findUnique({ where: { id: existing.userId } });
    if (!user || user.isBanned || user.isSuspended) {
      return NextResponse.json({ error: "access_denied" }, { status: 403 });
    }

    const accessToken = generateToken();
    const newRefresh = generateToken();
    const expiresIn = 3600;
    await db.accessToken.update({
      where: { id: existing.id },
      data: {
        token: accessToken,
        refreshToken: newRefresh,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      },
    });

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn,
      refresh_token: newRefresh,
      scope: existing.scopes,
      login: user.username,
      username: user.username,
      name: user.name || user.username,
      sub: user.externalId,
    });
  }

  return NextResponse.json({ error: "unsupported_grant_type" }, { status: 400 });
}
