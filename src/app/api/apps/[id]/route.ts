import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/apps/[id]
 * Get a single application owned by current user.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({
    where: { id, ownerId: session.user.id },
  });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  const settings = await getSettings();
  return NextResponse.json({ app, settings });
}

/**
 * PUT /api/apps/[id]
 * Edit application -> sets status back to pending (requires re-review).
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  const body = await req.json();
  const { name, icon, description, type, callbackUrls, siteLogo } = body;

  // Validate
  if (type && type !== "oidc" && type !== "oauth2") {
    return NextResponse.json({ error: "应用类型无效" }, { status: 400 });
  }

  let urls: string[] | undefined;
  if (callbackUrls) {
    urls = String(callbackUrls).split("\n").map((s) => s.trim()).filter(Boolean);
    for (const u of urls) {
      try {
        const parsed = new URL(u);
        if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
          return NextResponse.json({ error: `回调地址必须为 HTTPS: ${u}` }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: `回调地址格式错误: ${u}` }, { status: 400 });
      }
    }
  }

  const updated = await db.application.update({
    where: { id },
    data: {
      name: name !== undefined ? String(name).slice(0, 100) : undefined,
      icon: icon !== undefined ? (icon ? String(icon).slice(0, 2048) : null) : undefined,
      description: description !== undefined ? String(description).slice(0, 2000) : undefined,
      type: type || undefined,
      callbackUrls: urls ? urls.join("\n") : undefined,
      siteLogo: siteLogo !== undefined ? (siteLogo ? String(siteLogo).slice(0, 2048) : null) : undefined,
      status: "pending_re_review",
      rejectReason: null,
    },
  });

  await db.appReview.create({
    data: { appId: app.id, status: "pending" },
  });

  await logAction({ userId: session.user.id, action: "APP_EDIT", details: `App: ${updated.name} (${updated.appId}) - re-review` });

  // Notify admins
  const settings = await getSettings();
  if (settings.notifyOnSubmit) {
    const { sendDiscoursePM } = await import("@/lib/discourse");
    const admins = await db.user.findMany({ where: { isAdmin: true } });
    for (const admin of admins) {
      const link = `${process.env.BASE_URL}/?admin=1&tab=reviews`;
      await sendDiscoursePM(
        admin.username,
        "[NodeByte Connect] 应用修改待复审",
        `用户 **${session.user.username}** 修改了应用 **${updated.name}**，等待复审。\n\n[一键直达审核](${link})`
      ).catch(() => {});
    }
  }

  return NextResponse.json({ app: updated });
}

/**
 * DELETE /api/apps/[id]
 * Delete application (owner only).
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  await db.application.delete({ where: { id } });

  await logAction({ userId: session.user.id, action: "APP_DELETE", details: `App: ${app.name} (${app.appId})` });

  return NextResponse.json({ ok: true });
}
