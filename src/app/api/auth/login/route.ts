import { NextRequest, NextResponse } from "next/server";
import { encodePayload, generateNonce, signPayload } from "@/lib/sso";

export const dynamic = "force-dynamic";

/**
 * GET /api/auth/login
 * Initiates NodeByte SSO login flow.
 * Optional query: ?return_to=<url> - where to go after login (e.g. oauth authorize URL)
 */
export async function GET(req: NextRequest) {
  const returnUrl = req.nextUrl.searchParams.get("return_to");
  const base = process.env.BASE_URL || "http://localhost:3000";
  const secret = process.env.DISCOURSE_CONNECT_SECRET || "";

  const callbackUrl = `${base}/api/auth/callback`;
  const nonce = generateNonce();

  const payload = encodePayload({
    nonce,
    return_sso_url: returnUrl
      ? `${callbackUrl}?return_to=${encodeURIComponent(returnUrl)}`
      : callbackUrl,
  });
  const sig = signPayload(payload, secret);

  const discourseUrl = process.env.DISCOURSE_CONNECT_URL || "";
  const redirect = `${discourseUrl}?sso=${encodeURIComponent(payload)}&sig=${sig}`;

  return NextResponse.redirect(redirect);
}
