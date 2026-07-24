import { NextResponse } from "next/server";
import { getSession, clearPendingAuthorize } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Returns current logged-in user info (or loggedIn=false).
 * If pendingAuthorize exists, return it AND clear it from DB (one-time use).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false, user: null, pendingAuthorize: null });
  }

  // One-time: if pendingAuthorize exists, return it and clear from DB
  let pendingAuthorize = session.pendingAuthorize;
  if (pendingAuthorize) {
    // Clear it immediately so next request won't return it (prevents infinite redirect loop)
    await clearPendingAuthorize(session.sessionToken).catch(() => {});
  }

  return NextResponse.json({
    loggedIn: true,
    user: session.user,
    pendingAuthorize,
  });
}
