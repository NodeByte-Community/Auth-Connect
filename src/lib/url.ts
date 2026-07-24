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

/**
 * 校验 redirect_uri 的域名是否在预注册的回调地址列表中。
 *
 * 匹配规则：只检查协议+域名+端口，不检查路径后缀（/callback, /api 等）。
 * 例如：
 *   注册: https://example.com/callback
 *   允许: https://example.com/callback, https://example.com/api/auth,
 *         https://example.com/login/callback2 等（同域名任意路径）
 *   拒绝: https://evil.com/callback（域名不匹配）
 *         http://example.com/callback（协议不匹配，如注册的是https）
 *
 * @param redirectUri - 用户传入的回调地址
 * @param allowedUrls - 应用预注册的回调地址列表（换行分隔，已trim）
 * @returns { ok: boolean, error?: string, matchedDomain?: string }
 */
export function validateRedirectUriDomain(
  redirectUri: string,
  allowedUrls: string[]
): { ok: boolean; error?: string; matchedDomain?: string } {
  if (!redirectUri) {
    return { ok: false, error: "回调地址不能为空" };
  }

  // 解析用户传入的 redirect_uri
  let requestUrl: URL;
  try {
    requestUrl = new URL(redirectUri);
  } catch {
    return { ok: false, error: "回调地址格式无效" };
  }

  const requestOrigin = `${requestUrl.protocol}//${requestUrl.host}`;

  // 遍历预注册的回调地址，检查域名是否匹配
  for (const allowed of allowedUrls) {
    if (!allowed) continue;
    try {
      const allowedUrl = new URL(allowed);
      const allowedOrigin = `${allowedUrl.protocol}//${allowedUrl.host}`;

      // 协议 + 域名 + 端口 完全匹配
      if (requestOrigin === allowedOrigin) {
        return { ok: true, matchedDomain: requestUrl.hostname };
      }
    } catch {
      // 预注册的URL格式无效，跳过
      continue;
    }
  }

  // 收集所有预注册的域名用于错误提示
  const registeredDomains = allowedUrls
    .map((u) => {
      try {
        return new URL(u).hostname;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i); // 去重

  return {
    ok: false,
    error: `回调地址域名不匹配。请求域名: ${requestUrl.hostname}，已注册域名: ${registeredDomains.join(", ") || "无"}`,
  };
}

