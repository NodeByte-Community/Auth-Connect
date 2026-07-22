import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSession, getSessionCookieName, sessionCookieMaxAge } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * DEV ONLY login bypass.
 * Only enabled when DISCOURSE_CONNECT_SECRET is still the default placeholder,
 * allowing full UI testing in sandbox without real Discourse credentials.
 *
 * Query: ?admin=1 to create/login as an admin user.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.DISCOURSE_CONNECT_SECRET || "";
  if (secret && secret !== "CHANGE_ME_TO_YOUR_SSO_SECRET") {
    return NextResponse.json({ error: "dev login disabled in production" }, { status: 403 });
  }

  const wantAdmin = req.nextUrl.searchParams.get("admin") === "1";
  const returnTo = req.nextUrl.searchParams.get("return_to") || "/";

  const externalId = wantAdmin ? "99999" : "88888";
  const username = wantAdmin ? "admin_demo" : "user_demo";
  const email = wantAdmin ? "admin@demo.nodebyte.cn" : "user@demo.nodebyte.cn";

  const user = await db.user.upsert({
    where: { externalId },
    create: {
      externalId,
      email,
      username,
      name: wantAdmin ? "演示管理员" : "演示用户",
      avatarUrl: null,
      trustLevel: wantAdmin ? 4 : 2,
      isAdmin: wantAdmin,
      isModerator: false,
      lastLoginAt: new Date(),
    },
    update: {
      email,
      username,
      trustLevel: wantAdmin ? 4 : 2,
      isAdmin: wantAdmin,
      lastLoginAt: new Date(),
    },
  });

  const token = await createSession(user.id, returnTo !== "/" ? returnTo : undefined);
  await logAction({ userId: user.id, action: "DEV_LOGIN", ip: req.headers.get("x-forwarded-for") || undefined });

  // In dev mode, redirect using request origin (localhost), not BASE_URL
  const res = NextResponse.redirect(new URL(returnTo, req.nextUrl.origin));
  res.cookies.set(getSessionCookieName(), token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: sessionCookieMaxAge(),
  });
  return res;
}
