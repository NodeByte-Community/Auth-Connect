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
import { Copy, KeyRound, Trash2, Loader2, ShieldCheck, Pencil, RefreshCw, ExternalLink, AlertTriangle, CheckCircle2, Code, HeartPulse, Check, X } from "lucide-react";

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
        toast.success(data.message || "验证码已发送至 Discourse 站内信");
        setCodeSent(true);
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

  const handleRegenSecret = async () => {
    if (!confirm("确认重新生成密钥？\n\n• 旧密钥将立即失效\n• 所有已签发的 access token 将被撤销\n• 用户需重新授权\n\n此操作不可撤销。")) return;
    // Need a verification code - reuse the last sent code if still valid, otherwise prompt user
    if (!code) {
      toast.error("请先返回验证步骤获取验证码，再重新生成密钥");
      setView("verify");
      return;
    }
    try {
      const res = await fetch(`/api/apps/${app.id}/regenerate-secret`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "重新生成失败");
        return;
      }
      toast.success("密钥已重新生成");
      setCredentials({ ...credentials, clientSecret: data.clientSecret });
      setCode(""); // consume code
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

              {/* Health check */}
              {app.status === "approved" && (
                <HealthCheck appId={app.id} />
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

              {/* Regenerate secret */}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-amber-700 font-semibold text-sm">
                      <RefreshCw className="w-4 h-4" /> 重新生成密钥
                    </div>
                    <p className="text-xs text-amber-600 mt-1">密钥泄露后可重新生成。旧密钥立即失效，所有已签发的 access token 将被撤销，用户需重新授权。</p>
                  </div>
                  <Button size="sm" variant="outline" className="text-amber-700 border-amber-300 hover:bg-amber-100 shrink-0" onClick={() => handleRegenSecret()}>
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> 重新生成
                  </Button>
                </div>
              </div>

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

              {/* Multi-language code examples */}
              <CodeExamples credentials={credentials} onCopy={copy} />

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

function CodeExamples({ credentials, onCopy }: { credentials: any; onCopy: (text: string, label: string) => void }) {
  const [lang, setLang] = useState<"curl" | "javascript" | "python" | "html">("curl");

  const examples: Record<string, string> = {
    curl: `# 1. 引导用户授权（浏览器打开）
# ${credentials.endpoints.authorize}?response_type=code&client_id=${credentials.appId}&redirect_uri=YOUR_CALLBACK&scope=${credentials.scopes.replace(/\s+/g, "+")}&state=RANDOM_STATE

# 2. 回调接收 code，交换 token
curl -X POST ${credentials.endpoints.token} \\
  -d "grant_type=authorization_code" \\
  -d "client_id=${credentials.appId}" \\
  -d "client_secret=YOUR_SECRET" \\
  -d "code=AUTH_CODE" \\
  -d "redirect_uri=YOUR_CALLBACK"

# 3. 获取用户信息
curl ${credentials.endpoints.userinfo} \\
  -H "Authorization: Bearer ACCESS_TOKEN"`,
    javascript: `// Node.js / 浏览器 Fetch API

// 1. 引导用户授权（浏览器跳转）
const authUrl = "${credentials.endpoints.authorize}?" + new URLSearchParams({
  response_type: "code",
  client_id: "${credentials.appId}",
  redirect_uri: YOUR_CALLBACK,
  scope: "${credentials.scopes}",
  state: crypto.randomUUID(),
}).toString();
window.location.href = authUrl;

// 2. 回调页：用 code 换 token
const tokenRes = await fetch("${credentials.endpoints.token}", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "authorization_code",
    client_id: "${credentials.appId}",
    client_secret: YOUR_SECRET,
    code: AUTH_CODE,
    redirect_uri: YOUR_CALLBACK,
  }),
});
const { access_token } = await tokenRes.json();

// 3. 获取用户信息
const userRes = await fetch("${credentials.endpoints.userinfo}", {
  headers: { Authorization: \`Bearer \${access_token}\` },
});
const user = await userRes.json();
console.log(user);`,
    python: `# Python (requests 库)
import requests, secrets

# 1. 引导用户授权（Flask 示例）
from flask import redirect
auth_url = f"${credentials.endpoints.authorize}?response_type=code&client_id=${credentials.appId}&redirect_uri=YOUR_CALLBACK&scope=${credentials.scopes.replace(' ', '+')}&state={secrets.token_hex(8)}"
# return redirect(auth_url)

# 2. 回调：用 code 换 token
resp = requests.post("${credentials.endpoints.token}", data={
    "grant_type": "authorization_code",
    "client_id": "${credentials.appId}",
    "client_secret": YOUR_SECRET,
    "code": AUTH_CODE,
    "redirect_uri": YOUR_CALLBACK,
})
access_token = resp.json()["access_token"]

# 3. 获取用户信息
user = requests.get("${credentials.endpoints.userinfo}", headers={
    "Authorization": f"Bearer {access_token}",
}).json()
print(user)`,
    html: `<!-- HTML 接入示例 -->

<!-- 1. 登录按钮 -->
<a href="${credentials.endpoints.authorize}?response_type=code&client_id=${credentials.appId}&redirect_uri=YOUR_CALLBACK&scope=${credentials.scopes.replace(/\s+/g, "+")}&state=RANDOM_STATE">
  使用 NodeByte 登录
</a>

<!-- 2. 回调页接收 code 参数 -->
<script>
const params = new URLSearchParams(location.search);
const code = params.get("code");
if (code) {
  // 发送到后端交换 token（前端不暴露 secret）
  fetch("/api/oauth/exchange", { method: "POST", body: JSON.stringify({ code }) });
}
</script>`,
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1"><Code className="w-3.5 h-3.5" /> 快速接入代码示例</Label>
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {(["curl", "javascript", "python", "html"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2 py-1 text-[11px] font-mono rounded transition-all ${lang === l ? "bg-white text-teal-700 shadow-sm font-bold" : "text-slate-500 hover:text-slate-700"}`}
            >
              {l === "javascript" ? "JS" : l === "python" ? "Python" : l === "html" ? "HTML" : "cURL"}
            </button>
          ))}
        </div>
      </div>
      <ScrollArea className="h-52 rounded-lg border bg-slate-950 p-3">
        <pre className="text-[11px] text-slate-300 font-mono whitespace-pre-wrap break-all leading-relaxed">
{examples[lang]}
        </pre>
      </ScrollArea>
      <Button size="sm" variant="outline" onClick={() => onCopy(examples[lang], `${lang} 代码`)}>
        <Copy className="w-3.5 h-3.5 mr-1" /> 复制 {lang === "javascript" ? "JS" : lang === "python" ? "Python" : lang === "html" ? "HTML" : "cURL"} 代码
      </Button>
    </div>
  );
}

function HealthCheck({ appId }: { appId: string }) {
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch(`/api/apps/${appId}/health-check`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "检查失败");
      } else {
        setResults(data.results);
      }
    } catch {
      toast.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sky-700 font-semibold text-sm">
            <HeartPulse className="w-4 h-4" /> 回调地址健康检查
          </div>
          <p className="text-xs text-sky-600 mt-1">测试回调地址是否可达（5s 超时，HEAD/GET 请求）</p>
        </div>
        <Button size="sm" variant="outline" className="text-sky-700 border-sky-300 hover:bg-sky-100 shrink-0" onClick={runCheck} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <HeartPulse className="w-3.5 h-3.5 mr-1" />}
          {loading ? "检查中..." : "开始检查"}
        </Button>
      </div>
      {results && (
        <div className="mt-3 space-y-1.5">
          {results.map((r: any, i: number) => (
            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg border text-xs ${r.ok ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
              {r.ok ? <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-rose-600 shrink-0" />}
              <span className="font-mono text-slate-600 truncate flex-1 min-w-0">{r.url}</span>
              <Badge variant="outline" className={`shrink-0 ${r.ok ? "text-emerald-700" : "text-rose-700"}`}>
                {r.ok ? `HTTP ${r.status}` : (r.error || `HTTP ${r.status}`)}
              </Badge>
              {r.responseTimeMs != null && <span className="text-slate-400 shrink-0">{r.responseTimeMs}ms</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
