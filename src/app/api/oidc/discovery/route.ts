import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/oidc/discovery
 * OpenID Connect Discovery document.
 */
export async function GET() {
  const base = process.env.BASE_URL || "http://localhost:3000";
  const doc = {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    userinfo_endpoint: `${base}/api/oauth/userinfo`,
    jwks_uri: `${base}/api/oidc/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["HS256"],
    scopes_supported: ["openid", "profile", "email"],
    token_endpoint_auth_methods_supported: ["client_secret_basic", "client_secret_post"],
    claims_supported: [
      "sub",
      "name",
      "preferred_username",
      "email",
      "email_verified",
      "picture",
      "trust_level",
      "is_admin",
      "is_moderator",
    ],
    code_challenge_methods_supported: [],
  };
  return NextResponse.json(doc);
}
