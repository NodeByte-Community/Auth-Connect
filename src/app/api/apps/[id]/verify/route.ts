import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateCode } from "@/lib/sso";
import { sendDiscoursePM } from "@/lib/discourse";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * POST /api/apps/[id]/verify
 * Sends a 5-minute verification code to the app owner's Discourse inbox (站内信).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  if (app.status !== "approved") {
    return NextResponse.json({ error: "应用未通过审核，无法验证" }, { status: 400 });
  }

  // Invalidate old codes
  await db.verificationCode.updateMany({
    where: { appId: app.id, used: false },
    data: { used: true },
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  await db.verificationCode.create({
    data: { appId: app.id, code, expiresAt },
  });

  // Send PM
  const result = await sendDiscoursePM(
    session.user.username,
    "[NodeByte Connect] 您的验证码",
    `您正在查看应用 **${app.name}** 的凭据。\n\n验证码: **${code}**\n\n有效期 5 分钟，请勿泄露给他人。如非本人操作请忽略此消息。`
  );

  if (!result.success) {
    return NextResponse.json({ error: "验证码发送失败，请稍后重试: " + (result.error || "") }, { status: 500 });
  }

  await logAction({ userId: session.user.id, action: "APP_VERIFY_SEND", details: `App: ${app.name}` });

  return NextResponse.json({
    ok: true,
    message: "验证码已通过 Discourse 站内信发送至您的账号，有效期 5 分钟",
    expiresIn: 300,
  });
}

/**
 * POST /api/apps/[id]/verify?code=xxx  (body: { code })
 * Verify code and return credentials.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  const body = await req.json();
  const code = String(body.code || "").trim();

  const record = await db.verificationCode.findFirst({
    where: { appId: app.id, used: false, code },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ error: "验证码错误" }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    await db.verificationCode.update({ where: { id: record.id }, data: { used: true } });
    return NextResponse.json({ error: "验证码已过期，请重新获取" }, { status: 400 });
  }

  await db.verificationCode.update({ where: { id: record.id }, data: { used: true } });

  await logAction({ userId: session.user.id, action: "APP_VERIFY_OK", details: `App: ${app.name}` });

  // Build full endpoint URLs
  const base = process.env.BASE_URL || "http://localhost:3000";
  const endpoints = app.type === "oidc" ? {
    authorize: `${base}/api/oauth/authorize`,
    token: `${base}/api/oauth/token`,
    userinfo: `${base}/api/oauth/userinfo`,
    discovery: `${base}/api/oidc/discovery`,
    jwks: `${base}/api/oidc/jwks`,
  } : {
    authorize: `${base}/api/oauth/authorize`,
    token: `${base}/api/oauth/token`,
    userinfo: `${base}/api/oauth/userinfo`,
  };

  return NextResponse.json({
    ok: true,
    appId: app.appId,
    clientSecret: app.clientSecret,
    type: app.type,
    endpoints,
    scopes: app.scopes,
    callbackUrls: app.callbackUrls,
  });
}
