"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { SessionUser } from "@/lib/store";
import { Crown, Star, Zap, Shield, Mail, Hash, User as UserIcon, Calendar, KeyRound, Lock } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (b: boolean) => void;
  user: SessionUser;
}

const trustLevelNames = ["新用户", "基本用户", "成员", "活跃用户", "领导者"];

function getInitials(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "");
  if (!clean) return "?";
  if (/[\u4e00-\u9fa5]/.test(clean[0])) return clean.slice(0, 1);
  return clean[0].toUpperCase();
}

export function PersonalCenter({ open, onOpenChange, user }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-teal-600" />
            个人中心
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[70vh] pr-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Profile header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-br from-teal-50 to-amber-50 border">
              <Avatar className="h-16 w-16 border-2 border-white shadow">
                {user.avatarUrl ? <AvatarImage src={user.avatarUrl} /> : null}
                <AvatarFallback className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white font-bold">
                  {getInitials(user.username)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="font-bold text-lg truncate">{user.name || user.username}</div>
                <div className="text-sm text-slate-500 truncate">@{user.username}</div>
                <div className="flex gap-1 mt-1 flex-wrap">
                  <Badge variant="secondary" className="text-xs">
                    {user.trustLevel >= 4 ? <Crown className="w-3 h-3 mr-1" /> : user.trustLevel >= 3 ? <Star className="w-3 h-3 mr-1" /> : <Zap className="w-3 h-3 mr-1" />}
                    Trust Level {user.trustLevel} · {trustLevelNames[user.trustLevel]}
                  </Badge>
                  {user.isAdmin && <Badge className="bg-rose-500 text-xs"><Shield className="w-3 h-3 mr-1" />管理员</Badge>}
                  {user.isModerator && <Badge className="bg-amber-500 text-xs">版主</Badge>}
                </div>
              </div>
            </div>

            {/* Account info (read-only) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Lock className="w-3 h-3" /> 账户信息（只读，不可更改）
              </div>
              <div className="rounded-xl border divide-y">
                <InfoRow icon={<UserIcon className="w-4 h-4" />} label="用户名" value={user.username} />
                <InfoRow icon={<Mail className="w-4 h-4" />} label="邮箱" value={user.email} />
                <InfoRow icon={<Hash className="w-4 h-4" />} label="社区 ID" value={user.externalId} />
                <InfoRow icon={<Calendar className="w-4 h-4" />} label="显示名称" value={user.name || user.username} />
              </div>
            </div>

            {/* Authorization info */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">已授权内容</div>
              <div className="rounded-xl border p-4 bg-slate-50">
                <p className="text-sm text-slate-600 leading-relaxed">
                  您通过 NodeByte 社区账号登录 NodeByte Connect。系统已获取以下授权内容，且无法在本面板更改：
                </p>
                <ul className="mt-2 space-y-1 text-sm text-slate-700">
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />基础身份信息（用户名、邮箱、显示名、头像）</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />社区信任等级 (Trust Level)</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />管理员 / 版主标识</li>
                  <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-500" />社区用户唯一 ID</li>
                </ul>
                <p className="mt-3 text-xs text-slate-400">如需修改以上信息，请前往 NodeByte 社区个人设置中更改。</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 text-center pt-2">
              会话在浏览器关闭后失效，需重新登录。
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-3">
      <span className="text-slate-400">{icon}</span>
      <span className="text-sm text-slate-500 w-20 shrink-0">{label}</span>
      <span className="text-sm font-medium text-slate-800 truncate flex-1 text-right">{value}</span>
    </div>
  );
}
