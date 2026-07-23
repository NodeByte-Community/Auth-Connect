import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/apps?q=&status=&type=&page=&pageSize=
 * List ALL applications (admin only). Search by app name or owner username.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const status = sp.get("status") || "";
  const type = sp.get("type") || "";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.max(1, Math.min(100, Number(sp.get("pageSize") || 20)));

  const where: any = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { appId: { contains: q } },
      { owner: { username: { contains: q } } },
    ];
  }

  const [apps, total] = await Promise.all([
    db.application.findMany({
      where,
      include: { owner: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.application.count({ where }),
  ]);

  return NextResponse.json({ apps, total, page, pageSize });
}

/**
 * POST /api/admin/apps
 * Batch operations on applications.
 * Body: { ids: [...], action: "enable"|"disable"|"delete" }
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
  if (action === "enable") {
    result = await db.application.updateMany({ where: { id: { in: ids } }, data: { status: "approved" } });
    await logAction({ userId: session.user.id, action: "ADMIN_APP_ENABLE", details: `ids: ${ids.join(",")}` });
  } else if (action === "disable") {
    result = await db.application.updateMany({ where: { id: { in: ids } }, data: { status: "disabled" } });
    await logAction({ userId: session.user.id, action: "ADMIN_APP_DISABLE", details: `ids: ${ids.join(",")}` });
  } else if (action === "delete") {
    result = await db.application.deleteMany({ where: { id: { in: ids } } });
    await logAction({ userId: session.user.id, action: "ADMIN_APP_DELETE", details: `ids: ${ids.join(",")}` });
  } else {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  return NextResponse.json({ affected: result.count });
}
