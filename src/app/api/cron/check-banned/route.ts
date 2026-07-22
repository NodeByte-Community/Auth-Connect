import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchAllUserStatuses } from "@/lib/discourse";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/check-banned?key=
 * Periodic job (every 5 min):
 *  - Fetches ALL Discourse user statuses in batch (NOT one-by-one)
 *  - For each local user: if banned/suspended in Discourse -> mark local + disable ALL their apps + kill sessions
 *  - Also refreshes trust_level + admin status
 *
 * Guarded by a shared key from env (CRON_KEY) or the DISCOURSE_API_KEY.
 *
 * Better solution note: we batch-fetch the full user list ONCE rather than per-user
 * calls, which is O(1) Discourse API calls (paginated) vs O(N). For very large sites
 * we could further optimize by caching the ETag / only fetching deltas, but the
 * current approach is already far cheaper than per-user polling.
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
  let appsDisabled = 0;
  let sessionsKilled = 0;

  try {
    const statusMap = await fetchAllUserStatuses();

    // Get all local users
    const localUsers = await db.user.findMany({ select: { id: true, externalId: true, isBanned: true, isSuspended: true, trustLevel: true, isAdmin: true } });

    for (const lu of localUsers) {
      checked++;
      const remote = statusMap.get(lu.externalId);
      if (!remote) continue; // user may have been deleted; skip silently

      const isBanned = remote.silenced || remote.suspended;
      const updates: any = {};
      if (lu.trustLevel !== remote.trustLevel) updates.trustLevel = remote.trustLevel;
      if (lu.isAdmin !== remote.admin) updates.isAdmin = remote.admin;
      if (lu.isBanned !== isBanned) updates.isBanned = isBanned;
      if (lu.isSuspended !== remote.suspended) updates.isSuspended = remote.suspended;

      if (Object.keys(updates).length > 0) {
        await db.user.update({ where: { id: lu.id }, data: updates });
      }

      // If banned -> disable all apps + kill sessions (only if not already banned)
      if (isBanned && !lu.isBanned) {
        bannedCount++;
        const r = await db.application.updateMany({
          where: { ownerId: lu.id, status: { not: "disabled" } },
          data: { status: "disabled" },
        });
        appsDisabled += r.count;
        const sk = await db.session.deleteMany({ where: { userId: lu.id } });
        sessionsKilled += sk.count;
        await logAction({ userId: lu.id, action: "AUTO_BAN_DISABLE", details: `banned by cron, disabled ${r.count} apps` });
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
    console.error("[cron] check-banned error:", e);
    return NextResponse.json({ ok: false, error: e.message, durationMs: Date.now() - startedAt }, { status: 500 });
  }
}
