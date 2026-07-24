import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllUserStatuses } from "@/lib/discourse";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/check-banned?key=
 * Periodic job (every 5 min):
 *  1. 批量获取所有 Discourse 用户状态（非逐个查询）
 *  2. 自动识别并更新用户等级 (trust_level)
 *  3. 自动更新管理员/版主状态 (admin/moderator)
 *  4. 检测封禁用户 → 停用所有应用 + 清理会话
 *  5. 移除已解封用户的封禁标记
 */
export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key") || "";
  const expectedKey = process.env.CRON_KEY || process.env.DISCOURSE_API_KEY || "";
  if (!expectedKey || key !== expectedKey) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const startedAt = Date.now();
  let checked = 0;
  let bannedCount = 0;
  let unbannedCount = 0;
  let appsDisabled = 0;
  let sessionsKilled = 0;
  let trustLevelUpdated = 0;
  let adminUpdated = 0;

  try {
    const statusMap = await fetchAllUserStatuses();

    const localUsers = await db.user.findMany({
      select: { id: true, externalId: true, username: true, isBanned: true, isSuspended: true, trustLevel: true, isAdmin: true, isModerator: true }
    });

    for (const lu of localUsers) {
      checked++;
      const remote = statusMap.get(lu.externalId);
      if (!remote) continue;

      const isBanned = remote.silenced || remote.suspended;
      const updates: any = {};

      // 自动识别用户等级
      if (lu.trustLevel !== remote.trustLevel) {
        updates.trustLevel = remote.trustLevel;
        trustLevelUpdated++;
      }

      // 自动更新管理员状态
      if (lu.isAdmin !== remote.admin) {
        updates.isAdmin = remote.admin;
        adminUpdated++;
      }

      // 自动更新版主状态
      if (lu.isModerator !== remote.moderator) {
        updates.isModerator = remote.moderator;
      }

      // 封禁状态
      if (lu.isBanned !== isBanned) {
        updates.isBanned = isBanned;
      }
      if (lu.isSuspended !== remote.suspended) {
        updates.isSuspended = remote.suspended;
      }

      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: lu.id }, data: updates });
      }

      // 新封禁用户 → 停用应用 + 清理会话
      if (isBanned && !lu.isBanned) {
        bannedCount++;
        const r = await db.application.updateMany({
          where: { ownerId: lu.id, status: { not: "disabled" } },
          data: { status: "disabled" },
        });
        appsDisabled += r.count;
        const sk = await db.session.deleteMany({ where: { userId: lu.id } });
        sessionsKilled += sk.count;
        await logAction({ userId: lu.id, action: "AUTO_BAN_DISABLE", details: `cron: banned, disabled ${r.count} apps, killed ${sk.count} sessions` });
      }

      // 已解封用户 → 恢复标记
      if (!isBanned && lu.isBanned) {
        unbannedCount++;
        await logAction({ userId: lu.id, action: "AUTO_UNBAN", details: `cron: user unbanned` });
      }
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      checked,
      bannedCount,
      unbannedCount,
      appsDisabled,
      sessionsKilled,
      trustLevelUpdated,
      adminUpdated,
    });
  } catch (e: any) {
    console.error("[cron] check-banned error:", e);
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
