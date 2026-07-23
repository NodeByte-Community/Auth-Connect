import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { fetchAllUserStatuses } from "@/lib/discourse";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/admin/check-banned
 * Admin endpoint to manually trigger banned user check.
 * Same logic as /api/cron/check-banned but requires admin session.
 */
export async function POST() {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const startedAt = Date.now();
  let checked = 0;
  let bannedCount = 0;
  let appsDisabled = 0;
  let sessionsKilled = 0;

  try {
    const statusMap = await fetchAllUserStatuses();
    const localUsers = await db.user.findMany({ select: { id: true, externalId: true, isBanned: true, isSuspended: true, trustLevel: true, isAdmin: true } });

    for (const lu of localUsers) {
      checked++;
      const remote = statusMap.get(lu.externalId);
      if (!remote) continue;

      const isBanned = remote.silenced || remote.suspended;
      const updates: any = {};
      if (lu.trustLevel !== remote.trustLevel) updates.trustLevel = remote.trustLevel;
      if (lu.isAdmin !== remote.admin) updates.isAdmin = remote.admin;
      if (lu.isBanned !== isBanned) updates.isBanned = isBanned;
      if (lu.isSuspended !== remote.suspended) updates.isSuspended = remote.suspended;

      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: lu.id }, data: updates });
      }

      if (isBanned && !lu.isBanned) {
        bannedCount++;
        const r = await db.application.updateMany({
          where: { ownerId: lu.id, status: { not: "disabled" } },
          data: { status: "disabled" },
        });
        appsDisabled += r.count;
        const sk = await db.session.deleteMany({ where: { userId: lu.id } });
        sessionsKilled += sk.count;
        await logAction({ userId: lu.id, action: "AUTO_BAN_DISABLE", details: `manual trigger by ${session.user.username}, disabled ${r.count} apps` });
      }
    }

    return NextResponse.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      checked,
      bannedCount,
      appsDisabled,
      sessionsKilled,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
