import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/oauth/appinfo?client_id=&redirect_uri=
 * Public endpoint returning app display info for the consent screen.
 * Does NOT require login.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const client_id = sp.get("client_id") || "";
  const redirect_uri = sp.get("redirect_uri") || "";

  const app = await db.application.findUnique({ where: { appId: client_id } });
  if (!app) return NextResponse.json({ error: "invalid_client" }, { status: 400 });
  if (app.status !== "approved") return NextResponse.json({ error: "app_disabled" }, { status: 403 });

  const allowed = app.callbackUrls.split("\n").map((s) => s.trim()).filter(Boolean);
  if (redirect_uri && !allowed.includes(redirect_uri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
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
