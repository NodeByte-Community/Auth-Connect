import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings, updateSettings } from "@/lib/settings";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/settings
 */
export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

/**
 * PUT /api/admin/settings
 */
export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await requireAdmin();
  } catch {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }
  const body = await req.json();
  const allowed: (keyof typeof body)[] = [
    "maxAppsPerUser",
    "minTrustLevel",
    "notifyOnSubmit",
    "notifyOnApprove",
    "notifyOnReject",
    "notifyOnFail",
    "sessionTimeoutMin",
  ];
  const data: any = {};
  for (const k of allowed) {
    if (k in body) data[k] = body[k];
  }
  const updated = await updateSettings(data);
  await logAction({ userId: session.user.id, action: "ADMIN_SETTINGS_UPDATE", details: JSON.stringify(data) });
  return NextResponse.json({ settings: updated });
}
