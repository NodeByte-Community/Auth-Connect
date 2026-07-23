import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/users/[id]/apps
 * Admin: list all applications owned by a given user.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const { id } = await params;
  const apps = await db.application.findMany({
    where: { ownerId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ apps });
}
