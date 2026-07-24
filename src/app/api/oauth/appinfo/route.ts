import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { validateRedirectUriDomain } from "@/lib/url";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/appinfo?client_id=&redirect_uri=
 * Public endpoint returning app display info for the consent screen.
 * Does NOT require login.
 *
 * redirect_uri 校验：只检查域名，不检查路径后缀。
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const client_id = sp.get("client_id") || "";
  const redirect_uri = sp.get("redirect_uri") || "";

  const app = await db.application.findUnique({ where: { appId: client_id } });
  if (!app) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (app.status !== "approved") return NextResponse.json({ error: "app_disabled" }, { status: 403 });

  // 校验 redirect_uri 域名（不检查路径后缀）
  if (redirect_uri) {
    const allowedUrls = app.callbackUrls.split("\n").map((s) => s.trim()).filter(Boolean);
    const domainCheck = validateRedirectUriDomain(redirect_uri, allowedUrls);
    if (!domainCheck.ok) {
      return NextResponse.json(
        { error: "invalid_redirect_uri", error_description: domainCheck.error },
        { status: 400 }
      );
    }
  }

  return NextResponse.json({
    app: {
      name: app.name,
      description: app.description,
      icon: app.icon,
      siteLogo: app.siteLogo,
      type: app.type,
      scopes: app.scopes,
    },
  });
}
