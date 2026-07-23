"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Copy, KeyRound, Trash2, Loader2, ShieldCheck, Pencil, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Code } from "lucide-react";

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

interface Props {
  app: AppItem | null;
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onUpdated: () => void;
  onDeleted: () => void;
}

const statusMap: Record<string, { label: string; cls: string }> = {
  pending: { label: "待审核", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  pending_re_review: { label: "待复审", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "已通过", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "已拒绝", cls: "bg-rose-100 text-rose-700 border-rose-200" },
  disabled: { label: "已停用", cls: "bg-slate-200 text-slate-600 border-slate-300" },
};

export function AppDetailDialog({ app, open, onOpenChange, onUpdated, onDeleted }: Props) {
  const [view, setView] = useState<"detail" | "verify" | "credentials" | "edit">("detail");
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [credentials, setCredentials] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [usage, setUsage] = useState<{ totalTokens: number; activeTokens: number; lastUsedAt: string | null } | null>(null);

  // edit state
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("oidc");
  const [editCallbackUrls, setEditCallbackUrls] = useState("");
  const [editSiteLogo, setEditSiteLogo] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    if (open && app) {
      setView("detail");
      setCodeSent(false);
      setCode("");
      setCredentials(null);
      setDeleteConfirm(false);
      setUsage(null);
      setEditName(app.name);
      setEditIcon(app.icon || "");
      setEditDescription(app.description);
      setEditType(app.type);
      setEditCallbackUrls(app.callbackUrls);
      setEditSiteLogo(app.siteLogo || "");
      // Fetch usage stats
      fetch(`/api/apps/${app.id}`)
        .then((r) => r.json())
        .then((data) => { if (data.usage) setUsage(data.usage); })
        .catch(() => {});
    }
  }, [open, app]);

  if (!app) return null;

  const sendCode = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/apps/${app.id}/verify`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "发送失败");
      } else {
        toast.success(data.message || "验证码已发送");
        setCodeSent(true);
        if (data.devCode) {
          // Dev mode: auto-fill the code for testing
          setCode(data.devCode);
          toast.info(`开发模式验证码: ${data.devCode}`, { duration: 8000 });
        }
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setVerifyLoading(false);
    }
  };

  const verifyCode = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/apps/${app.id}/verify`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "验证失败");
      } else {
        setCredentials(data);
        setView("credentials");
        toast.success("验证成功");
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleEdit = async () => {
    setEditSaving(true);
    try {
      const res = await fetch(`/api/apps/${app.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName, icon: editIcon, description: editDescription, type: editType, callbackUrls: editCallbackUrls, siteLogo: editSiteLogo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "修改失败");
      } else {
        toast.success("已修改，等待重新审核");
        onOpenChange(false);
        onUpdated();
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/apps/${app.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "删除失败");
        return;
      }
      toast.success("应用已删除");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("网络错误");
    }
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 已复制`);
  };

  const st = statusMap[app.status] || statusMap.pending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            {app.icon && <img src={app.icon} alt="" className="w-8 h-8 rounded-lg object-contain" />}
            <span>{app.name}</span>
            <Badge className={st.cls} variant="outline">{st.label}</Badge>
            <Badge variant="secondary" className="uppercase">{app.type}</Badge>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2 max-h-[60vh]">
          {view === "detail" && (
            <div className="space-y-4">
              {app.status === "rejected" && app.rejectReason && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                  <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm mb-1">
                    <AlertTriangle className="w-4 h-4" /> 审核未通过
                  </div>
                  <p className="text-sm text-rose-600">{app.rejectReason}</p>
                  <p className="text-xs text-rose-400 mt-2">请修改后重新提交审核。</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={() => setView("edit")}>
                    <Pencil className="w-3.5 h-3.5 mr-1" /> 修改应用
                  </Button>
                </div>
              )}
              {app.status === "disabled" && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  此应用已被停用（可能是账号被封禁或管理员操作），无法使用。如有疑问请联系管理员。
                </div>
              )}

              <div className="rounded-lg border divide-y">
                <Row label="APP ID" value={app.appId} />
                <Row label="类型" value={app.type.toUpperCase()} />
                <Row label="创建时间" value={new Date(app.createdAt).toLocaleString("zh-CN")} />
                <Row label="回调地址" value={app.callbackUrls.replace(/\n/g, ", ")} />
                <Row label="权限范围" value={app.scopes} />
              </div>

              <div className="space-y-1">
                <Label>应用描述</Label>
                <div className="rounded-lg border p-3 text-sm text-slate-700 whitespace-pre-wrap">{app.description}</div>
              </div>

              {/* Usage stats */}
              {usage && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border p-3 text-center bg-gradient-to-br from-teal-50 to-emerald-50">
                    <div className="text-2xl font-black text-teal-700">{usage.totalTokens}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Token 签发总数</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center bg-gradient-to-br from-amber-50 to-orange-50">
                    <div className="text-2xl font-black text-amber-700">{usage.activeTokens}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">活跃 Token</div>
                  </div>
                  <div className="rounded-lg border p-3 text-center bg-gradient-to-br from-fuchsia-50 to-purple-50">
                    <div className="text-xs font-bold text-fuchsia-700 leading-tight pt-1">
                      {usage.lastUsedAt ? new Date(usage.lastUsedAt).toLocaleDateString("zh-CN") : "从未使用"}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-1">最近使用</div>
                  </div>
                </div>
              )}

              {app.status === "approved" && (
                <div className="rounded-lg border border-teal-200 bg-teal-50 p-3">
                  <div className="flex items-center gap-2 text-teal-700 font-semibold text-sm mb-2">
                    <KeyRound className="w-4 h-4" /> 查看凭据
                  </div>
                  <p className="text-xs text-teal-600 mb-3">为保护安全，查看 APP ID、密钥和完整调用地址前需验证账号。验证码将通过 Discourse 站内信发送，5 分钟内有效。</p>
                  <Button size="sm" onClick={() => setView("verify")}>
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" /> 验证账号查看凭据
                  </Button>
                </div>
              )}

              {app.status !== "disabled" && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setView("edit")}><Pencil className="w-3.5 h-3.5 mr-1" />编辑（需重新审核）</Button>
                  <Button variant="outline" size="sm" className="text-rose-600 hover:text-rose-700" onClick={() => setDeleteConfirm(true)}><Trash2 className="w-3.5 h-3.5 mr-1" />删除应用</Button>
                </div>
              )}
            </div>
          )}

          {view === "verify" && (
            <div className="space-y-4">
              <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                <div className="flex items-center gap-2 text-teal-700 font-semibold mb-2">
                  <ShieldCheck className="w-5 h-5" /> 账号验证
                </div>
                <p className="text-sm text-teal-700">系统将通过 Discourse 站内信向 <b>{app.name}</b> 的所有者发送一个 5 分钟有效验证码。</p>
                <p className="text-xs text-teal-600 mt-1">请前往 Discourse 社区 → 个人消息 查看。</p>
                {!codeSent ? (
                  <Button className="mt-3" onClick={sendCode} disabled={verifyLoading}>
                    {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
                    发送验证码到站内信
                  </Button>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Label>输入验证码</Label>
                    <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6位验证码" className="text-lg tracking-widest font-mono" maxLength={6} />
                    <div className="flex gap-2">
                      <Button onClick={verifyCode} disabled={verifyLoading || code.length !== 6}>
                        {verifyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        验证
                      </Button>
                      <Button variant="outline" onClick={sendCode} disabled={verifyLoading}><RefreshCw className="w-4 h-4 mr-1" />重新发送</Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {view === "credentials" && credentials && (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="w-5 h-5" /> 验证成功，以下是您的应用凭据
              </div>

              <CredentialField label="APP ID" value={credentials.appId} onCopy={() => copy(credentials.appId, "APP ID")} />
              <CredentialField label="Client Secret (密钥)" value={credentials.clientSecret} onCopy={() => copy(credentials.clientSecret, "密钥")} masked />

              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><ExternalLink className="w-3.5 h-3.5" /> 完整调用地址</Label>
                <ScrollArea className="h-40 rounded-lg border bg-slate-950 p-3">
                  <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap break-all">
{Object.entries(credentials.endpoints).map(([k, v]) => `${k}:\n${v}`).join("\n\n")}

类型: {credentials.type}
权限范围: {credentials.scopes}
回调地址:
{credentials.callbackUrls}
                  </pre>
                  </ScrollArea>
                <Button size="sm" variant="outline" onClick={() => copy(JSON.stringify(credentials.endpoints, null, 2), "调用地址")} className="mt-1">
                  <Copy className="w-3.5 h-3.5 mr-1" /> 复制全部地址
                </Button>
              </div>

              {/* Quick start integration code */}
              <div className="space-y-1.5">
                <Label className="flex items-center gap-1"><Code className="w-3.5 h-3.5" /> 快速接入代码示例</Label>
                <ScrollArea className="h-44 rounded-lg border bg-slate-950 p-3">
                  <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
{`<!-- 1. 引导用户授权 -->
<a href="${credentials.endpoints.authorize}?response_type=code
  &client_id=${credentials.appId}
  &redirect_uri=YOUR_CALLBACK
  &scope=${credentials.scopes.replace(/\s+/g, "+")}
  &state=RANDOM_STATE">
  使用 NodeByte 登录
</a>

<!-- 2. 回调接收 code，交换 token -->
curl -X POST ${credentials.endpoints.token} \\
  -d "grant_type=authorization_code" \\
  -d "client_id=${credentials.appId}" \\
  -d "client_secret=YOUR_SECRET" \\
  -d "code=AUTH_CODE" \\
  -d "redirect_uri=YOUR_CALLBACK"

<!-- 3. 获取用户信息 -->
curl ${credentials.endpoints.userinfo} \\
  -H "Authorization: Bearer ACCESS_TOKEN"`}
                  </pre>
                </ScrollArea>
                <Button size="sm" variant="outline" onClick={() => copy(`授权: ${credentials.endpoints.authorize}\nToken: ${credentials.endpoints.token}\nUserInfo: ${credentials.endpoints.userinfo}\n\nClient ID: ${credentials.appId}\nScopes: ${credentials.scopes}`, "接入代码")}>
                  <Copy className="w-3.5 h-3.5 mr-1" /> 复制接入说明
                </Button>
              </div>

              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-rose-700 font-semibold text-sm">
                      <Trash2 className="w-4 h-4" /> 删除此应用
                    </div>
                    <p className="text-xs text-rose-500 mt-1">删除后无法恢复，所有接入将失效。</p>
                  </div>
                  <Button size="sm" variant="destructive" onClick={() => setDeleteConfirm(true)}>删除</Button>
                </div>
              </div>
            </div>
          )}

          {view === "edit" && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>应用名称</Label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>应用类型</Label>
                  <RadioGroup value={editType} onValueChange={setEditType} className="flex gap-4 pt-2">
                    <div className="flex items-center gap-2"><RadioGroupItem value="oidc" id="e-oidc" /><Label htmlFor="e-oidc" className="font-normal">OIDC</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="oauth2" id="e-oauth2" /><Label htmlFor="e-oauth2" className="font-normal">OAuth2</Label></div>
                  </RadioGroup>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>应用图标 URL</Label>
                <Input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>站点 LOGO URL</Label>
                <Input value={editSiteLogo} onChange={(e) => setEditSiteLogo(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>应用描述</Label>
                <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label>回调地址（一行一个）</Label>
                <Textarea value={editCallbackUrls} onChange={(e) => setEditCallbackUrls(e.target.value)} rows={3} />
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
                修改后需重新审核。
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="border-t pt-3">
          {view === "edit" ? (
            <>
              <Button variant="outline" onClick={() => setView("detail")}>返回</Button>
              <Button onClick={handleEdit} disabled={editSaving}>{editSaving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}保存修改</Button>
            </>
          ) : view === "credentials" ? (
            <Button variant="outline" onClick={() => setView("detail")}>关闭</Button>
          ) : view === "verify" ? (
            <Button variant="outline" onClick={() => setView("detail")}>返回</Button>
          ) : (
            <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Delete confirm */}
      <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600"><AlertTriangle className="w-5 h-5" /> 确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">确定要删除应用 <b>{app.name}</b> 吗？此操作不可恢复，所有已接入的站点将无法再使用此应用登录。</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(false)}>取消</Button>
            <Button variant="destructive" onClick={handleDelete}>确认删除</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="text-xs text-slate-400 w-24 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 truncate flex-1 text-right font-mono">{value}</span>
    </div>
  );
}

function CredentialField({ label, value, onCopy, masked }: { label: string; value: string; onCopy: () => void; masked?: boolean }) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <ScrollArea className="flex-1 h-10 rounded-lg border bg-slate-950">
          <code className={`block px-3 py-2 text-xs font-mono ${masked && !show ? "text-slate-600" : "text-emerald-400"} break-all`}>
            {masked && !show ? "••••••••••••••••••••••••••••••••" : value}
          </code>
        </ScrollArea>
        {masked && (
          <Button size="sm" variant="outline" onClick={() => setShow(!show)}>{show ? "隐藏" : "显示"}</Button>
        )}
        <Button size="sm" variant="outline" onClick={onCopy}><Copy className="w-3.5 h-3.5" /></Button>
      </div>
    </div>
  );
}
