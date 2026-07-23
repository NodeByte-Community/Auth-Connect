import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Returns current logged-in user info (or loggedIn=false).
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ loggedIn: false, user: null });
  }
  return NextResponse.json({
    loggedIn: true,
    user: session.user,
    pendingAuthorize: session.pendingAuthorize,
  });
}
