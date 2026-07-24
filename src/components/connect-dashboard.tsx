"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { ConnectBanner } from "@/components/connect-banner";
import { PersonalCenter } from "@/components/personal-center";
import { ApplyAppDialog } from "@/components/apply-app-dialog";
import { AppDetailDialog } from "@/components/app-detail-dialog";
import { SessionManager } from "@/components/session-manager";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, UserCircle, Plus, Shield, RefreshCw, Loader2, ExternalLink, AlertCircle, MonitorSmartphone, Copy, Activity, TrendingUp } from "lucide-react";

interface AppItem {
  id: string;
  appId: string;
  name: string;
  icon: string | null;
  description: string;
  type: string;
  callbackUrls: string;
  status: string;
  rejectReason: string | null;
  siteLogo: string | null;
  scopes: string;
  createdAt: string;
}

export function ConnectDashboard() {
  const router = useRouter();
  const { user } = useAppStore();
  const [pcOpen, setPcOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [apps, setApps] = useState<AppItem[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [minTrustLevel, setMinTrustLevel] = useState(1);

  const fetchApps = async () => {
    setLoadingApps(true);
    try {
      const res = await fetch("/api/apps");
      const data = await res.json();
      setApps(data.apps || []);
    } catch {
      toast.error("加载应用列表失败");
    } finally {
      setLoadingApps(false);
    }
  };

  useEffect(() => {
    fetchApps();
    if (user?.isAdmin) {
      fetch("/api/admin/settings").then(r => r.json()).then(d => setMinTrustLevel(d.settings?.minTrustLevel ?? 1)).catch(() => {});
    }
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已退出登录");
    setTimeout(() => { window.location.href = "/"; }, 300);
  };

  const handleAvatarClick = () => setPcOpen(true);

  const openApp = (a: AppItem) => {
    setSelectedApp(a);
    setDetailOpen(true);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 space-y-6">
        <ConnectBanner user={user} onAvatarClick={handleAvatarClick} />

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setPcOpen(true)} className="flex-1 sm:flex-none justify-center">
              <UserCircle className="w-4 h-4 sm:mr-1" /> <span className="sm:inline">个人中心</span>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setSessionOpen(true)} className="flex-1 sm:flex-none justify-center">
              <MonitorSmartphone className="w-4 h-4 sm:mr-1" /> <span className="sm:inline">会话</span>
            </Button>
            <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700 flex-1 sm:flex-none justify-center" onClick={handleLogout}>
              <LogOut className="w-4 h-4 sm:mr-1" /> <span className="sm:inline">退出</span>
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {user.isAdmin && (
              <Button variant="outline" size="sm" onClick={() => router.push("/?admin=1")} className="flex-1 sm:flex-none justify-center">
                <Shield className="w-4 h-4 sm:mr-1" /> <span className="sm:inline">后台</span>
              </Button>
            )}
            <Button size="sm" onClick={() => setApplyOpen(true)} className="flex-1 sm:flex-none justify-center">
              <Plus className="w-4 h-4 sm:mr-1" /> <span className="sm:inline">申请应用</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchApps}><RefreshCw className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Level warning */}
        {user.trustLevel < minTrustLevel && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="w-4 h-4" />
            您当前的社区等级为 Trust Level {user.trustLevel}，需达到 Trust Level {minTrustLevel} 才能申请应用。请积极参与社区提升等级。
          </div>
        )}

        {/* Quick stats summary */}
        {!loadingApps && apps.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="应用总数" value={apps.length} icon={<ExternalLink className="w-4 h-4" />} gradient="from-teal-500 to-emerald-500" />
            <StatCard label="已通过" value={apps.filter(a => a.status === "approved").length} icon={<TrendingUp className="w-4 h-4" />} gradient="from-emerald-500 to-green-500" />
            <StatCard label="待审核" value={apps.filter(a => a.status === "pending" || a.status === "pending_re_review").length} icon={<Activity className="w-4 h-4" />} gradient="from-amber-500 to-orange-500" />
            <StatCard label="已拒绝/停用" value={apps.filter(a => a.status === "rejected" || a.status === "disabled").length} icon={<AlertCircle className="w-4 h-4" />} gradient="from-slate-400 to-slate-500" />
          </div>
        )}

        {/* Apps list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">我的应用</h2>
            <Badge variant="secondary">{apps.length} 个</Badge>
          </div>

          {loadingApps ? (
            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : apps.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 border flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-teal-400" />
              </div>
              <p className="text-slate-600 font-medium mb-1">还没有应用</p>
              <p className="text-xs text-slate-400 mb-4">创建你的第一个应用，开始接入 NodeByte SSO</p>
              <Button size="sm" onClick={() => setApplyOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> 申请应用
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {apps.map((a) => (
                <AppCard key={a.id} app={a} onClick={() => openApp(a)} />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t bg-white mt-auto">
        <div className="max-w-6xl mx-auto px-4 py-4 text-center text-xs text-slate-400">
          NodeByte Connect · 统一身份认证系统 · 基于 NodeByte SSO
        </div>
      </footer>

      <PersonalCenter open={pcOpen} onOpenChange={setPcOpen} user={user} />
      <ApplyAppDialog open={applyOpen} onOpenChange={setApplyOpen} onCreated={fetchApps} trustLevel={user.trustLevel} minTrustLevel={minTrustLevel} />
      <AppDetailDialog app={selectedApp} open={detailOpen} onOpenChange={setDetailOpen} onUpdated={fetchApps} onDeleted={fetchApps} />
      <SessionManager open={sessionOpen} onOpenChange={setSessionOpen} />
    </div>
  );
}

function AppCard({ app, onClick }: { app: AppItem; onClick: () => void }) {
  const statusMap: Record<string, { label: string; cls: string; dot: string; accent: string }> = {
    pending: { label: "待审核", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", accent: "from-amber-400 to-orange-400" },
    pending_re_review: { label: "待复审", cls: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-500", accent: "from-amber-400 to-orange-400" },
    approved: { label: "已通过", cls: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", accent: "from-emerald-400 to-teal-400" },
    rejected: { label: "已拒绝", cls: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-500", accent: "from-rose-400 to-fuchsia-400" },
    disabled: { label: "已停用", cls: "bg-slate-100 text-slate-500 border-slate-200", dot: "bg-slate-400", accent: "from-slate-300 to-slate-400" },
  };
  const st = statusMap[app.status] || statusMap.pending;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(app.appId);
    toast.success("APP ID 已复制");
  };

  // Auto-detect favicon from first callback URL if no icon set
  const [imgError, setImgError] = useState(false);
  const iconUrl = app.icon && !imgError
    ? app.icon
    : (() => {
        try {
          const firstCallback = app.callbackUrls.split("\n")[0].trim();
          if (firstCallback) return `https://www.google.com/s2/favicons?domain=${new URL(firstCallback).hostname}&sz=64`;
        } catch {}
        return null;
      })();

  return (
    <Card className={`p-4 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden border-l-0`} onClick={onClick}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${st.accent}`} />
      <div className="flex items-start gap-3 pl-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
          {iconUrl ? (
            <img
              src={iconUrl}
              alt=""
              className="w-full h-full object-contain"
              onError={() => setImgError(true)}
            />
          ) : (
            <ExternalLink className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 truncate group-hover:text-teal-700 transition-colors">{app.name}</span>
            <Badge variant="outline" className={`text-xs shrink-0 ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-1`} />{st.label}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{app.description}</p>
          <div className="flex items-center gap-2 mt-2 min-w-0">
            <Badge variant="secondary" className="text-[10px] uppercase font-mono shrink-0">{app.type}</Badge>
            <span className="text-[10px] text-slate-500 font-mono truncate min-w-0 flex-1">{app.appId}</span>
            <button
              onClick={handleCopyId}
              className="shrink-0 p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-teal-600 transition-colors"
              title="复制 APP ID"
              aria-label="复制 APP ID"
            >
              <Copy className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

function StatCard({ label, value, icon, gradient }: { label: string; value: number; icon: React.ReactNode; gradient: string }) {
  return (
    <Card className="p-3 relative overflow-hidden hover:shadow-md transition-shadow">
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl`} />
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium text-slate-500">{label}</span>
        <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${gradient} text-white flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="text-xl font-black text-slate-800 tabular-nums">{value}</div>
    </Card>
  );
}
