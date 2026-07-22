import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/oidc/jwks
 * JWKS endpoint. We use HS256 (symmetric, client_secret-based), so we return an empty keys set.
 */
export async function GET() {
  return NextResponse.json({ keys: [] });
}
