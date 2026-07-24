"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { RefreshCw, Loader2, Plus, Image as ImageIcon, Info, ShieldCheck, KeyRound, Settings, MessageSquare } from "lucide-react";

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span className="text-teal-600">{icon}</span>
        {title}
      </div>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  onCreated: () => void;
  trustLevel: number;
  minTrustLevel: number;
}

export function ApplyAppDialog({ open, onOpenChange, onCreated, trustLevel, minTrustLevel }: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("oidc");
  const [callbackUrls, setCallbackUrls] = useState("");
  const [siteLogo, setSiteLogo] = useState("");
  const [reason, setReason] = useState("");
  const [captcha, setCaptcha] = useState<{ captchaId: string; type: string; svg?: string; question?: string } | null>(null);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loadingCaptcha, setLoadingCaptcha] = useState(false);
  const iconPreviewRef = useRef<HTMLImageElement>(null);

  const fetchCaptcha = async () => {
    setLoadingCaptcha(true);
    try {
      const res = await fetch("/api/captcha");
      const data = await res.json();
      setCaptcha(data);
      setCaptchaAnswer("");
    } catch {
      toast.error("验证码加载失败");
    } finally {
      setLoadingCaptcha(false);
    }
  };

  useEffect(() => {
    if (open) fetchCaptcha();
  }, [open]);

  const handleSubmit = async () => {
    if (trustLevel < minTrustLevel) {
      toast.error(`您的等级未达到要求（需 Trust Level ${minTrustLevel}）`);
      return;
    }
    if (!name || !description || !callbackUrls || !reason) {
      toast.error("请填写所有必填字段");
      return;
    }
    if (!captcha || !captchaAnswer) {
      toast.error("请完成人机验证");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/apps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, icon, description, type, callbackUrls, siteLogo, reason, captchaId: captcha.captchaId, captchaAnswer }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "提交失败");
        fetchCaptcha();
        setSubmitting(false);
        return;
      }
      toast.success("应用已提交，等待管理员审核");
      onOpenChange(false);
      onCreated();
      // reset
      setName(""); setIcon(""); setDescription(""); setCallbackUrls(""); setSiteLogo(""); setReason(""); setCaptchaAnswer("");
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-teal-600" /> 申请应用
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto pr-2 space-y-5 flex-1">
          {trustLevel < minTrustLevel && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              您当前的社区等级为 Trust Level {trustLevel}，未达到最低要求 Trust Level {minTrustLevel}，无法申请应用。
            </div>
          )}

          {/* Section: 基础信息 */}
          <SectionTitle icon={<Info className="w-3.5 h-3.5" />} title="基础信息" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>应用名称 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="我的应用" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>应用类型 *</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setType("oidc")}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${type === "oidc" ? "border-teal-500 bg-teal-50 text-teal-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}
                >
                  <ShieldCheck className="w-5 h-5" />
                  <span className="text-xs font-semibold">OIDC</span>
                  <span className="text-[10px] opacity-70">OpenID Connect</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("oauth2")}
                  className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-all ${type === "oauth2" ? "border-fuchsia-500 bg-fuchsia-50 text-fuchsia-700" : "border-slate-200 hover:border-slate-300 text-slate-600"}`}
                >
                  <KeyRound className="w-5 h-5" />
                  <span className="text-xs font-semibold">OAuth 2.0</span>
                  <span className="text-[10px] opacity-70">标准授权</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>应用描述 *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要描述应用用途..." rows={3} maxLength={2000} />
          </div>

          {/* Section: 品牌外观 */}
          <SectionTitle icon={<ImageIcon className="w-3.5 h-3.5" />} title="品牌与外观" />
          <div className="space-y-1.5">
            <Label>应用图标 URL <span className="text-xs text-slate-400 font-normal">（留空将自动从回调地址识别）</span></Label>
            <div className="flex gap-2 items-start">
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://example.com/logo.png（留空自动识别）" />
              <div className="w-12 h-12 rounded-lg border flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                {(() => {
                  let displayUrl = icon;
                  if (!displayUrl && callbackUrls) {
                    try {
                      const firstUrl = callbackUrls.split("\n")[0].trim();
                      if (firstUrl) displayUrl = `https://www.google.com/s2/favicons?domain=${new URL(firstUrl).hostname}&sz=64`;
                    } catch {}
                  }
                  if (displayUrl) {
                    return <img src={displayUrl} alt="preview" className="w-full h-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />;
                  }
                  return <ImageIcon className="w-5 h-5 text-slate-300" />;
                })()}
              </div>
            </div>
            {!icon && callbackUrls && (() => {
              try {
                const firstUrl = callbackUrls.split("\n")[0].trim();
                if (firstUrl) {
                  const domain = new URL(firstUrl).hostname;
                  return <p className="text-[10px] text-teal-600">✓ 将自动使用 {domain} 的 favicon 作为图标</p>;
                }
              } catch {}
              return null;
            })()}
          </div>

          <div className="space-y-1.5">
            <Label>站点 LOGO URL <span className="text-xs text-slate-400 font-normal">（授权页面展示，留空自动识别）</span></Label>
            <Input value={siteLogo} onChange={(e) => setSiteLogo(e.target.value)} placeholder="https://example.com/site-logo.png（留空自动识别）" />
            {!siteLogo && callbackUrls && (() => {
              try {
                const firstUrl = callbackUrls.split("\n")[0].trim();
                if (firstUrl) {
                  const domain = new URL(firstUrl).hostname;
                  return <p className="text-[10px] text-teal-600">✓ 将自动使用 {domain} 的 favicon 作为站点 LOGO</p>;
                }
              } catch {}
              return null;
            })()}
          </div>

          {/* Section: 技术配置 */}
          <SectionTitle icon={<Settings className="w-3.5 h-3.5" />} title="技术配置" />
          <div className="space-y-1.5">
            <Label>回调地址（一行一个，必须 HTTPS）*</Label>
            <Textarea value={callbackUrls} onChange={(e) => setCallbackUrls(e.target.value)} placeholder={"https://example.com/auth/callback\nhttps://example.com/auth/callback2"} rows={3} />
            <p className="text-xs text-slate-500 flex items-center gap-1"><Info className="w-3 h-3" /> 授权成功后会将 code 重定向到此处，本地开发可用 http://localhost</p>
          </div>

          {/* Section: 审核 */}
          <SectionTitle icon={<MessageSquare className="w-3.5 h-3.5" />} title="审核信息" />
          <div className="space-y-1.5">
            <Label>申请理由 *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="为什么需要接入此系统..." rows={2} maxLength={500} />
          </div>

          {/* Captcha */}
          <div className="space-y-1.5">
            <Label>人机验证 *</Label>
            <div className="rounded-lg border p-3 bg-slate-50 space-y-2 min-h-[80px]">
              {loadingCaptcha && (
                <div className="space-y-2">
                  <div className="h-10 bg-slate-200 rounded animate-pulse" />
                  <div className="h-8 bg-slate-200 rounded animate-pulse w-2/3" />
                </div>
              )}
              {!loadingCaptcha && !captcha && (
                <div className="text-sm text-slate-400 text-center py-2">验证码加载失败</div>
              )}
              {captcha && !loadingCaptcha && (
                <>
                  {captcha.type === "svg" ? (
                    <div className="flex items-center gap-3">
                      <div className="rounded bg-white border p-1" dangerouslySetInnerHTML={{ __html: captcha.svg || "" }} />
                      <Button type="button" variant="ghost" size="sm" onClick={fetchCaptcha}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-slate-700">{captcha.question}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={fetchCaptcha}><RefreshCw className="w-4 h-4" /></Button>
                    </div>
                  )}
                  <Input value={captchaAnswer} onChange={(e) => setCaptchaAnswer(e.target.value)} placeholder="请输入验证结果" className="bg-white" />
                </>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSubmit} disabled={submitting || trustLevel < minTrustLevel}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
            提交申请
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
