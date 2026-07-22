import { db } from "@/lib/db";

/**
 * User activity logging.
 */
export async function logAction(params: {
  userId?: string;
  action: string;
  details?: string;
  ip?: string;
}) {
  try {
    await db.userLog.create({
      data: {
        userId: params.userId || null,
        action: params.action,
        details: params.details || null,
        ip: params.ip || null,
      },
    });
  } catch (e) {
    console.error("[log] failed to log action:", e);
  }
}
