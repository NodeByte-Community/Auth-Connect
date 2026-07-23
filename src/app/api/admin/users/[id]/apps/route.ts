import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/apps
 * Admin: list all applications owned by a given user + user info + recent activity.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await params;

  const [user, apps, recentLogs, stats] = await Promise.all([
    db.user.findUnique({
      where: { id },
      select: {
        id: true, externalId: true, username: true, name: true, email: true,
        avatarUrl: true, trustLevel: true, isAdmin: true, isModerator: true,
        isBanned: true, isSuspended: true, appSubmitBlocked: true,
        createdAt: true, lastLoginAt: true,
      },
    }),
    db.application.findMany({
      where: { ownerId: id },
      orderBy: { createdAt: "desc" },
    }),
    db.userLog.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, details: true, ip: true, createdAt: true },
    }),
    db.application.groupBy({
      by: ["status"],
      where: { ownerId: id },
      _count: { status: true },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "用户不存在" }, { status: 404 });

  const statusCounts: Record<string, number> = {};
  for (const r of stats) statusCounts[r.status] = r._count.status;

  return NextResponse.json({
    user,
    apps,
    recentLogs,
    statusCounts,
  });
}
