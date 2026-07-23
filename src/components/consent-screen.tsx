"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShieldCheck, X, Check, Lock, Mail, User, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export function ConsentScreen() {
  const sp = useSearchParams();
  const router = useRouter();
  const [app, setApp] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const client_id = sp.get("client_id") || "";
  const redirect_uri = sp.get("redirect_uri") || "";
  const scope = sp.get("scope") || "";
  const state = sp.get("state") || "";
  const nonce = sp.get("nonce") || "";

  useEffect(() => {
    (async () => {
      // Fetch app info (we need a public endpoint; reuse apps list isn't right).
      // We'll call a dedicated public app-info endpoint.
      try {
        const res = await fetch(`/api/oauth/appinfo?client_id=${encodeURIComponent(client_id)}&redirect_uri=${encodeURIComponent(redirect_uri)}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "应用信息获取失败");
          return;
        }
        setApp(data.app);
      } catch {
        toast.error("网络错误");
      } finally {
        setLoading(false);
      }
    })();
  }, [client_id, redirect_uri]);

  const handleAction = async (action: "approve" | "deny") => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/oauth/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id, redirect_uri, scope, state, nonce, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "操作失败");
        setSubmitting(false);
        return;
      }
      // redirect to callback
      window.location.href = data.redirect;
    } catch {
      toast.error("网络错误");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-4">
        <Card className="max-w-md w-full p-6 text-center">
          <X className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <p className="text-slate-700 font-semibold">无法加载授权信息</p>
          <p className="text-sm text-slate-500 mt-1">应用不存在或回调地址不匹配。</p>
          <Button className="mt-4" variant="outline" onClick={() => router.push("/")}>返回首页</Button>
        </Card>
      </div>
    );
  }

  const scopes = scope.split(/\s+/).filter(Boolean);
  const scopeInfo: Record<string, { icon: any; label: string; desc: string }> = {
    openid: { icon: ShieldCheck, label: "OpenID 身份", desc: "获取您的唯一身份标识" },
    profile: { icon: User, label: "个人资料", desc: "用户名、显示名、头像、社区等级" },
    email: { icon: Mail, label: "邮箱地址", desc: "读取您的邮箱" },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-teal-50 flex flex-col">
      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-6 shadow-xl">
          <div className="text-center mb-5">
            <div className="w-16 h-16 rounded-2xl bg-white border mx-auto flex items-center justify-center overflow-hidden shadow-sm">
              {app.siteLogo || app.icon ? (
                <img src={app.siteLogo || app.icon} alt="" className="w-full h-full object-contain" />
              ) : (
                <ImageIcon className="w-7 h-7 text-slate-300" />
              )}
            </div>
            <h1 className="text-lg font-bold mt-3 text-slate-800">{app.name}</h1>
            <p className="text-xs text-slate-500 mt-1">请求访问您的 NodeByte Connect 账户</p>
          </div>

          <div className="rounded-lg border bg-slate-50 p-3 mb-4">
            <p className="text-xs text-slate-500 mb-1">应用描述</p>
            <p className="text-sm text-slate-700">{app.description}</p>
          </div>

          <div className="space-y-2 mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">该网站将获取以下权限：</p>
            {scopes.length === 0 && <p className="text-sm text-slate-400">无权限请求</p>}
            {scopes.map((s) => {
              const info = scopeInfo[s];
              if (!info) return null;
              const Icon = info.icon;
              return (
                <div key={s} className="flex items-start gap-3 p-2 rounded-lg border bg-white">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-slate-800">{info.label}</div>
                    <div className="text-xs text-slate-500">{info.desc}</div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-start gap-2 text-xs text-slate-600 mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-slate-700">授权后将跳转至：</p>
              <p className="font-mono font-bold text-amber-700 break-all mt-0.5">{new URL(redirect_uri).hostname}</p>
              <p className="text-[10px] text-slate-400 mt-1">请确认您信任此站点，授权后将分享您的账户信息</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 h-11" onClick={() => handleAction("deny")} disabled={submitting}>
              <X className="w-4 h-4 mr-1" /> 拒绝
            </Button>
            <Button className="flex-1 h-11 bg-teal-600 hover:bg-teal-700" onClick={() => handleAction("approve")} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Check className="w-4 h-4 mr-1" />}
              同意授权
            </Button>
          </div>
        </Card>
      </main>
      <footer className="border-t bg-white py-3 text-center text-xs text-slate-400">
        NodeByte Connect · 安全授权
      </footer>
    </div>
  );
}
