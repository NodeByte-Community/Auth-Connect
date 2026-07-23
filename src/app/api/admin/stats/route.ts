import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stats
 * Admin overview statistics: app counts, user counts, token issuance,
 * recent activity, daily trends.
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  // App counts by status
  const appStatusCounts = await db.application.groupBy({
    by: ["status"],
    _count: { status: true },
  });
  const appCounts: Record<string, number> = {};
  for (const r of appStatusCounts) appCounts[r.status] = r._count.status;
  const totalApps = await db.application.count();

  // App counts by type
  const appTypeCounts = await db.application.groupBy({
    by: ["type"],
    _count: { type: true },
  });
  const typeCounts: Record<string, number> = {};
  for (const r of appTypeCounts) typeCounts[r.type] = r._count.type;

  // User counts
  const totalUsers = await db.user.count();
  const bannedUsers = await db.user.count({ where: { isBanned: true } });
  const admins = await db.user.count({ where: { isAdmin: true } });

  // Token issuance stats
  const totalTokensIssued = await db.accessToken.count();
  const activeTokens = await db.accessToken.count({
    where: { expiresAt: { gt: new Date() } },
  });

  // Pending reviews
  const pendingReviews = await db.appReview.count({ where: { status: "pending" } });

  // Daily trends - last 14 days
  const now = new Date();
  const days: { date: string; apps: number; tokens: number; users: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const dayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i + 1);
    const [apps, tokens, users] = await Promise.all([
      db.application.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      db.accessToken.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
      db.user.count({ where: { createdAt: { gte: dayStart, lt: dayEnd } } }),
    ]);
    days.push({
      date: dayStart.toISOString().slice(0, 10),
      apps,
      tokens,
      users,
    });
  }

  // Week-over-week comparison for KPI trend indicators
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgoStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgoStart = new Date(todayStart.getTime() - 14 * 24 * 60 * 60 * 1000);
  const [thisWeekApps, lastWeekApps, thisWeekUsers, lastWeekUsers, thisWeekTokens, lastWeekTokens] = await Promise.all([
    db.application.count({ where: { createdAt: { gte: weekAgoStart } } }),
    db.application.count({ where: { createdAt: { gte: twoWeeksAgoStart, lt: weekAgoStart } } }),
    db.user.count({ where: { createdAt: { gte: weekAgoStart } } }),
    db.user.count({ where: { createdAt: { gte: twoWeeksAgoStart, lt: weekAgoStart } } }),
    db.accessToken.count({ where: { createdAt: { gte: weekAgoStart } } }),
    db.accessToken.count({ where: { createdAt: { gte: twoWeeksAgoStart, lt: weekAgoStart } } }),
  ]);
  const calcTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };
  const trends = {
    apps: { current: thisWeekApps, previous: lastWeekApps, pct: calcTrend(thisWeekApps, lastWeekApps) },
    users: { current: thisWeekUsers, previous: lastWeekUsers, pct: calcTrend(thisWeekUsers, lastWeekUsers) },
    tokens: { current: thisWeekTokens, previous: lastWeekTokens, pct: calcTrend(thisWeekTokens, lastWeekTokens) },
  };

  // Recent review decisions (last 5 non-pending)
  const recentReviews = await db.appReview.findMany({
    where: { status: { in: ["approved", "rejected"] } },
    take: 5,
    orderBy: { reviewedAt: "desc" },
    include: { app: { select: { name: true, appId: true, icon: true } }, reviewer: { select: { username: true } } },
  });

  // Top apps by token issuance
  const topAppsRaw = await db.accessToken.groupBy({
    by: ["appId"],
    _count: { appId: true },
    orderBy: { _count: { appId: "desc" } },
    take: 5,
  });
  const topApps = await Promise.all(
    topAppsRaw.map(async (r) => {
      const app = await db.application.findUnique({
        where: { id: r.appId },
        select: { name: true, appId: true, type: true, icon: true },
      });
      return {
        name: app?.name || "未知",
        appId: app?.appId || "",
        type: app?.type || "",
        icon: app?.icon,
        count: r._count.appId,
      };
    })
  );

  // Recent logs (last 10)
  const recentLogs = await db.userLog.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: { user: { select: { username: true } } },
  });

  return NextResponse.json({
    appCounts: {
      total: totalApps,
      pending: appCounts.pending || 0,
      pending_re_review: appCounts.pending_re_review || 0,
      approved: appCounts.approved || 0,
      rejected: appCounts.rejected || 0,
      disabled: appCounts.disabled || 0,
    },
    typeCounts,
    users: { total: totalUsers, banned: bannedUsers, admins },
    tokens: { total: totalTokensIssued, active: activeTokens },
    pendingReviews,
    dailyTrend: days,
    trends,
    topApps,
    recentReviews: recentReviews.map((r) => ({
      id: r.id,
      status: r.status,
      reason: r.reason,
      reviewedAt: r.reviewedAt?.toISOString() || null,
      appName: r.app?.name || "未知",
      appIcon: r.app?.icon,
      reviewer: r.reviewer?.username || "system",
    })),
    recentLogs: recentLogs.map((l) => ({
      id: l.id,
      action: l.action,
      username: l.user?.username || "system",
      createdAt: l.createdAt.toISOString(),
      details: l.details,
    })),
  });
}
