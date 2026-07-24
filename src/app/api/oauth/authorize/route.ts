import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateAuthCode } from "@/lib/sso";
import { logAction } from "@/lib/logs";
import { getBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/authorize
 * OAuth2 / OIDC Authorization endpoint.
 *
 * Params: response_type=code, client_id, redirect_uri, scope, state, nonce
 *
 * Logic:
 *  - Validate client + redirect_uri
 *  - If not logged in -> redirect to /api/auth/login?return_to=<this full URL>
 *      (solves the "callback landed on system home" problem)
 *  - If logged in -> redirect to /?view=authorize&... so frontend shows consent
 *  - User consents via POST -> issues auth code
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const response_type = sp.get("response_type");
  const client_id = sp.get("client_id");
  const redirect_uri = sp.get("redirect_uri");
  const scope = sp.get("scope") || "";
  const state = sp.get("state") || "";
  const nonce = sp.get("nonce") || "";

  if (response_type !== "code") {
    return NextResponse.json({ error: "unsupported_response_type" }, { status: 400 });
  }
  if (!client_id || !redirect_uri) {
    return NextResponse.json({ error: "invalid_request", error_description: "missing client_id or redirect_uri" }, { status: 400 });
  }

  const app = await db.application.findUnique({ where: { appId: client_id } });
  if (!app) {
    return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  }
  if (app.status !== "approved") {
    return NextResponse.json({ error: "access_denied", error_description: "应用未通过审核或已停用" }, { status: 403 });
  }

  // Validate redirect_uri against registered (one per line)
  const allowed = app.callbackUrls.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  // Check login
  const session = await getSession();
  if (!session) {
    const baseUrl = getBaseUrl(req);
    const loginUrl = new URL("/api/auth/login", baseUrl);
    loginUrl.searchParams.set("return_to", req.nextUrl.pathname + req.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in -> show consent (frontend at / handles view=authorize)
  const baseUrl = getBaseUrl(req);
  const consentUrl = new URL("/", baseUrl);
  consentUrl.searchParams.set("view", "authorize");
  consentUrl.searchParams.set("client_id", client_id);
  consentUrl.searchParams.set("redirect_uri", redirect_uri);
  consentUrl.searchParams.set("scope", scope);
  consentUrl.searchParams.set("state", state);
  if (nonce) consentUrl.searchParams.set("nonce", nonce);
  return NextResponse.redirect(consentUrl);
}

/**
 * POST /api/oauth/authorize
 * User has consented (or denied). Body: { client_id, redirect_uri, scope, state, nonce, action: "approve"|"deny" }
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();
  const { client_id, redirect_uri, scope, state, nonce, action } = body;

  const app = await db.application.findUnique({ where: { appId: client_id } });
  if (!app) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (app.status !== "approved") return NextResponse.json({ error: "access_denied" }, { status: 403 });

  const allowed = app.callbackUrls.split("\n").map((s) => s.trim()).filter(Boolean);
  if (!allowed.includes(redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  if (action === "deny") {
    const denyUrl = new URL(redirect_uri);
    denyUrl.searchParams.set("error", "access_denied");
    denyUrl.searchParams.set("error_description", "user_denied");
    if (state) denyUrl.searchParams.set("state", state);
    await logAction({ userId: session.user.id, action: "OAUTH_DENY", details: `App: ${app.name}` });
    return NextResponse.json({ redirect: denyUrl.toString() });
  }

  // Issue auth code
  const code = generateAuthCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min
  await db.authCode.create({
    data: {
      code,
      appId: app.id,
      userId: session.user.id,
      scopes: scope || app.scopes,
      redirectUri: redirect_uri,
      expiresAt,
    },
  });

  await logAction({ userId: session.user.id, action: "OAUTH_APPROVE", details: `App: ${app.name}, scopes: ${scope}` });

  const cb = new URL(redirect_uri);
  cb.searchParams.set("code", code);
  if (state) cb.searchParams.set("state", state);

  return NextResponse.json({ redirect: cb.toString() });
}
