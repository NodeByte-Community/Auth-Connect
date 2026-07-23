import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { generateClientSecret } from "@/lib/sso";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * POST /api/apps/[id]/regenerate-secret
 * Regenerate the client secret for an application.
 * Requires: app owner + verification code validation (body.code)
 * Returns: new client secret
 *
 * Security: old secret is immediately invalidated. All existing access tokens
 * remain valid until expiry, but new token requests must use the new secret.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  if (app.status !== "approved") {
    return NextResponse.json({ error: "应用未通过审核，无法操作" }, { status: 400 });
  }

  const body = await req.json();
  const code = String(body.code || "").trim();

  // Verify the code (reuse verification code mechanism - must have an unused, non-expired code)
  const record = await db.verificationCode.findFirst({
    where: { appId: app.id, used: false, code },
    orderBy: { createdAt: "desc" },
  });

  if (!record) {
    return NextResponse.json({ error: "验证码错误，请重新获取" }, { status: 400 });
  }
  if (record.expiresAt < new Date()) {
    await db.verificationCode.update({ where: { id: record.id }, data: { used: true } });
    return NextResponse.json({ error: "验证码已过期，请重新获取" }, { status: 400 });
  }

  // Consume the code
  await db.verificationCode.update({ where: { id: record.id }, data: { used: true } });

  // Generate new secret
  const newSecret = generateClientSecret();
  await db.application.update({
    where: { id: app.id },
    data: { clientSecret: newSecret },
  });

  // Invalidate all existing access tokens for this app (force re-auth)
  await db.accessToken.deleteMany({ where: { appId: app.id } });

  await logAction({ userId: session.user.id, action: "APP_SECRET_REGEN", details: `App: ${app.name} (${app.appId})` });

  return NextResponse.json({
    ok: true,
    clientSecret: newSecret,
    message: "密钥已重新生成，旧密钥立即失效。所有已签发的 access token 已撤销，用户需重新授权。",
  });
}
