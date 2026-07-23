import { NextRequest, NextResponse } from "next/server";
import { destroySession, getSession, getSessionCookieName } from "@/lib/auth";
import { logAction } from "@/lib/logs";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (session) {
    await logAction({ userId: session.user.id, action: "LOGOUT", ip: req.headers.get("x-forwarded-for") || undefined });
  }
  await destroySession();
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(getSessionCookieName());
  return res;
}

export async function GET(req: NextRequest) {
  await destroySession();
  const res = NextResponse.redirect(new URL("/", req.nextUrl.origin));
  res.cookies.delete(getSessionCookieName());
  return res;
}
