import { db } from "@/lib/db";
import { getUserByExternalId } from "@/lib/discourse";

export interface SecurityCheckResult {
  ok: boolean;
  error?: string;
  user?: {
    id: string;
    trustLevel: number;
    isAdmin: boolean;
    isBanned: boolean;
    isSuspended: boolean;
    appSubmitBlocked: boolean;
  };
}

/**
 * 后端安全校验：不信任前端传入的 session 数据，每次从 DB 重新读取最新状态。
 * 可选：实时从 Discourse API 获取最新 trust_level（防降级绕过）。
 *
 * @param userId - 用户ID
 * @param options.checkDiscourse - 是否实时查询Discourse API（默认false，敏感操作时启用）
 */
export async function securityCheck(
  userId: string,
  options: { checkDiscourse?: boolean } = {}
): Promise<SecurityCheckResult> {
  // 1. 从DB读取最新用户状态
  const dbUser = await db.user.findUnique({ where: { id: userId } });
  if (!dbUser) {
    return { ok: false, error: "用户不存在" };
  }

  // 2. 检查封禁状态
  if (dbUser.isBanned || dbUser.isSuspended) {
    return { ok: false, error: "您的账号已被封禁" };
  }

  // 3. 可选：实时从Discourse API获取最新trust_level
  let trustLevel = dbUser.trustLevel;
  if (options.checkDiscourse && dbUser.externalId) {
    try {
      const remote = await getUserByExternalId(dbUser.externalId);
      if (remote) {
        trustLevel = remote.trust_level ?? dbUser.trustLevel;

        // 如果Discourse返回的级别与DB不同，更新DB
        if (trustLevel !== dbUser.trustLevel) {
          await db.user.update({
            where: { id: userId },
            data: { trustLevel },
          });
        }

        // 如果Discourse显示用户被封禁，立即停用
        if (remote.silenced || remote.suspended) {
          return { ok: false, error: "您的账号已被封禁" };
        }
      }
    } catch (e) {
      console.error("[securityCheck] Discourse API check failed, using DB value:", e);
      // API失败时使用DB值，不阻塞操作
    }
  }

  return {
    ok: true,
    user: {
      id: dbUser.id,
      trustLevel,
      isAdmin: dbUser.isAdmin,
      isBanned: dbUser.isBanned,
      isSuspended: dbUser.isSuspended,
      appSubmitBlocked: dbUser.appSubmitBlocked,
    },
  };
}

/**
 * 检查用户是否达到申请应用所需的最低等级。
 * 后端强制校验，前端无法绕过。
 *
 * @param userId - 用户ID
 * @returns { ok, error?, minLevel?, userLevel? }
 */
export async function checkTrustLevel(
  userId: string,
  options: { checkDiscourse?: boolean } = {}
): Promise<{
  ok: boolean;
  error?: string;
  minLevel?: number;
  userLevel?: number;
}> {
  // 1. 安全校验（含封禁检查）
  const security = await securityCheck(userId, options);
  if (!security.ok) {
    return { ok: false, error: security.error };
  }

  // 2. 检查申请权限
  if (security.user!.appSubmitBlocked) {
    return { ok: false, error: "您的应用申请权限已被管理员停用" };
  }

  // 3. 获取系统设置中的最低等级要求
  const settings = await db.systemSettings.findUnique({ where: { id: "default" } });
  const minLevel = settings?.minTrustLevel ?? 1;

  // 4. 等级校验（使用DB/Discourse最新值，不信任session快照）
  if (security.user!.trustLevel < minLevel) {
    return {
      ok: false,
      error: `您的等级未达到要求 (需 Trust Level ${minLevel})`,
      minLevel,
      userLevel: security.user!.trustLevel,
    };
  }

  return {
    ok: true,
    minLevel,
    userLevel: security.user!.trustLevel,
  };
}
