/**
 * Get the proper base URL for redirects.
 * Priority: BASE_URL env > x-forwarded headers > request origin.
 * Fixes 0.0.0.0 redirect issue when server binds to 0.0.0.0.
 */
export function getBaseUrl(req?: any): string {
  // 1. BASE_URL from env (most reliable for production)
  if (process.env.BASE_URL) return process.env.BASE_URL;

  // 2. Try forwarded headers (behind reverse proxy / Caddy)
  if (req) {
    const proto = req.headers?.get?.("x-forwarded-proto") || "http";
    const host = req.headers?.get?.("x-forwarded-host") || req.headers?.get?.("host");
    if (host && !host.startsWith("0.0.0.0")) {
      return `${proto}://${host}`;
    }
  }

  // 3. Fallback
  return "http://localhost:3000";
}

/**
 * Get favicon URL for a given domain (auto-detect logo).
 * Uses Google's favicon service as fallback.
 */
export function getFaviconUrl(callbackUrl: string): string | null {
  try {
    const url = new URL(callbackUrl);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch {
    return null;
  }
}
