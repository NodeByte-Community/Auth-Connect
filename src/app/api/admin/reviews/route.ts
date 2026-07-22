import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/logs";
import { sendDiscoursePM } from "@/lib/discourse";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/reviews?q=&status=&page=&pageSize=
 * Review queue. Search by app name or owner username. Sort by time.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const status = sp.get("status") || "pending";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize") || 20)));

  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { app: { name: { contains: q } } },
      { app: { owner: { username: { contains: q } } } },
    ];
  }

  const [reviews, total] = await Promise.all([
    db.appReview.findMany({
      where,
      include: { app: { include: { owner: true } }, reviewer: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.appReview.count({ where }),
  ]);

  // Count pending for red-dot indicator
  const pendingCount = await db.appReview.count({ where: { status: "pending" } });

  return NextResponse.json({ reviews, total, page, pageSize, pendingCount });
}

/**
 * POST /api/admin/reviews
 * Review actions.
 * Body:
 *  { action: "approve"|"reject"|"clear", ids: [...], reason?: "..." }
 *  approve/reject operate on given review ids; clear removes them.
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const { action, ids, reason } = body as { action: string; ids: string[]; reason?: string };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  const settings = await getSettings();
  const reviews = await db.appReview.findMany({
    where: { id: { in: ids } },
    include: { app: { include: { owner: true } } },
  });

  if (action === "approve") {
    for (const r of reviews) {
      await db.appReview.update({ where: { id: r.id }, data: { status: "approved", reviewerId: session.user.id, reviewedAt: new Date(), reason: null } });
      await db.application.update({ where: { id: r.appId }, data: { status: "approved", reviewedAt: new Date(), reviewerId: session.user.id, rejectReason: null } });
      await logAction({ userId: session.user.id, action: "ADMIN_REVIEW_APPROVE", details: `App: ${r.app.name}` });
      if (settings.notifyOnApprove) {
        await sendDiscoursePM(r.app.owner.username, "[NodeByte Connect] 应用审核通过", `您的应用 **${r.app.name}** 已通过审核，现在可以接入使用了。`).catch(() => {});
      }
    }
  } else if (action === "reject") {
    for (const r of reviews) {
      await db.appReview.update({ where: { id: r.id }, data: { status: "rejected", reviewerId: session.user.id, reviewedAt: new Date(), reason: reason || "未提供理由" } });
      await db.application.update({ where: { id: r.appId }, data: { status: "rejected", rejectReason: reason || "未提供理由" } });
      await logAction({ userId: session.user.id, action: "ADMIN_REVIEW_REJECT", details: `App: ${r.app.name}, reason: ${reason}` });
      if (settings.notifyOnReject) {
        await sendDiscoursePM(r.app.owner.username, "[NodeByte Connect] 应用审核未通过", `您的应用 **${r.app.name}** 未通过审核。\n\n理由: ${reason || "未提供理由"}\n\n请修改后重新提交。`).catch(() => {});
      }
    }
  } else if (action === "clear") {
    await db.appReview.deleteMany({ where: { id: { in: ids } } });
    await logAction({ userId: session.user.id, action: "ADMIN_REVIEW_CLEAR", details: `cleared ${ids.length} reviews` });
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  return NextResponse.json({ ok: true, affected: reviews.length });
}
