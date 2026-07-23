import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

/**
 * POST /api/apps/[id]/health-check
 * Test if the first callback URL of an application is reachable.
 * Returns: { url, status, responseTimeMs, ok }
 *
 * We do a HEAD request (fallback to GET) with a 5s timeout.
 * This is a best-effort check - we don't follow redirects to auth pages.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });

  const { id } = await params;
  const app = await db.application.findFirst({ where: { id, ownerId: session.user.id } });
  if (!app) return NextResponse.json({ error: "应用不存在" }, { status: 404 });

  const urls = app.callbackUrls.split("\n").map((s) => s.trim()).filter(Boolean);
  if (urls.length === 0) {
    return NextResponse.json({ error: "未配置回调地址" }, { status: 400 });
  }

  const results = await Promise.all(urls.map(async (url) => {
    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      // Try HEAD first, fallback to GET
      let res: Response;
      try {
        res = await fetch(url, { method: "HEAD", signal: controller.signal, redirect: "manual" });
      } catch {
        res = await fetch(url, { method: "GET", signal: controller.signal, redirect: "manual" });
      }
      clearTimeout(timeout);
      const elapsed = Date.now() - start;
      return {
        url,
        status: res.status,
        responseTimeMs: elapsed,
        ok: res.status > 0 && res.status < 500,
        note: res.status === 0 || (res.status >= 300 && res.status < 400) ? "重定向/需认证（可能正常）" : undefined,
      };
    } catch (e: any) {
      const elapsed = Date.now() - start;
      return {
        url,
        status: 0,
        responseTimeMs: elapsed,
        ok: false,
        error: e.name === "AbortError" ? "超时（5s）" : (e.message || "连接失败"),
      };
    }
  }));

  await logAction({ userId: session.user.id, action: "APP_HEALTH_CHECK", details: `App: ${app.name}, results: ${JSON.stringify(results.map(r => ({ ok: r.ok, status: r.status })))}` });

  return NextResponse.json({ results });
}
