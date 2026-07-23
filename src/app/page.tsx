"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ConnectDashboard } from "@/components/connect-dashboard";
import { ConsentScreen } from "@/components/consent-screen";
import { AdminPanel } from "@/components/admin-panel";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, LogIn, ShieldCheck, ArrowRight } from "lucide-react";

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

  const handleLogin = () => {
    const returnUrl = window.location.pathname + window.location.search;
    setRedirecting(true);
    window.location.href = `/api/auth/login?return_to=${encodeURIComponent(returnUrl)}`;
  };

  if (!booted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  // Not logged in: show branded login page with single login button
  if (!user) {
    return <LoginPage onLogin={handleLogin} redirecting={redirecting} />;
  }

  if (view === "authorize") {
    return <ConsentScreen />;
  }

  // Admin route: only accessible if user is admin
  if (isAdminRoute) {
    if (user.isAdmin) {
      return <AdminPanel />;
    }
    // Non-admin trying to access admin route: redirect to dashboard
    return <ConnectDashboard />;
  }

  return <ConnectDashboard />;
}

function LoginPage({ onLogin, redirecting }: { onLogin: () => void; redirecting: boolean }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-rose-50 via-amber-50 to-teal-50 flex items-center justify-center p-4">
      {/* Decorative blobs */}
      <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-gradient-to-br from-rose-200/50 to-fuchsia-200/40 blur-3xl" />
      <div className="absolute -bottom-32 right-0 w-96 h-96 rounded-full bg-gradient-to-br from-teal-200/50 to-emerald-200/40 blur-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-gradient-to-br from-amber-200/40 to-orange-200/30 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)", backgroundSize: "24px 24px" }} />

      <Card className="relative max-w-md w-full p-10 shadow-2xl border-white/60 bg-white/80 backdrop-blur-sm">
        {/* Brand */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-1.5 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 via-fuchsia-500 to-teal-500 flex items-center justify-center shadow-lg">
              <span className="text-white font-black text-2xl">N</span>
            </div>
          </div>
          <h1 className="text-4xl font-black tracking-tight leading-none drop-shadow-sm">
            <span className="inline-block bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Node</span>
            <span className="inline-block bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">Byte</span>
            <span className="inline-block ml-2 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">Connect</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <span className="text-xl font-black bg-gradient-to-br from-rose-700 via-fuchsia-700 to-teal-700 bg-clip-text text-transparent">C</span>
            <span className="text-xs text-slate-500 font-semibold tracking-[0.3em]">ONNECT · 统一身份认证</span>
          </div>
          <p className="text-sm text-slate-500 mt-4">基于 Discourse Connect 的统一身份认证系统</p>
        </div>

        {/* Features badges */}
        <div className="flex items-center justify-center gap-2 mb-8 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            <ShieldCheck className="w-3 h-3" /> OIDC
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200">
            <ShieldCheck className="w-3 h-3" /> OAuth 2.0
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <ShieldCheck className="w-3 h-3" /> Discourse SSO
          </span>
        </div>

        {/* Single login button */}
        <Button
          className="w-full h-12 text-base bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 shadow-lg"
          onClick={onLogin}
          disabled={redirecting}
        >
          {redirecting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> 正在跳转...
            </>
          ) : (
            <>
              <LogIn className="w-5 h-5 mr-2" /> 使用社区账号登录
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        <p className="text-xs text-slate-400 text-center mt-6">
          登录后将跳转至 Discourse 社区完成身份验证
        </p>
      </Card>

      {/* Footer */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-slate-400">
        © NodeByte Connect · 统一身份认证系统
      </div>
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
