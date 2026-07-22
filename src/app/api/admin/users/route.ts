import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users?q=&page=&pageSize=
 * List all users with main info. Search by username/email.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize") || 20)));

  const where: any = {};
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
      { name: { contains: q } },
    ];
  }

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        externalId: true,
        username: true,
        name: true,
        email: true,
        avatarUrl: true,
        trustLevel: true,
        isAdmin: true,
        isModerator: true,
        isBanned: true,
        isSuspended: true,
        appSubmitBlocked: true,
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { applications: true } },
      },
    }),
    db.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, pageSize });
}

/**
 * POST /api/admin/users
 * Batch user operations.
 * Body: { ids: [...], action: "block_submit"|"unblock_submit" }
 */
export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json();
  const { ids, action } = body as { ids: string[]; action: string };
  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "ids required" }, { status: 400 });
  }

  let result;
  if (action === "block_submit") {
    result = await db.user.updateMany({ where: { id: { in: ids } }, data: { appSubmitBlocked: true } });
    await logAction({ userId: session.user.id, action: "ADMIN_USER_BLOCK_SUBMIT", details: `ids: ${ids.join(",")}` });
  } else if (action === "unblock_submit") {
    result = await db.user.updateMany({ where: { id: { in: ids } }, data: { appSubmitBlocked: false } });
    await logAction({ userId: session.user.id, action: "ADMIN_USER_UNBLOCK_SUBMIT", details: `ids: ${ids.join(",")}` });
  } else if (action === "disable_apps") {
    // disable all apps for given users
    result = await db.application.updateMany({ where: { ownerId: { in: ids } }, data: { status: "disabled" } });
    await logAction({ userId: session.user.id, action: "ADMIN_USER_DISABLE_APPS", details: `user ids: ${ids.join(",")}` });
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  return NextResponse.json({ affected: result.count });
}
