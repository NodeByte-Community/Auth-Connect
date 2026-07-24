/**
 * Get the proper base URL for redirects.
 * Priority: BASE_URL env > x-forwarded headers > request origin.
 * Fixes 0.0.0.0 redirect issue when server binds to 0.0.0.0.
 */
export function getBaseUrl(req?: any): string {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  if (req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "http";
    const host = req.headers?.get?.("x-forwarded-host") || req.headers?.get?.("host");
    if (host && !host.startsWith("0.0.0.0")) {
      return `${proto}://${host}`;
    }
  }
  return "http://localhost:3000";
}

/**
 * Get favicon URL for a given domain.
 * Uses the site's own /favicon.ico (no third-party service).
 */
export function getFaviconUrl(callbackUrl: string): string | null {
  try {
    const url = new URL(callbackUrl);
    return `${url.origin}/favicon.ico`;
  } catch {
    return null;
  }
}
