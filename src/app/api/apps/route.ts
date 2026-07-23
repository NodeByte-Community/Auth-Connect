import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateAppId, generateClientSecret } from "@/lib/sso";
import { getSettings } from "@/lib/settings";
import { verifyCaptcha } from "@/app/api/captcha/route";
import { logAction } from "@/lib/logs";
import { sendDiscoursePM } from "@/lib/discourse";
import { checkTrustLevel } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/apps
 * List current user's applications ONLY (security: never expose other users' apps).
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const apps = await db.application.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ apps });
}

/**
 * POST /api/apps
 * Apply for a new application.
 * Body: { name, icon, description, type, callbackUrls, siteLogo, captchaId, captchaAnswer }
 *
 * SECURITY: 后端不信任前端，所有校验在后端强制执行：
 * 1. 实时从DB读取用户最新状态（不信任session快照）
 * 2. 可选：实时从Discourse API获取最新trust_level（防降级绕过）
 * 3. 等级校验、封禁校验、申请权限校验
 * 4. 人机验证、字段校验、回调地址校验
 * 5. 最大应用数限制
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  // ===== 后端安全校验 =====
  // 不信任 session.user.trustLevel，从 DB 重新读取 + 实时 Discourse API 验证
  const levelCheck = await checkTrustLevel(session.user.id, { checkDiscourse: true });
  if (!levelCheck.ok) {
    return NextResponse.json({ error: levelCheck.error }, { status: 403 });
  }

  const body = await req.json();
  const { name, icon, description, type, callbackUrls, siteLogo, captchaId, captchaAnswer } = body;

  // Captcha
  if (!captchaId || !captchaAnswer || !verifyCaptcha(captchaId, captchaAnswer)) {
    return NextResponse.json({ error: "人机验证失败，请重试" }, { status: 400 });
  }

  // Validate fields
  if (!name || !description || !type || !callbackUrls) {
    return NextResponse.json({ error: "请填写所有必填字段" }, { status: 400 });
  }
  if (type !== "oidc" && type !== "oauth2") {
    return NextResponse.json({ error: "应用类型无效" }, { status: 400 });
  }

  // Validate callback URLs (one per line, must be https or http://localhost)
  const urls = String(callbackUrls).split("\n").map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) {
    return NextResponse.json({ error: "至少需要一个回调地址" }, { status: 400 });
  }
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

  // Max apps check
  const settings = await getSettings();
  const count = await db.application.count({ where: { ownerId: session.user.id } });
  if (count >= settings.maxAppsPerUser) {
    return NextResponse.json({ error: `已达最大应用数限制 (${settings.maxAppsPerUser})` }, { status: 403 });
  }

  const appId = generateAppId();
  const clientSecret = generateClientSecret();

  const app = await db.application.create({
    data: {
      appId,
      name: String(name).slice(0, 100),
      icon: icon ? String(icon).slice(0, 2048) : null,
      description: String(description).slice(0, 2000),
      type,
      callbackUrls: urls.join("\n"),
      ownerId: session.user.id,
      clientSecret,
      scopes: type === "oidc" ? "openid profile email" : "profile email",
      siteLogo: siteLogo ? String(siteLogo).slice(0, 2048) : null,
      status: "pending",
    },
  });

  // Create review entry
  await db.appReview.create({
    data: {
      appId: app.id,
      status: "pending",
    },
  });

  await logAction({ userId: session.user.id, action: "APP_SUBMIT", details: `App: ${name} (${appId})` });

  // Notify admins via Discourse PM
  if (settings.notifyOnSubmit) {
    const admins = await db.user.findMany({ where: { isAdmin: true } });
    for (const admin of admins) {
      const link = `${process.env.BASE_URL}/?admin=1&tab=reviews`;
      await sendDiscoursePM(
        admin.username,
        "[NodeByte Connect] 新应用审核",
        `用户 **${session.user.username}** 提交了新应用 **${name}** 等待审核。\n\n[一键直达审核](${link})`
      ).catch(() => {});
    }
  }

  return NextResponse.json({ app });
}
