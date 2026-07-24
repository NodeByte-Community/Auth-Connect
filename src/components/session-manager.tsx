"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Loader2, Monitor, Smartphone, Trash2, LogOut, Clock, Shield } from "lucide-react";

interface SessionItem {
  id: string;
  tokenPreview: string;
  isCurrent: boolean;
  createdAt: string;
  expiresAt: string;
  device: string;
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
}

export function SessionManager({ open, onOpenChange }: Props) {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      toast.error("加载会话失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchSessions();
  }, [open]);

  const revoke = async (id: string) => {
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "注销失败");
        return;
      }
      toast.success("已注销该会话");
      fetchSessions();
    } catch {
      toast.error("网络错误");
    }
  };

  const revokeAll = async () => {
    if (!confirm("确认注销所有其他会话？这将使其他设备立即登出。")) return;
    try {
      const res = await fetch("/api/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "操作失败");
        return;
      }
      toast.success(`已注销 ${data.revoked} 个其他会话`);
      fetchSessions();
    } catch {
      toast.error("网络错误");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-teal-600" /> 会话管理
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-700 mb-3">
          此处显示您当前所有活跃的登录会话。如发现可疑会话请立即注销。会话在浏览器关闭后自动失效。
        </div>

        <div className="max-h-[50vh] pr-2 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : sessions.length === 0 ? (
            <p className="text-center text-slate-400 py-8 text-sm">暂无活跃会话</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className={`flex items-center gap-3 p-3 rounded-lg border ${s.isCurrent ? "border-teal-300 bg-teal-50" : "border-slate-200"}`}>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.isCurrent ? "bg-teal-100 text-teal-600" : "bg-slate-100 text-slate-500"}`}>
                    <Monitor className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-800">{s.device}</span>
                      {s.isCurrent && <Badge className="bg-teal-500 text-[10px]">当前</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{s.tokenPreview}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      登录: {new Date(s.createdAt).toLocaleString("zh-CN")}
                    </div>
                  </div>
                  {!s.isCurrent && (
                    <Button size="sm" variant="ghost" className="text-rose-600 hover:text-rose-700" onClick={() => revoke(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          {sessions.filter((s) => !s.isCurrent).length > 0 && (
            <Button variant="outline" className="text-rose-600" onClick={revokeAll}>
              <LogOut className="w-4 h-4 mr-1" /> 注销所有其他会话
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
