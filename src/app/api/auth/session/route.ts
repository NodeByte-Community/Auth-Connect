import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/session
 * Returns current logged-in user info (or loggedIn=false).
 * Does NOT return pendingAuthorize - that is handled server-side in callback.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ loggedIn: false, user: null });
    }
    return NextResponse.json({
      loggedIn: true,
      user: session.user,
    });
  } catch (e) {
    console.error("[session] getSession error:", e);
    return NextResponse.json({ loggedIn: false, user: null });
  }
}
