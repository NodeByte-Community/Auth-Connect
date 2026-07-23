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
import { LogOut, UserCircle, Plus, Shield, RefreshCw, Loader2, ExternalLink, AlertCircle, MonitorSmartphone } from "lucide-react";

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
  const { user, pendingAuthorize, refreshSession } = useAppStore();
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
    fetch("/api/admin/settings").then(r => r.json()).then(d => setMinTrustLevel(d.settings?.minTrustLevel ?? 1)).catch(() => {});
  }, []);

  // Pending authorize redirect (came back from Discourse login into authorize flow)
  useEffect(() => {
    if (pendingAuthorize) {
      // clear it then go
      window.location.href = pendingAuthorize;
    }
  }, [pendingAuthorize]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("已退出登录");
    setTimeout(() => window.location.reload(), 300);
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
        <div className="flex flex-wrap gap-2 items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPcOpen(true)}>
              <UserCircle className="w-4 h-4 mr-1" /> 个人中心
            </Button>
            <Button variant="outline" onClick={() => setSessionOpen(true)}>
              <MonitorSmartphone className="w-4 h-4 mr-1" /> 会话管理
            </Button>
            <Button variant="outline" className="text-rose-600 hover:text-rose-700" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> 退出登录
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            {user.isAdmin && (
              <Button variant="outline" onClick={() => router.push("/?admin=1")}>
                <Shield className="w-4 h-4 mr-1" /> 后台管理
              </Button>
            )}
            <Button onClick={() => setApplyOpen(true)}>
              <Plus className="w-4 h-4 mr-1" /> 申请应用
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

        {/* Apps list */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">我的应用</h2>
            <Badge variant="secondary">{apps.length} 个</Badge>
          </div>

          {loadingApps ? (
            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
          ) : apps.length === 0 ? (
            <Card className="p-8 text-center text-slate-400 border-dashed">
              <p className="text-sm">暂无应用，点击「申请应用」创建第一个吧</p>
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
          NodeByte Connect · 统一身份认证系统 · 基于 Discourse Connect
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

  return (
    <Card className={`p-4 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden border-l-0`} onClick={onClick}>
      {/* Left accent bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${st.accent}`} />
      <div className="flex items-start gap-3 pl-2">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 border flex items-center justify-center overflow-hidden shrink-0 shadow-sm group-hover:scale-105 transition-transform">
          {app.icon ? <img src={app.icon} alt="" className="w-full h-full object-contain" /> : <ExternalLink className="w-5 h-5 text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 truncate group-hover:text-teal-700 transition-colors">{app.name}</span>
            <Badge variant="outline" className={`text-xs ${st.cls}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot} mr-1`} />{st.label}</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{app.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-[10px] uppercase font-mono">{app.type}</Badge>
            <span className="text-[10px] text-slate-500 font-mono truncate">{app.appId}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
