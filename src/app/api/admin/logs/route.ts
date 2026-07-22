import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/logs?q=&range=&start=&end=&page=&pageSize=&export=
 * User logs with time range filter, search, sort.
 * range: today|yesterday|7days|all|custom
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const range = sp.get("range") || "all";
  const start = sp.get("start");
  const end = sp.get("end");
  const isExport = sp.get("export") === "1";
  const page = Math.max(1, Number(sp.get("page") || 1));
  const pageSize = Math.max(1, Math.min(500, Number(sp.get("pageSize") || 50)));

  const now = new Date();
  let startD: Date | undefined;
  let endD: Date | undefined;

  if (range === "today") {
    startD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === "yesterday") {
    startD = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    endD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === "7days") {
    startD = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  } else if (range === "custom") {
    if (start) startD = new Date(start);
    if (end) endD = new Date(end + "T23:59:59");
  }

  const where: any = {};
  if (q) {
    where.OR = [
      { action: { contains: q } },
      { details: { contains: q } },
      { user: { username: { contains: q } } },
    ];
  }
  if (startD || endD) {
    where.createdAt = {};
    if (startD) where.createdAt.gte = startD;
    if (endD) where.createdAt.lte = endD;
  }

  if (isExport) {
    const logs = await db.userLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 10000,
    });
    const csvHeader = "时间,用户,动作,详情,IP\n";
    const csvBody = logs.map((l) => {
      const time = l.createdAt.toISOString();
      const user = l.user?.username || "system";
      const action = (l.action || "").replace(/"/g, '""');
      const details = (l.details || "").replace(/"/g, '""').replace(/\n/g, " ");
      const ip = (l.ip || "").replace(/"/g, '""');
      return `"${time}","${user}","${action}","${details}","${ip}"`;
    }).join("\n");
    return new NextResponse("\ufeff" + csvHeader + csvBody, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="nbconnect-logs-${Date.now()}.csv"`,
      },
    });
  }

  const [logs, total] = await Promise.all([
    db.userLog.findMany({
      where,
      include: { user: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.userLog.count({ where }),
  ]);

  return NextResponse.json({ logs, total, page, pageSize });
}

/**
 * DELETE /api/admin/logs
 * Clear all logs.
 */
export async function DELETE(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  await db.userLog.deleteMany({});
  await logAction({ userId: session.user.id, action: "ADMIN_LOGS_CLEAR" });
  return NextResponse.json({ ok: true });
}
