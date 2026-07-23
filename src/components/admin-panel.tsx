"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  ArrowLeft, Search, Loader2, CheckCircle2, XCircle, Trash2, Pause, Play,
  Download, Eraser, ExternalLink, Image as ImageIcon, Bell, BellOff, AlertTriangle,
  Users, FileText, Settings as SettingsIcon, AppWindow, ShieldAlert,
  LayoutDashboard, ScrollText, Activity, TrendingUp, Clock, CheckCircle, XCircle as XIcon,
  KeyRound, UserCheck, Server, ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";

export function AdminPanel() {
  const router = useRouter();
  const { user } = useAppStore();
  const [tab, setTab] = useState("overview");

  // Red dot: fetch pending review count
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingRefreshKey, setPendingRefreshKey] = useState(0);

  useEffect(() => {
    let active = true;
    const doFetch = () => {
      fetch("/api/admin/reviews?status=pending&pageSize=1")
        .then((r) => r.json())
        .then((data) => { if (active) setPendingCount(data.pendingCount || 0); })
        .catch(() => {});
    };
    const t = setTimeout(doFetch, 0);
    const i = setInterval(doFetch, 30000);
    return () => { active = false; clearTimeout(t); clearInterval(i); };
  }, [pendingRefreshKey]);

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Card className="p-6 text-center">
          <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2" />
          <p className="font-semibold">无权限访问</p>
          <Button className="mt-3" onClick={() => router.push("/")}>返回首页</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")} className="shrink-0">
            <ArrowLeft className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">返回前台</span>
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0" />
            <span className="font-bold truncate text-sm sm:text-base">NodeByte Connect <span className="hidden sm:inline">管理后台</span></span>
          </div>
          <Badge variant="secondary" className="ml-auto shrink-0 text-xs">{user.username}</Badge>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-6 h-auto gap-1 mb-1">
            <TabsTrigger value="overview" className="flex items-center gap-1.5 shrink-0"><LayoutDashboard className="w-4 h-4" />概览</TabsTrigger>
            <TabsTrigger value="apps" className="flex items-center gap-1.5 shrink-0"><AppWindow className="w-4 h-4" />应用列表</TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1.5 relative shrink-0">
              <ScrollText className="w-4 h-4" />审核列表
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5 shrink-0"><Users className="w-4 h-4" />用户列表</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5 shrink-0"><Activity className="w-4 h-4" />用户日志</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5 shrink-0"><SettingsIcon className="w-4 h-4" />系统设置</TabsTrigger>
          </TabsList>

          <TabsContent value="overview"><OverviewTab onNavigate={setTab} /></TabsContent>
          <TabsContent value="apps"><AppsTab /></TabsContent>
          <TabsContent value="reviews"><ReviewsTab onChanged={() => setPendingRefreshKey((k) => k + 1)} /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="logs"><LogsTab /></TabsContent>
          <TabsContent value="settings"><SettingsTab /></TabsContent>
        </Tabs>
      </main>

      <footer className="border-t bg-white py-3 text-center text-xs text-slate-400">
        NodeByte Connect Admin Panel
      </footer>
    </div>
  );
}

/* ============ Overview Tab ============ */
function OverviewTab({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const doFetch = () => {
      fetch("/api/admin/stats")
        .then((r) => r.json())
        .then((data) => { if (active) setStats(data); })
        .catch(() => toast.error("加载统计失败"))
        .finally(() => { if (active) setLoading(false); });
    };
    doFetch();
    const i = setInterval(doFetch, 60000);
    return () => { active = false; clearInterval(i); };
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const maxDaily = Math.max(...stats.dailyTrend.map((d: any) => Math.max(d.apps, d.tokens, d.users)), 1);

  return (
    <div className="mt-4 space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<AppWindow className="w-5 h-5" />}
          label="应用总数"
          value={stats.appCounts.total}
          sub={`${stats.appCounts.approved} 已通过 · ${stats.appCounts.pending + stats.appCounts.pending_re_review} 待审`}
          gradient="from-teal-500 to-emerald-500"
          trend={stats.trends?.apps}
          onClick={() => onNavigate("apps")}
        />
        <KpiCard
          icon={<Users className="w-5 h-5" />}
          label="注册用户"
          value={stats.users.total}
          sub={`${stats.users.admins} 管理员 · ${stats.users.banned} 封禁`}
          gradient="from-fuchsia-500 to-purple-500"
          trend={stats.trends?.users}
          onClick={() => onNavigate("users")}
        />
        <KpiCard
          icon={<KeyRound className="w-5 h-5" />}
          label="Token 签发"
          value={stats.tokens.total}
          sub={`${stats.tokens.active} 活跃`}
          gradient="from-amber-500 to-orange-500"
          trend={stats.trends?.tokens}
          onClick={() => onNavigate("logs")}
        />
        <KpiCard
          icon={<ScrollText className="w-5 h-5" />}
          label="待审核"
          value={stats.pendingReviews}
          sub={stats.pendingReviews > 0 ? "需要处理" : "暂无待审"}
          gradient="from-rose-500 to-pink-500"
          highlight={stats.pendingReviews > 0}
          onClick={() => onNavigate("reviews")}
        />
      </div>

      {/* App status distribution + daily trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><AppWindow className="w-4 h-4 text-teal-600" />应用状态分布</h3>
          </div>
          <div className="space-y-3">
            <StatusBar label="已通过" value={stats.appCounts.approved} total={stats.appCounts.total} color="bg-emerald-500" />
            <StatusBar label="待审核" value={stats.appCounts.pending + stats.appCounts.pending_re_review} total={stats.appCounts.total} color="bg-amber-500" />
            <StatusBar label="已拒绝" value={stats.appCounts.rejected} total={stats.appCounts.total} color="bg-rose-500" />
            <StatusBar label="已停用" value={stats.appCounts.disabled} total={stats.appCounts.total} color="bg-slate-400" />
          </div>
          <div className="mt-4 pt-3 border-t flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-500" />OIDC: {stats.typeCounts.oidc || 0}</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-fuchsia-500" />OAuth2: {stats.typeCounts.oauth2 || 0}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-fuchsia-600" />近 14 天趋势</h3>
          </div>
          <InteractiveChart data={stats.dailyTrend} maxDaily={maxDaily} />
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-teal-500" />新增应用</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" />Token 签发</span>
          </div>
        </Card>
      </div>

      {/* Recent reviews + Top apps */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><ScrollText className="w-4 h-4 text-rose-600" />最近审核决定</h3>
            <Button size="sm" variant="ghost" className="text-xs text-slate-500" onClick={() => onNavigate("reviews")}>查看全部 →</Button>
          </div>
          {(!stats.recentReviews || stats.recentReviews.length === 0) ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无审核记录</p>
          ) : (
            <div className="space-y-2">
              {stats.recentReviews.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${r.status === "approved" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                    {r.status === "approved" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-sm font-medium truncate">{r.appName}</div>
                    <div className="text-xs text-slate-400">由 {r.reviewer} 审核 · {r.reviewedAt ? fmtDate(r.reviewedAt) : "-"}</div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${r.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-rose-50 text-rose-700 border-rose-200"}`}>
                    {r.status === "approved" ? "通过" : "拒绝"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Activity className="w-4 h-4 text-amber-600" />Token 签发 Top 5</h3>
          {stats.topApps.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {stats.topApps.map((a: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 overflow-hidden">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${i === 0 ? "bg-amber-500" : i === 1 ? "bg-slate-400" : i === 2 ? "bg-orange-400" : "bg-slate-300"}`}>{i + 1}</span>
                  <div className="w-8 h-8 rounded bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                    {a.icon ? <img src={a.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <div className="text-sm font-medium truncate">{a.name}</div>
                    <div className="text-xs text-slate-600 font-mono truncate">{a.appId}</div>
                  </div>
                  <Badge variant="secondary" className="text-xs shrink-0">{a.count} 次</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Recent activity + System status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Clock className="w-4 h-4 text-teal-600" />最近活动</h3>
            <Button size="sm" variant="ghost" className="text-xs text-slate-500" onClick={() => onNavigate("logs")}>查看全部 →</Button>
          </div>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {stats.recentLogs.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">暂无活动</p>
              ) : (
                stats.recentLogs.map((l: any) => (
                  <div key={l.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-slate-50">
                    <div className="w-2 h-2 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm">
                        <span className="font-medium text-slate-700">{l.username}</span>
                        <span className="text-slate-500 ml-1">{actionLabel(l.action)}</span>
                      </div>
                      {l.details && <div className="text-xs text-slate-400 truncate mt-0.5">{l.details}</div>}
                      <div className="text-[10px] text-slate-400 mt-0.5">{fmtDate(l.createdAt)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4"><Server className="w-4 h-4 text-emerald-600" />系统状态</h3>
          <div className="grid grid-cols-2 gap-3">
            <StatusItem label="OAuth2 端点" ok />
            <StatusItem label="OIDC Discovery" ok />
            <StatusItem label="NodeByte API" ok={stats.appCounts.total > 0} />
            <StatusItem label="封禁检测 Cron" ok warning />
          </div>
          <div className="mt-4 pt-3 border-t">
            <div className="text-xs text-slate-500 mb-2">快速操作</div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => onNavigate("reviews")}>
                <ScrollText className="w-3.5 h-3.5 mr-1" /> 查看审核
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("logs")}>
                <Download className="w-3.5 h-3.5 mr-1" /> 用户日志
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("apps")}>
                <AppWindow className="w-3.5 h-3.5 mr-1" /> 应用列表
              </Button>
              <Button size="sm" variant="outline" onClick={() => onNavigate("settings")}>
                <SettingsIcon className="w-3.5 h-3.5 mr-1" /> 系统设置
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, gradient, highlight, trend, onClick }: { icon: React.ReactNode; label: string; value: number; sub: string; gradient: string; highlight?: boolean; trend?: { current: number; previous: number; pct: number }; onClick?: () => void }) {
  return (
    <Card
      className={`p-4 relative overflow-hidden transition-all hover:shadow-md ${highlight ? "ring-2 ring-rose-300 animate-pulse" : ""} ${onClick ? "cursor-pointer hover:scale-[1.02]" : ""}`}
      onClick={onClick}
    >
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full bg-gradient-to-br ${gradient} opacity-10 blur-xl`} />
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${gradient} text-white flex items-center justify-center`}>{icon}</div>
      </div>
      <div className="flex items-end gap-2">
        <CountUp value={value} />
        {trend && (
          <div className={`flex items-center gap-0.5 text-[10px] font-bold pb-1 ${trend.pct > 0 ? "text-emerald-600" : trend.pct < 0 ? "text-rose-600" : "text-slate-400"}`}>
            {trend.pct > 0 ? <ArrowUpRight className="w-3 h-3" /> : trend.pct < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
            {Math.abs(trend.pct)}%
          </div>
        )}
      </div>
      <div className="text-xs text-slate-400 mt-1 flex items-center justify-between">
        <span>{sub}</span>
        {trend && (
          <span className="text-[9px] text-slate-400">
            {trend.current > trend.previous ? "+" : ""}{trend.current - trend.previous} 较上周
          </span>
        )}
      </div>
    </Card>
  );
}

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    if (start === end) return;
    const duration = 800;
    const startTime = performance.now();
    const tick = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value]);

  return <div className="text-2xl font-black text-slate-800 tabular-nums">{display.toLocaleString()}</div>;
}

function InteractiveChart({ data, maxDaily }: { data: any[]; maxDaily: number }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const hasData = data.some((d: any) => d.apps > 0 || d.tokens > 0 || d.users > 0);
  if (!hasData) {
    return (
      <div className="h-32 flex flex-col items-center justify-center text-slate-400 gap-2">
        <Activity className="w-8 h-8 opacity-30" />
        <p className="text-xs">过去 14 天暂无活动记录</p>
      </div>
    );
  }
  return (
    <div className="relative">
      <div className="flex items-end gap-1 h-32">
        {data.map((d: any, i: number) => (
          <div
            key={i}
            className="flex-1 flex flex-col items-center gap-1 relative cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          >
            {/* Hover tooltip */}
            {hovered === i && (
              <div className="absolute -top-20 left-1/2 -translate-x-1/2 z-20 bg-slate-900 text-white text-[10px] rounded-lg px-2 py-1.5 shadow-xl whitespace-nowrap pointer-events-none">
                <div className="font-bold mb-0.5">{d.date}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-teal-400" />应用: {d.apps}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" />Token: {d.tokens}</div>
                <div className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400" />用户: {d.users}</div>
              </div>
            )}
            <div className="w-full flex flex-col justify-end h-full gap-0.5">
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${(d.tokens / maxDaily) * 100}%`, minHeight: d.tokens > 0 ? "2px" : "0", background: hovered === i ? "linear-gradient(to top, #d97706, #fb923c)" : "linear-gradient(to top, #f59e0b, #fb923c)" }}
              />
              <div
                className="w-full rounded-t-sm transition-all"
                style={{ height: `${(d.apps / maxDaily) * 100}%`, minHeight: d.apps > 0 ? "2px" : "0", background: hovered === i ? "linear-gradient(to top, #0d9488, #34d399)" : "linear-gradient(to top, #14b8a6, #34d399)" }}
              />
            </div>
            <span className={`text-[8px] transition-colors ${hovered === i ? "text-slate-700 font-bold" : "text-slate-400"}`}>{d.date.slice(5)}</span>
            {/* Hover indicator line */}
            {hovered === i && (
              <div className="absolute inset-0 border-l-2 border-teal-400/30 rounded pointer-events-none" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="text-slate-400 font-medium">{value} ({pct.toFixed(0)}%)</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusItem({ label, ok, warning }: { label: string; ok: boolean; warning?: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg border">
      <span className={`w-2.5 h-2.5 rounded-full ${ok ? (warning ? "bg-amber-500" : "bg-emerald-500") : "bg-rose-500"} ${ok && !warning ? "animate-pulse" : ""}`} />
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-700 truncate">{label}</div>
        <div className="text-xs text-slate-400">{ok ? (warning ? "需外部触发" : "运行中") : "未就绪"}</div>
      </div>
    </div>
  );
}

function actionLabel(action: string): string {
  const map: Record<string, string> = {
    LOGIN: "登录了系统",
    LOGOUT: "退出了登录",
    DEV_LOGIN: "通过开发模式登录",
    APP_SUBMIT: "提交了应用申请",
    APP_EDIT: "编辑了应用",
    APP_DELETE: "删除了应用",
    APP_VERIFY_SEND: "请求发送验证码",
    APP_VERIFY_SEND_DEV: "请求发送验证码(开发)",
    APP_VERIFY_OK: "验证成功并查看了凭据",
    OAUTH_APPROVE: "授权了应用",
    OAUTH_DENY: "拒绝了授权",
    OAUTH_TOKEN_ISSUED: "签发了 Token",
    ADMIN_REVIEW_APPROVE: "审核通过了应用",
    ADMIN_REVIEW_REJECT: "拒绝了应用审核",
    ADMIN_APP_ENABLE: "启用了应用",
    ADMIN_APP_DISABLE: "停用了应用",
    ADMIN_APP_DELETE: "删除了应用",
    ADMIN_USER_BLOCK_SUBMIT: "停用了用户申请权限",
    ADMIN_USER_UNBLOCK_SUBMIT: "恢复了用户申请权限",
    ADMIN_USER_DISABLE_APPS: "停用了用户所有应用",
    ADMIN_SETTINGS_UPDATE: "更新了系统设置",
    ADMIN_LOGS_CLEAR: "清空了日志",
    AUTO_BAN_DISABLE: "被自动封禁停用",
  };
  return map[action] || action;
}

/** Color-coded action tag for logs */
function actionTagColor(action: string): string {
  if (action.startsWith("ADMIN_REVIEW_APPROVE") || action === "ADMIN_APP_ENABLE" || action === "OAUTH_APPROVE" || action === "APP_VERIFY_OK") {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (action.startsWith("ADMIN_REVIEW_REJECT") || action === "ADMIN_APP_DISABLE" || action === "ADMIN_APP_DELETE" || action === "OAUTH_DENY" || action === "APP_DELETE" || action === "AUTO_BAN_DISABLE" || action === "ADMIN_LOGS_CLEAR") {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (action === "APP_SUBMIT" || action === "APP_EDIT" || action === "ADMIN_SETTINGS_UPDATE" || action === "ADMIN_USER_BLOCK_SUBMIT" || action === "ADMIN_USER_UNBLOCK_SUBMIT" || action === "ADMIN_USER_DISABLE_APPS") {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  if (action === "LOGIN" || action === "LOGOUT" || action === "OAUTH_TOKEN_ISSUED") {
    return "bg-teal-50 text-teal-700 border-teal-200";
  }
  if (action === "DEV_LOGIN" || action === "SESSION_REVOKE" || action === "SESSION_REVOKE_ALL") {
    return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  }
  return "bg-slate-50 text-slate-600 border-slate-200";
}

/** ISO 8601 date format: YYYY-MM-DD HH:mm:ss */
function fmtDate(d: string | Date): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}:${pad(dt.getSeconds())}`;
}

/* ============ Apps Tab ============ */
function AppsTab() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [type, setType] = useState("");
  const [apps, setApps] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejecting, setRejecting] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchApps = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, status, type, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/admin/apps?${params}`);
      const data = await res.json();
      setApps(data.apps || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, status, type, page, pageSize]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === apps.length) setSelected(new Set());
    else setSelected(new Set(apps.map((a) => a.id)));
  };

  const batchAction = async (action: string) => {
    if (selected.size === 0) {
      toast.error("请先选择应用");
      return;
    }
    if (action === "delete" && !confirm(`确认删除 ${selected.size} 个应用？`)) return;
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) {
        toast.error("操作失败");
        return;
      }
      toast.success("操作成功");
      setSelected(new Set());
      fetchApps();
    } catch {
      toast.error("网络错误");
    }
  };

  const statusMap: Record<string, { label: string; cls: string }> = {
    pending: { label: "待审核", cls: "bg-amber-100 text-amber-700" },
    pending_re_review: { label: "待复审", cls: "bg-amber-100 text-amber-700" },
    approved: { label: "已通过", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "已拒绝", cls: "bg-rose-100 text-rose-700" },
    disabled: { label: "已停用", cls: "bg-slate-200 text-slate-600" },
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜索应用名 / App ID / 用户名" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
            <SelectItem value="disabled">已停用</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { setType(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="类型" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部类型</SelectItem>
            <SelectItem value="oidc">OIDC</SelectItem>
            <SelectItem value="oauth2">OAuth2</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-2 z-20 flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-teal-50 border border-teal-300 shadow-lg flex-wrap">
          <span className="text-sm text-teal-700 font-medium">已选 {selected.size} 项</span>
          <div className="flex gap-1.5 ml-auto sm:ml-0">
            <Button size="sm" variant="outline" onClick={() => batchAction("enable")}><Play className="w-3.5 h-3.5 mr-1" />启用</Button>
            <Button size="sm" variant="outline" onClick={() => batchAction("disable")}><Pause className="w-3.5 h-3.5 mr-1" />停用</Button>
            <Button size="sm" variant="outline" className="text-rose-600" onClick={() => batchAction("delete")}><Trash2 className="w-3.5 h-3.5 mr-1" />删除</Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left w-8"><Checkbox checked={selected.size === apps.length && apps.length > 0} onCheckedChange={selectAll} /></th>
              <th className="p-2 text-left">应用</th>
              <th className="p-2 text-left">所有者</th>
              <th className="p-2 text-left">类型</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">创建时间</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>
            )}
            {!loading && apps.length === 0 && (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无数据</td></tr>
            )}
            {apps.map((a) => (
              <tr key={a.id} className="border-b hover:bg-teal-50/50 even:bg-slate-50/50">
                <td className="p-2"><Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleSelect(a.id)} /></td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                      {a.icon ? <img src={a.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[160px]">{a.name}</div>
                      <div className="text-xs text-slate-600 font-mono">{a.appId}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-slate-600">{a.owner?.username || "-"}</td>
                <td className="p-2"><Badge variant="secondary" className="uppercase text-xs">{a.type}</Badge></td>
                <td className="p-2"><Badge className={statusMap[a.status]?.cls || ""} variant="outline">{statusMap[a.status]?.label || a.status}</Badge></td>
                <td className="p-2 text-xs text-slate-500">{fmtDate(a.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>共 {total} 条</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="px-2 py-1">{page} / {Math.ceil(total / pageSize) || 1}</span>
          <Button size="sm" variant="outline" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>
    </Card>
  );
}

/* ============ Reviews Tab ============ */
function ReviewsTab({ onChanged }: { onChanged: () => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("pending");
  const [reviews, setReviews] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectMode, setRejectMode] = useState<"single" | "batch">("batch");

  const fetchReviews = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, status, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/admin/reviews?${params}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, status, page, pageSize]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const doAction = async (action: string, ids: string[], reason?: string) => {
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ids, reason }),
      });
      if (!res.ok) {
        toast.error("操作失败");
        return false;
      }
      toast.success(action === "approve" ? "已通过" : action === "reject" ? "已拒绝" : "已清理");
      setSelected(new Set());
      fetchReviews();
      onChanged();
      return true;
    } catch {
      toast.error("网络错误");
      return false;
    }
  };

  const handleBatchReject = async () => {
    if (!rejectReason.trim()) {
      toast.error("请输入拒绝理由");
      return;
    }
    const ids = rejectMode === "single" ? Array.from(selected) : Array.from(selected);
    const ok = await doAction("reject", ids, rejectReason);
    if (ok) {
      setRejectOpen(false);
      setRejectReason("");
    }
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜索应用名 / 用户名" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">待审核</SelectItem>
            <SelectItem value="approved">已通过</SelectItem>
            <SelectItem value="rejected">已拒绝</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { window.open(`/api/admin/reviews?export=1&status=${status}&q=${encodeURIComponent(q)}&pageSize=10000`, "_blank"); }}>
          <Download className="w-4 h-4 mr-1" /> 导出 CSV
        </Button>
      </div>

      {selected.size > 0 && status === "pending" && (
        <div className="sticky bottom-2 z-20 flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-teal-50 border border-teal-300 shadow-lg flex-wrap">
          <span className="text-sm text-teal-700 font-medium">已选 {selected.size} 项</span>
          <div className="flex gap-1.5 ml-auto sm:ml-0">
            <Button size="sm" onClick={() => doAction("approve", Array.from(selected))}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />批量通过</Button>
            <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { setRejectMode("batch"); setRejectOpen(true); }}><XCircle className="w-3.5 h-3.5 mr-1" />批量拒绝</Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left w-8">{status === "pending" && <Checkbox checked={selected.size === reviews.length && reviews.length > 0} onCheckedChange={() => selected.size === reviews.length ? setSelected(new Set()) : setSelected(new Set(reviews.map((r) => r.id)))} />}</th>
              <th className="p-2 text-left">应用</th>
              <th className="p-2 text-left">申请者</th>
              <th className="p-2 text-left">类型</th>
              <th className="p-2 text-left">申请时间</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>}
            {!loading && reviews.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-slate-400">暂无数据</td></tr>}
            {reviews.map((r) => (
              <tr key={r.id} className="border-b hover:bg-teal-50/50 even:bg-slate-50/50">
                <td className="p-2">{status === "pending" && <Checkbox checked={selected.has(r.id)} onCheckedChange={() => toggleSelect(r.id)} />}</td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                      {r.app?.icon ? <img src={r.app.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[160px]">{r.app?.name}</div>
                      <div className="text-xs text-slate-400 line-clamp-1 max-w-[200px]">{r.app?.description}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-slate-600">{r.app?.owner?.username || "-"}</td>
                <td className="p-2"><Badge variant="secondary" className="uppercase text-xs">{r.app?.type}</Badge></td>
                <td className="p-2 text-xs text-slate-500">{fmtDate(r.createdAt)}</td>
                <td className="p-2">
                  {r.status === "pending" ? (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => doAction("approve", [r.id])}><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => { setSelected(new Set([r.id])); setRejectMode("single"); setRejectOpen(true); }}><XCircle className="w-3.5 h-3.5 text-rose-600" /></Button>
                    </div>
                  ) : (
                    <Badge variant="outline" className={r.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}>
                      {r.status === "approved" ? "已通过" : "已拒绝"}
                    </Badge>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>共 {total} 条</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="px-2 py-1">{page} / {Math.ceil(total / pageSize) || 1}</span>
          <Button size="sm" variant="outline" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> 拒绝审核</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>拒绝理由（将通知用户修改后重新提交）</Label>
            <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={4} placeholder="请说明拒绝原因..." />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectOpen(false)}>取消</Button>
            <Button variant="destructive" onClick={handleBatchReject}>确认拒绝</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ============ Users Tab ============ */
function UsersTab() {
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [userApps, setUserApps] = useState<{ user: any; apps: any[] } | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, page: String(page), pageSize: String(pageSize) });
      const res = await fetch(`/api/admin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, page, pageSize]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const batchAction = async (action: string) => {
    if (selected.size === 0) { toast.error("请先选择用户"); return; }
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected), action }),
      });
      if (!res.ok) { toast.error("操作失败"); return; }
      toast.success("操作成功");
      setSelected(new Set());
      fetchUsers();
    } catch { toast.error("网络错误"); }
  };

  const viewUserApps = async (u: any) => {
    try {
      const res = await fetch(`/api/admin/users/${u.id}/apps`);
      const data = await res.json();
      setUserApps({ user: data.user || u, apps: data.apps || [], recentLogs: data.recentLogs || [], statusCounts: data.statusCounts || {} });
    } catch { toast.error("加载失败"); }
  };

  const disableApp = async (appId: string) => {
    if (!userApps) return;
    try {
      const res = await fetch("/api/admin/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [appId], action: "disable" }),
      });
      if (!res.ok) { toast.error("操作失败"); return; }
      toast.success("已停用");
      viewUserApps(userApps.user);
    } catch { toast.error("网络错误"); }
  };

  const filteredUsers = users.filter((u) => {
    if (roleFilter === "admin" && !u.isAdmin) return false;
    if (roleFilter === "moderator" && !u.isModerator) return false;
    if (roleFilter === "normal" && (u.isAdmin || u.isModerator)) return false;
    if (statusFilter === "banned" && !u.isBanned) return false;
    if (statusFilter === "blocked" && !u.appSubmitBlocked) return false;
    if (statusFilter === "normal" && (u.isBanned || u.appSubmitBlocked)) return false;
    return true;
  });

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜索用户名 / 邮箱 / 名称" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="角色" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部角色</SelectItem>
            <SelectItem value="admin">管理员</SelectItem>
            <SelectItem value="moderator">版主</SelectItem>
            <SelectItem value="normal">普通用户</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
          <SelectTrigger className="w-[120px]"><SelectValue placeholder="状态" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部状态</SelectItem>
            <SelectItem value="banned">封禁</SelectItem>
            <SelectItem value="blocked">禁申</SelectItem>
            <SelectItem value="normal">正常</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-2 z-20 flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-teal-50 border border-teal-300 shadow-lg flex-wrap">
          <span className="text-sm text-teal-700 font-medium">已选 {selected.size} 项</span>
          <div className="flex gap-1.5 ml-auto sm:ml-0 flex-wrap">
            <Button size="sm" variant="outline" onClick={() => batchAction("block_submit")}><Pause className="w-3.5 h-3.5 mr-1" />停用申请权限</Button>
            <Button size="sm" variant="outline" onClick={() => batchAction("unblock_submit")}><Play className="w-3.5 h-3.5 mr-1" />恢复申请权限</Button>
            <Button size="sm" variant="outline" className="text-rose-600" onClick={() => batchAction("disable_apps")}><Pause className="w-3.5 h-3.5 mr-1" />停用所有应用</Button>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left w-8"><Checkbox checked={selected.size === filteredUsers.length && filteredUsers.length > 0} onCheckedChange={() => selected.size === filteredUsers.length ? setSelected(new Set()) : setSelected(new Set(filteredUsers.map((u) => u.id)))} /></th>
              <th className="p-2 text-left">用户</th>
              <th className="p-2 text-left">社区 ID</th>
              <th className="p-2 text-left">等级</th>
              <th className="p-2 text-left">角色</th>
              <th className="p-2 text-left">应用数</th>
              <th className="p-2 text-left">状态</th>
              <th className="p-2 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>}
            {!loading && filteredUsers.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400">暂无数据</td></tr>}
            {filteredUsers.map((u) => (
              <tr key={u.id} className="border-b hover:bg-teal-50/50 even:bg-slate-50/50">
                <td className="p-2"><Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggleSelect(u.id)} /></td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border overflow-hidden shrink-0">
                      {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" alt="" /> : null}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[120px]">{u.username}</div>
                      <div className="text-xs text-slate-400 truncate max-w-[120px]">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-xs text-slate-500 font-mono">{u.externalId}</td>
                <td className="p-2"><Badge variant="outline">Lv.{u.trustLevel}</Badge></td>
                <td className="p-2">
                  {u.isAdmin && <Badge className="bg-rose-100 text-rose-700 mr-1">管理员</Badge>}
                  {u.isModerator && <Badge className="bg-amber-100 text-amber-700">版主</Badge>}
                  {!u.isAdmin && !u.isModerator && <span className="text-slate-400 text-xs">-</span>}
                </td>
                <td className="p-2 text-slate-600">{u._count?.applications || 0}</td>
                <td className="p-2">
                  {u.isBanned && <Badge className="bg-rose-100 text-rose-700">封禁</Badge>}
                  {u.appSubmitBlocked && <Badge className="bg-amber-100 text-amber-700">禁申</Badge>}
                  {!u.isBanned && !u.appSubmitBlocked && <Badge className="bg-emerald-100 text-emerald-700">正常</Badge>}
                </td>
                <td className="p-2">
                  <Button size="sm" variant="ghost" onClick={() => viewUserApps(u)}><ExternalLink className="w-3.5 h-3.5" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>共 {total} 条</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="px-2 py-1">{page} / {Math.ceil(total / pageSize) || 1}</span>
          <Button size="sm" variant="outline" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>

      <Dialog open={!!userApps} onOpenChange={(o) => !o && setUserApps(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-fuchsia-600" />
              用户详情
            </DialogTitle>
          </DialogHeader>
          {userApps && <UserDetailContent data={userApps} onDisableApp={disableApp} fmtDate={fmtDate} />}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function UserDetailContent({ data, onDisableApp, fmtDate }: { data: any; onDisableApp: (id: string) => void; fmtDate: (d: string | Date) => string }) {
  const { user, apps, recentLogs, statusCounts } = data;
  const trustLevelNames = ["新用户", "基本用户", "成员", "活跃用户", "领导者"];
  return (
    <ScrollArea className="flex-1 pr-2">
      <div className="space-y-4">
        {/* User info header */}
        <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-fuchsia-50 to-purple-50 border">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-400 to-purple-500 border-2 border-white shadow flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden">
            {user.avatarUrl ? <img src={user.avatarUrl} className="w-full h-full object-cover" alt="" /> : (user.username?.[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-lg truncate">{user.name || user.username}</span>
              <Badge variant="outline" className="text-xs">Lv.{user.trustLevel} {trustLevelNames[user.trustLevel] || ""}</Badge>
              {user.isAdmin && <Badge className="bg-rose-500 text-xs">管理员</Badge>}
              {user.isModerator && <Badge className="bg-amber-500 text-xs">版主</Badge>}
              {user.isBanned && <Badge className="bg-slate-500 text-xs">封禁</Badge>}
              {user.appSubmitBlocked && <Badge className="bg-amber-100 text-amber-700 text-xs">禁申</Badge>}
            </div>
            <div className="text-sm text-slate-500 mt-1">@{user.username} · ID: {user.externalId}</div>
            <div className="text-xs text-slate-400 mt-0.5">{user.email}</div>
            <div className="text-[10px] text-slate-400 mt-1 flex gap-3">
              <span>注册: {fmtDate(user.createdAt)}</span>
              {user.lastLoginAt && <span>最后登录: {fmtDate(user.lastLoginAt)}</span>}
            </div>
          </div>
        </div>

        {/* App stats summary */}
        <div className="grid grid-cols-4 gap-2">
          <div className="rounded-lg border p-2 text-center bg-emerald-50">
            <div className="text-lg font-black text-emerald-700">{statusCounts.approved || 0}</div>
            <div className="text-[10px] text-slate-500">已通过</div>
          </div>
          <div className="rounded-lg border p-2 text-center bg-amber-50">
            <div className="text-lg font-black text-amber-700">{(statusCounts.pending || 0) + (statusCounts.pending_re_review || 0)}</div>
            <div className="text-[10px] text-slate-500">待审核</div>
          </div>
          <div className="rounded-lg border p-2 text-center bg-rose-50">
            <div className="text-lg font-black text-rose-700">{statusCounts.rejected || 0}</div>
            <div className="text-[10px] text-slate-500">已拒绝</div>
          </div>
          <div className="rounded-lg border p-2 text-center bg-slate-50">
            <div className="text-lg font-black text-slate-600">{statusCounts.disabled || 0}</div>
            <div className="text-[10px] text-slate-500">已停用</div>
          </div>
        </div>

        {/* Apps list */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
            <AppWindow className="w-4 h-4 text-teal-600" /> 应用列表 ({apps.length})
          </h4>
          {apps.length === 0 ? (
            <p className="text-center text-slate-400 py-4 text-sm">暂无应用</p>
          ) : (
            <div className="space-y-2">
              {apps.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                    {a.icon ? <img src={a.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-xs text-slate-500 font-mono truncate">{a.appId}</div>
                  </div>
                  <Badge variant="outline" className={`shrink-0 text-xs ${a.status === "approved" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : a.status === "rejected" ? "bg-rose-50 text-rose-700 border-rose-200" : a.status === "disabled" ? "bg-slate-100 text-slate-500" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                    {a.status === "approved" ? "已通过" : a.status === "rejected" ? "已拒绝" : a.status === "disabled" ? "已停用" : a.status === "pending_re_review" ? "待复审" : "待审核"}
                  </Badge>
                  {a.status !== "disabled" && a.status !== "rejected" && (
                    <Button size="sm" variant="ghost" className="text-rose-600 shrink-0" onClick={() => onDisableApp(a.id)} title="停用">
                      <Pause className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        {recentLogs && recentLogs.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-slate-700 mb-2 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-amber-600" /> 最近活动 ({recentLogs.length})
            </h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {recentLogs.map((l: any) => (
                <div key={l.id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-slate-600">{l.action}</span>
                    {l.details && <span className="text-slate-400 ml-1">— {l.details}</span>}
                    <div className="text-[10px] text-slate-400">{fmtDate(l.createdAt)}{l.ip && ` · ${l.ip}`}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}

/* ============ Logs Tab ============ */
function LogsTab() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("all");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(30);
  const [loading, setLoading] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ q, range, page: String(page), pageSize: String(pageSize) });
      if (start) params.set("start", start);
      if (end) params.set("end", end);
      const res = await fetch(`/api/admin/logs?${params}`);
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      toast.error("加载失败");
    } finally {
      setLoading(false);
    }
  }, [q, range, start, end, page, pageSize]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const exportCsv = () => {
    const params = new URLSearchParams({ q, range, export: "1", pageSize: "10000" });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    window.open(`/api/admin/logs?${params}`, "_blank");
  };

  const clearLogs = async () => {
    if (!confirm("确认清空所有日志？此操作不可恢复。")) return;
    try {
      const res = await fetch("/api/admin/logs", { method: "DELETE" });
      if (!res.ok) { toast.error("清空失败"); return; }
      toast.success("已清空");
      fetchLogs();
    } catch { toast.error("网络错误"); }
  };

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜索动作 / 详情 / 用户名" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={range} onValueChange={(v) => { setRange(v); setPage(1); }}>
          <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部</SelectItem>
            <SelectItem value="today">今天</SelectItem>
            <SelectItem value="yesterday">昨天</SelectItem>
            <SelectItem value="7days">近 7 天</SelectItem>
            <SelectItem value="custom">自定义</SelectItem>
          </SelectContent>
        </Select>
        {range === "custom" && (
          <>
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-[150px]" />
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-[150px]" />
          </>
        )}
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="w-4 h-4 mr-1" />导出 CSV</Button>
        <Button variant="outline" size="sm" className="text-rose-600" onClick={clearLogs}><Eraser className="w-4 h-4 mr-1" />清空</Button>
      </div>

      <ScrollArea className="h-[60vh] rounded-lg border overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left">时间</th>
              <th className="p-2 text-left">用户</th>
              <th className="p-2 text-left">动作</th>
              <th className="p-2 text-left">详情</th>
              <th className="p-2 text-left">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={5} className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin inline" /></td></tr>}
            {!loading && logs.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-400">暂无日志</td></tr>}
            {logs.map((l) => (
              <tr key={l.id} className="border-b hover:bg-teal-50/50 even:bg-slate-50/50">
                <td className="p-2 text-xs text-slate-500 whitespace-nowrap">{fmtDate(l.createdAt)}</td>
                <td className="p-2 text-slate-700">{l.user?.username || <span className="text-slate-400">系统</span>}</td>
                <td className="p-2"><Badge variant="outline" className={`text-xs font-mono ${actionTagColor(l.action)}`}>{l.action}</Badge></td>
                <td className="p-2 text-slate-600 text-xs max-w-[300px] truncate" title={l.details || ""}>{l.details}</td>
                <td className="p-2 text-xs text-slate-600 font-mono">{l.ip || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>

      <div className="flex items-center justify-between mt-3 text-sm text-slate-500">
        <span>共 {total} 条</span>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>上一页</Button>
          <span className="px-2 py-1">{page} / {Math.ceil(total / pageSize) || 1}</span>
          <Button size="sm" variant="outline" disabled={page * pageSize >= total} onClick={() => setPage(page + 1)}>下一页</Button>
        </div>
      </div>
    </Card>
  );
}

/* ============ Settings Tab ============ */
function SettingsTab() {
  const [settings, setSettings] = useState<any>(null);
  const [original, setOriginal] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [testingCron, setTestingCron] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => { setSettings(d.settings); setOriginal(d.settings); }).catch(() => toast.error("加载失败"));
  }, []);

  const update = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) { toast.error("保存失败"); return; }
      toast.success("设置已保存");
      setOriginal({ ...settings });
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
  };

  const reset = () => {
    if (original) {
      setSettings({ ...original });
      toast.info("已重置为上次保存的值");
    }
  };

  const testCron = async () => {
    setTestingCron(true);
    setCronResult(null);
    try {
      const res = await fetch("/api/admin/check-banned", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setCronResult(`✓ 检查完成：检查 ${data.checked} 用户，发现 ${data.bannedCount} 封禁，停用 ${data.appsDisabled} 应用，清理 ${data.sessionsKilled} 会话，耗时 ${data.durationMs}ms`);
        toast.success("封禁检查执行成功");
      } else {
        setCronResult(`✗ 执行失败: ${data.error || "未知错误"}`);
        toast.error("封禁检查失败");
      }
    } catch (e: any) {
      setCronResult(`✗ 网络错误: ${e.message}`);
      toast.error("网络错误");
    } finally {
      setTestingCron(false);
    }
  };

  if (!settings) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(original);

  return (
    <div className="mt-4 max-w-3xl space-y-4">
      {/* 基础配置 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-emerald-500 text-white flex items-center justify-center">
            <SettingsIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">基础配置</h3>
            <p className="text-xs text-slate-400">应用申请与会话参数</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs">每个用户最大应用数</Label>
            <div className="relative">
              <Input type="number" min={1} max={50} value={settings.maxAppsPerUser} onChange={(e) => setSettings({ ...settings, maxAppsPerUser: Number(e.target.value) })} className="pr-10" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">个</span>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">申请最低社区等级</Label>
            <div className="relative">
              <Input type="number" min={0} max={4} value={settings.minTrustLevel} onChange={(e) => setSettings({ ...settings, minTrustLevel: Number(e.target.value) })} className="pr-12" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">TL</span>
            </div>
            <p className="text-[10px] text-slate-400">0-4，Discourse Trust Level</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">会话超时时间</Label>
            <div className="relative">
              <Input type="number" min={5} max={1440} value={settings.sessionTimeoutMin} onChange={(e) => setSettings({ ...settings, sessionTimeoutMin: Number(e.target.value) })} className="pr-10" />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">分钟</span>
            </div>
            <p className="text-[10px] text-slate-400">默认 720 分钟 (12小时)</p>
          </div>
        </div>
      </Card>

      {/* 通知策略 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-500 text-white flex items-center justify-center">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">通知策略</h3>
            <p className="text-xs text-slate-400">NodeByte 站内信通知开关</p>
          </div>
        </div>
        <div className="space-y-3">
          <ToggleRow label="用户提交应用时通知管理员" description="新应用申请提交时" checked={settings.notifyOnSubmit} onChange={(v) => setSettings({ ...settings, notifyOnSubmit: v })} />
          <ToggleRow label="审核通过时通知用户" description="应用审核通过时通知所有者" checked={settings.notifyOnApprove} onChange={(v) => setSettings({ ...settings, notifyOnApprove: v })} />
          <ToggleRow label="审核拒绝时通知用户" description="应用审核拒绝时通知所有者（含理由）" checked={settings.notifyOnReject} onChange={(v) => setSettings({ ...settings, notifyOnReject: v })} />
          <ToggleRow label="验证失败 / 异常时通知用户" description="凭据验证异常时通知" checked={settings.notifyOnFail} onChange={(v) => setSettings({ ...settings, notifyOnFail: v })} />
        </div>
      </Card>

      {/* 安全与风控 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 text-white flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">安全与风控</h3>
            <p className="text-xs text-slate-400">封禁用户自动检测</p>
          </div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>自动检查：每 <b className="text-slate-800">{process.env.NEXT_PUBLIC_BANNED_CHECK || 5}</b> 分钟执行一次</span>
          </div>
          <div className="text-slate-500 pl-4">通过 NodeByte API 批量获取用户状态，自动停用封禁用户应用并清理会话</div>
          <div className="text-slate-400 pl-4 font-mono text-[10px]">Cron 路径: /api/cron/check-banned</div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={testCron} disabled={testingCron}>
            {testingCron ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Activity className="w-3.5 h-3.5 mr-1" />}
            {testingCron ? "执行中..." : "立即执行检测"}
          </Button>
        </div>
        {cronResult && (
          <div className={`mt-3 rounded-lg p-3 text-xs ${cronResult.startsWith("✓") ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-rose-200 bg-rose-50 text-rose-700"}`}>
            {cronResult}
          </div>
        )}
      </Card>

      {/* Action buttons */}
      <div className="flex items-center gap-2 sticky bottom-4 bg-white py-3 border-t">
        <Button onClick={update} disabled={saving || !hasChanges}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
          保存设置
        </Button>
        <Button variant="outline" onClick={reset} disabled={!hasChanges || saving}>
          重置
        </Button>
        {hasChanges && (
          <span className="text-xs text-amber-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            有未保存的更改
          </span>
        )}
      </div>
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="min-w-0 pr-3">
        <div className="text-sm text-slate-700 font-medium">{label}</div>
        {description && <div className="text-[11px] text-slate-400 mt-0.5">{description}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} className="shrink-0" />
    </div>
  );
}
