"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Shield, Crown, Star, Zap } from "lucide-react";
import type { SessionUser } from "@/lib/store";

interface Props {
  user: SessionUser;
  onAvatarClick: () => void;
}

const trustLevelNames = ["新用户", "基本用户", "成员", "活跃用户", "领导者"];

/**
 * Get user initials for avatar fallback.
 * Uses first character of the username (cleaned), uppercase.
 * For Chinese names, uses first character.
 */
function getInitials(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "");
  if (!clean) return "?";
  if (/[\u4e00-\u9fa5]/.test(clean[0])) return clean.slice(0, 1);
  return clean[0].toUpperCase();
}

function levelColor(lv: number) {
  return [
    "from-slate-400 to-slate-500",
    "from-emerald-400 to-teal-500",
    "from-cyan-400 to-blue-500",
    "from-fuchsia-400 to-purple-500",
    "from-amber-400 to-orange-500",
  ][lv] || "from-slate-400 to-slate-500";
}

export function ConnectBanner({ user, onAvatarClick }: Props) {
  return (
    <div className="relative w-full min-h-[180px] sm:h-56 md:h-64 rounded-2xl overflow-hidden shadow-lg">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-100 via-amber-50 to-teal-100" />
      {/* Decorative blobs */}
      <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-gradient-to-br from-rose-300/40 to-fuchsia-300/30 blur-2xl" />
      <div className="absolute -bottom-16 left-1/3 w-52 h-52 rounded-full bg-gradient-to-br from-amber-300/40 to-orange-300/30 blur-3xl" />
      <div className="absolute top-1/4 right-1/4 w-32 h-32 rounded-full bg-gradient-to-br from-teal-300/40 to-emerald-300/30 blur-2xl" />
      <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)", backgroundSize: "20px 20px" }} />

      {/* Layout: flexbox with title left, avatar right - stacks on mobile */}
      <div className="relative h-full flex items-center justify-between gap-3 px-5 sm:px-10 py-4 sm:py-0">
        {/* Artistic title */}
        <div className="flex flex-col gap-0.5 sm:gap-1 select-none min-w-0 flex-1">
          <h1 className="font-black tracking-tight leading-none text-3xl sm:text-5xl md:text-6xl drop-shadow-sm break-words">
            <span className="inline-block bg-gradient-to-r from-rose-600 via-fuchsia-600 to-purple-600 bg-clip-text text-transparent">Node</span>
            <span className="inline-block bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">Byte</span>
            <span className="inline-block ml-1.5 sm:ml-3 bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 bg-clip-text text-transparent">Connect</span>
          </h1>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xl sm:text-3xl md:text-4xl font-black bg-gradient-to-br from-rose-700 via-fuchsia-700 to-teal-700 bg-clip-text text-transparent leading-none">C</span>
            <span className="text-[9px] sm:text-xs text-slate-600 font-semibold tracking-widest leading-tight">ONNECT · 统一身份认证</span>
          </div>
        </div>

        {/* Avatar + user info */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="text-right hidden md:block">
            <div className="text-sm font-semibold text-slate-800 max-w-[140px] truncate">{user.username}</div>
            <div className="text-xs text-slate-500">社区 ID: {user.externalId}</div>
            <div className="flex items-center gap-1 justify-end mt-1">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r ${levelColor(user.trustLevel)}`}>
                {user.trustLevel >= 4 ? <Crown className="w-3 h-3" /> : user.trustLevel >= 3 ? <Star className="w-3 h-3" /> : user.trustLevel >= 1 ? <Zap className="w-3 h-3" /> : null}
                Lv.{user.trustLevel} {trustLevelNames[user.trustLevel] || ""}
              </span>
              {user.isAdmin && (
                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-gradient-to-r from-rose-500 to-fuchsia-600">
                  <Shield className="w-3 h-3" /> 管理员
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onAvatarClick}
            className="group relative rounded-full ring-4 ring-white/60 hover:ring-teal-300 transition-all shadow-xl hover:scale-105 shrink-0"
            aria-label="点击头像查看用户信息"
          >
            <Avatar className="h-14 w-14 sm:h-20 sm:w-20 border-2 border-white">
              {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.username} /> : null}
              <AvatarFallback className="bg-gradient-to-br from-teal-500 via-emerald-500 to-cyan-600 text-white font-bold text-lg sm:text-xl">
                {getInitials(user.username)}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile-only: user info bar below title */}
      <div className="md:hidden absolute bottom-2 left-5 right-5 flex items-center justify-between gap-2 bg-white/40 backdrop-blur-sm rounded-lg px-3 py-1.5">
        <div className="min-w-0">
          <div className="text-xs font-semibold text-slate-800 truncate">{user.username}</div>
          <div className="text-[10px] text-slate-500">ID: {user.externalId}</div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r ${levelColor(user.trustLevel)}`}>
            {user.trustLevel >= 4 ? <Crown className="w-2.5 h-2.5" /> : user.trustLevel >= 1 ? <Zap className="w-2.5 h-2.5" /> : null}
            Lv.{user.trustLevel}
          </span>
          {user.isAdmin && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white bg-gradient-to-r from-rose-500 to-fuchsia-600">
              <Shield className="w-2.5 h-2.5" /> 管理员
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
