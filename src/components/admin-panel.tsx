"use client";

import { useEffect, useState, useCallback } from "react";
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
  Users, FileText, Settings as SettingsIcon, AppWindow, ShieldAlert
} from "lucide-react";

export function AdminPanel() {
  const router = useRouter();
  const { user } = useAppStore();
  const [tab, setTab] = useState("apps");

  // Red dot: fetch pending review count
  const [pendingCount, setPendingCount] = useState(0);
  const refreshPending = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/reviews?status=pending&pageSize=1");
      const data = await res.json();
      setPendingCount(data.pendingCount || 0);
    } catch {}
  }, []);

  useEffect(() => {
    let i: ReturnType<typeof setInterval>;
    const run = () => { refreshPending(); };
    run();
    i = setInterval(run, 30000);
    return () => clearInterval(i);
  }, [refreshPending]);

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
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回前台
          </Button>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            <span className="font-bold">NodeByte Connect 管理后台</span>
          </div>
          <Badge variant="secondary" className="ml-auto">管理员: {user.username}</Badge>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-4">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto">
            <TabsTrigger value="apps" className="flex items-center gap-1.5"><AppWindow className="w-4 h-4" />应用列表</TabsTrigger>
            <TabsTrigger value="reviews" className="flex items-center gap-1.5 relative">
              <FileText className="w-4 h-4" />审核列表
              {pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5"><Users className="w-4 h-4" />用户列表</TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-1.5"><FileText className="w-4 h-4" />用户日志</TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5"><SettingsIcon className="w-4 h-4" />系统设置</TabsTrigger>
          </TabsList>

          <TabsContent value="apps"><AppsTab /></TabsContent>
          <TabsContent value="reviews"><ReviewsTab onChanged={refreshPending} /></TabsContent>
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
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-teal-50 border border-teal-200">
          <span className="text-sm text-teal-700">已选 {selected.size} 项</span>
          <Button size="sm" variant="outline" onClick={() => batchAction("enable")}><Play className="w-3.5 h-3.5 mr-1" />启用</Button>
          <Button size="sm" variant="outline" onClick={() => batchAction("disable")}><Pause className="w-3.5 h-3.5 mr-1" />停用</Button>
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => batchAction("delete")}><Trash2 className="w-3.5 h-3.5 mr-1" />删除</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border">
        <table className="w-full text-sm">
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
              <tr key={a.id} className="border-b hover:bg-slate-50">
                <td className="p-2"><Checkbox checked={selected.has(a.id)} onCheckedChange={() => toggleSelect(a.id)} /></td>
                <td className="p-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                      {a.icon ? <img src={a.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium truncate max-w-[160px]">{a.name}</div>
                      <div className="text-xs text-slate-400 font-mono">{a.appId}</div>
                    </div>
                  </div>
                </td>
                <td className="p-2 text-slate-600">{a.owner?.username || "-"}</td>
                <td className="p-2"><Badge variant="secondary" className="uppercase text-xs">{a.type}</Badge></td>
                <td className="p-2"><Badge className={statusMap[a.status]?.cls || ""} variant="outline">{statusMap[a.status]?.label || a.status}</Badge></td>
                <td className="p-2 text-xs text-slate-500">{new Date(a.createdAt).toLocaleString("zh-CN")}</td>
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
      </div>

      {selected.size > 0 && status === "pending" && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-teal-50 border border-teal-200">
          <span className="text-sm text-teal-700">已选 {selected.size} 项</span>
          <Button size="sm" onClick={() => doAction("approve", Array.from(selected))}><CheckCircle2 className="w-3.5 h-3.5 mr-1" />批量通过</Button>
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => { setRejectMode("batch"); setRejectOpen(true); }}><XCircle className="w-3.5 h-3.5 mr-1" />批量拒绝</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border">
        <table className="w-full text-sm">
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
              <tr key={r.id} className="border-b hover:bg-slate-50">
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
                <td className="p-2 text-xs text-slate-500">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
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
      setUserApps({ user: u, apps: data.apps || [] });
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

  return (
    <Card className="p-4 mt-4">
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="搜索用户名 / 邮箱 / 名称" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} className="pl-9" />
        </div>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-teal-50 border border-teal-200">
          <span className="text-sm text-teal-700">已选 {selected.size} 项</span>
          <Button size="sm" variant="outline" onClick={() => batchAction("block_submit")}><Pause className="w-3.5 h-3.5 mr-1" />停用申请权限</Button>
          <Button size="sm" variant="outline" onClick={() => batchAction("unblock_submit")}><Play className="w-3.5 h-3.5 mr-1" />恢复申请权限</Button>
          <Button size="sm" variant="outline" className="text-rose-600" onClick={() => batchAction("disable_apps")}><Pause className="w-3.5 h-3.5 mr-1" />停用所有应用</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>取消</Button>
        </div>
      )}

      <ScrollArea className="h-[60vh] rounded-lg border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 border-b">
            <tr>
              <th className="p-2 text-left w-8"><Checkbox checked={selected.size === users.length && users.length > 0} onCheckedChange={() => selected.size === users.length ? setSelected(new Set()) : setSelected(new Set(users.map((u) => u.id)))} /></th>
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
            {!loading && users.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-slate-400">暂无数据</td></tr>}
            {users.map((u) => (
              <tr key={u.id} className="border-b hover:bg-slate-50">
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
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{userApps?.user.username} 的应用</DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1">
            <div className="space-y-2">
              {userApps?.apps.length === 0 && <p className="text-center text-slate-400 py-4">暂无应用</p>}
              {userApps?.apps.map((a) => (
                <div key={a.id} className="flex items-center gap-3 p-2 rounded-lg border">
                  <div className="w-10 h-10 rounded bg-slate-50 border flex items-center justify-center overflow-hidden shrink-0">
                    {a.icon ? <img src={a.icon} className="w-full h-full object-contain" alt="" /> : <ImageIcon className="w-4 h-4 text-slate-300" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{a.name}</div>
                    <div className="text-xs text-slate-400 font-mono">{a.appId}</div>
                  </div>
                  <Badge variant="outline">{a.status}</Badge>
                  {a.status !== "disabled" && a.status !== "rejected" && (
                    <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => disableApp(a.id)}><Pause className="w-3.5 h-3.5" /></Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
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

      <ScrollArea className="h-[60vh] rounded-lg border">
        <table className="w-full text-sm">
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
              <tr key={l.id} className="border-b hover:bg-slate-50">
                <td className="p-2 text-xs text-slate-500 whitespace-nowrap">{new Date(l.createdAt).toLocaleString("zh-CN")}</td>
                <td className="p-2 text-slate-700">{l.user?.username || <span className="text-slate-400">系统</span>}</td>
                <td className="p-2"><Badge variant="outline" className="text-xs font-mono">{l.action}</Badge></td>
                <td className="p-2 text-slate-600 text-xs max-w-[300px] truncate">{l.details}</td>
                <td className="p-2 text-xs text-slate-400 font-mono">{l.ip || "-"}</td>
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
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(d => setSettings(d.settings)).catch(() => toast.error("加载失败"));
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
      toast.success("已保存");
    } catch { toast.error("网络错误"); }
    finally { setSaving(false); }
  };

  if (!settings) return <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>;

  return (
    <Card className="p-6 mt-4 max-w-2xl">
      <div className="space-y-5">
        <div className="space-y-2">
          <Label>每个用户最大应用数</Label>
          <Input type="number" value={settings.maxAppsPerUser} onChange={(e) => setSettings({ ...settings, maxAppsPerUser: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>申请应用最低社区等级 (Trust Level)</Label>
          <Input type="number" min={0} max={4} value={settings.minTrustLevel} onChange={(e) => setSettings({ ...settings, minTrustLevel: Number(e.target.value) })} />
        </div>
        <div className="space-y-2">
          <Label>会话超时时间（分钟）</Label>
          <Input type="number" value={settings.sessionTimeoutMin} onChange={(e) => setSettings({ ...settings, sessionTimeoutMin: Number(e.target.value) })} />
        </div>

        <div className="space-y-3 pt-2 border-t">
          <div className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Bell className="w-4 h-4" /> 站内信通知开关</div>
          <ToggleRow label="用户提交应用时通知管理员" checked={settings.notifyOnSubmit} onChange={(v) => setSettings({ ...settings, notifyOnSubmit: v })} />
          <ToggleRow label="审核通过时通知用户" checked={settings.notifyOnApprove} onChange={(v) => setSettings({ ...settings, notifyOnApprove: v })} />
          <ToggleRow label="审核拒绝时通知用户" checked={settings.notifyOnReject} onChange={(v) => setSettings({ ...settings, notifyOnReject: v })} />
          <ToggleRow label="验证失败 / 异常时通知用户" checked={settings.notifyOnFail} onChange={(v) => setSettings({ ...settings, notifyOnFail: v })} />
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 space-y-1">
          <div>封禁用户自动检查：每 <b>{process.env.NEXT_PUBLIC_BANNED_CHECK || 5}</b> 分钟执行一次（由 Cron 定时任务触发 /api/cron/check-banned）</div>
          <div>系统将通过 Discourse API 批量获取用户状态列表（非逐个查询），自动停用封禁用户的所有应用并清理会话。</div>
        </div>

        <Button onClick={update} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
          保存设置
        </Button>
      </div>
    </Card>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-700">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
