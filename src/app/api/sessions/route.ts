import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/sessions
 * List current user's active sessions.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const sessions = await db.session.findMany({
    where: { userId: session.user.id, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Mask token (only show last 8 chars) + mark current
  const masked = sessions.map((s) => ({
    id: s.id,
    tokenPreview: "..." + s.token.slice(-8),
    isCurrent: s.token === session.sessionToken,
    createdAt: s.createdAt.toISOString(),
    expiresAt: s.expiresAt.toISOString(),
    device: "浏览器会话", // we don't track UA; could enhance later
  }));

  return NextResponse.json({ sessions: masked });
}

/**
 * DELETE /api/sessions
 * Body: { id } - revoke a specific session (not current)
 * Or { all: true } - revoke all other sessions
 */
export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const body = await req.json();

  if (body.all === true) {
    // Revoke all sessions except current
    const result = await db.session.deleteMany({
      where: { userId: session.user.id, NOT: { token: session.sessionToken } },
    });
    await logAction({ userId: session.user.id, action: "SESSION_REVOKE_ALL", details: `revoked ${result.count} sessions` });
    return NextResponse.json({ revoked: result.count });
  }

  if (body.id) {
    const target = await db.session.findUnique({ where: { id: body.id } });
    if (!target || target.userId !== session.user.id) {
      return NextResponse.json({ error: "会话不存在" }, { status: 404 });
    }
    if (target.token === session.sessionToken) {
      return NextResponse.json({ error: "无法注销当前会话，请使用退出登录" }, { status: 400 });
    }
    await db.session.delete({ where: { id: body.id } });
    await logAction({ userId: session.user.id, action: "SESSION_REVOKE", details: `session ${body.id}` });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "需要指定 id 或 all" }, { status: 400 });
}
