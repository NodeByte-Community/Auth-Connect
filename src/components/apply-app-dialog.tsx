"use client";

import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { RefreshCw, Loader2, Plus, Image as ImageIcon } from "lucide-react";

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

        <div className="overflow-y-auto pr-2 space-y-4 flex-1">
          {trustLevel < minTrustLevel && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              您当前的社区等级为 Trust Level {trustLevel}，未达到最低要求 Trust Level {minTrustLevel}，无法申请应用。
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>应用名称 *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="我的应用" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <Label>应用类型 *</Label>
              <RadioGroup value={type} onValueChange={setType} className="flex gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="oidc" id="t-oidc" />
                  <Label htmlFor="t-oidc" className="cursor-pointer font-normal">OIDC</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="oauth2" id="t-oauth2" />
                  <Label htmlFor="t-oauth2" className="cursor-pointer font-normal">OAuth 2.0</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>应用图标 URL（可在线预览）</Label>
            <div className="flex gap-2 items-start">
              <Input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="https://example.com/logo.png" />
              {icon && (
                <div className="w-12 h-12 rounded-lg border flex items-center justify-center overflow-hidden bg-slate-50 shrink-0">
                  <img src={icon} alt="preview" className="w-full h-full object-contain" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                </div>
              )}
              {!icon && <div className="w-12 h-12 rounded-lg border flex items-center justify-center bg-slate-50 shrink-0"><ImageIcon className="w-5 h-5 text-slate-300" /></div>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>站点 LOGO URL（授权页面展示，建议正方形）</Label>
            <Input value={siteLogo} onChange={(e) => setSiteLogo(e.target.value)} placeholder="https://example.com/site-logo.png" />
          </div>

          <div className="space-y-1.5">
            <Label>应用描述 *</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="简要描述应用用途..." rows={3} maxLength={2000} />
          </div>

          <div className="space-y-1.5">
            <Label>回调地址（一行一个，必须 HTTPS）*</Label>
            <Textarea value={callbackUrls} onChange={(e) => setCallbackUrls(e.target.value)} placeholder={"https://example.com/auth/callback\nhttps://example.com/auth/callback2"} rows={3} />
            <p className="text-xs text-slate-400">授权成功后会将 code 重定向到此处，本地开发可用 http://localhost</p>
          </div>

          <div className="space-y-1.5">
            <Label>申请理由 *</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="为什么需要接入此系统..." rows={2} maxLength={500} />
          </div>

          {/* Captcha */}
          <div className="space-y-1.5">
            <Label>人机验证 *</Label>
            <div className="rounded-lg border p-3 bg-slate-50 space-y-2">
              {loadingCaptcha && <div className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> 加载中...</div>}
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
