"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ConnectDashboard } from "@/components/connect-dashboard";
import { ConsentScreen } from "@/components/consent-screen";
import { AdminPanel } from "@/components/admin-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn, Shield } from "lucide-react";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

function HomeInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, loading, refreshSession } = useAppStore();
  const [booted, setBooted] = useState(false);
  const [redirecting, setRedirecting] = useState(false);

  const view = sp.get("view");
  const isAdminRoute = sp.get("admin") === "1";

  useEffect(() => {
    (async () => {
      await refreshSession();
      setBooted(true);
    })();
  }, [refreshSession]);

  useEffect(() => {
    if (!booted || loading) return;
    if (!user && !DEV_MODE) {
      // Production: auto-redirect to Discourse login
      const returnUrl = window.location.pathname + window.location.search;
      window.location.href = `/api/auth/login?return_to=${encodeURIComponent(returnUrl)}`;
      setRedirecting(true);
    }
  }, [booted, loading, user]);

  if (!booted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!user) {
    if (DEV_MODE) {
      // Dev login page
      return <DevLoginPage />;
    }
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        <p className="text-slate-500 text-sm">正在跳转至社区登录...</p>
      </div>
    );
  }

  if (view === "authorize") {
    return <ConsentScreen />;
  }

  if (isAdminRoute && user.isAdmin) {
    return <AdminPanel />;
  }

  return <ConnectDashboard />;
}

function DevLoginPage() {
  const sp = useSearchParams();
  const returnUrl = sp.get("return_to") || "/";
  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 shadow-xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black tracking-tight">
            <span className="bg-gradient-to-r from-rose-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">Node</span>
            <span className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 bg-clip-text text-transparent">Byte</span>
            <span className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">Connect</span>
          </h1>
          <p className="text-sm text-slate-500 mt-2">统一身份认证系统 · 开发模式</p>
        </div>
        <div className="space-y-3">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
            当前为开发模式（未配置真实 Discourse Connect 密钥）。生产环境会自动跳转至 Discourse 社区登录。
          </div>
          <Button className="w-full" onClick={() => { window.location.href = `/api/auth/dev-login?return_to=${encodeURIComponent(returnUrl)}`; }}>
            <LogIn className="w-4 h-4 mr-2" /> 以普通用户登录 (Trust Level 2)
          </Button>
          <Button className="w-full" variant="outline" onClick={() => { window.location.href = `/api/auth/dev-login?admin=1&return_to=${encodeURIComponent(returnUrl)}`; }}>
            <Shield className="w-4 h-4 mr-2" /> 以管理员登录 (Trust Level 4)
          </Button>
        </div>
        <p className="text-xs text-slate-400 text-center mt-6">
          配置 .env 中的 DISCOURSE_CONNECT_SECRET 后将启用真实 SSO
        </p>
      </Card>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="h-8 w-8 animate-spin text-teal-600" /></div>}>
      <HomeInner />
    </Suspense>
  );
}
