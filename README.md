# NodeByte Connect

> 基于 Discourse Connect 的统一身份认证 (SSO) 系统，提供 OIDC 与 OAuth2 服务端能力。

## 功能特性

### 用户端
- **Discourse Connect 登录** — 自动跳转社区 SSO，登录后获取用户等级、头像、用户名
- **艺术横幅** — "NodeByte Connect" 三色渐变艺术字，头像点击弹出用户信息
- **个人中心** — 只读账户信息与授权内容展示
- **应用管理** — 申请 / 编辑 / 删除应用，支持 OIDC 与 OAuth2 两种类型
- **凭据查看** — 验证账号后显示 APP ID、密钥、完整调用地址（可复制、可滑动）
- **安全验证** — 人机验证（SVG 图形 + 逻辑题）、等级检查（前后端双重校验）
- **会话安全** — 浏览器关闭即失效

### 管理后台
- **应用列表** — 搜索、筛选、批量启用/停用/删除
- **审核列表** — 红点提醒、批量通过/拒绝（含理由）、站内信通知用户
- **用户列表** — 搜索、查看用户应用、批量停用申请权限
- **用户日志** — 时间筛选、搜索、导出 CSV、一键清空
- **系统设置** — 最大应用数、最低等级、会话超时、通知开关

### OAuth2 / OIDC Provider
- `/api/oauth/authorize` — 授权端点
- `/api/oauth/token` — Token 端点（authorization_code + refresh_token）
- `/api/oauth/userinfo` — UserInfo 端点
- `/api/oidc/discovery` — OIDC Discovery 文档
- `/api/oidc/jwks` — JWKS 端点
- ID Token 使用 HS256 签名

### 安全
- **封禁用户自动检测** — 每 5 分钟批量获取 Discourse 用户状态列表，自动停用封禁用户的所有应用
- **HMAC-SHA256 签名** — SSO 协议签名校验 + nonce 防重放
- **HttpOnly Cookie** — 会话安全存储
- **回调地址 HTTPS 校验**

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入真实配置
```

关键配置项：
- `DISCOURSE_BASE_URL` — Discourse 站点地址
- `DISCOURSE_CONNECT_URL` — SSO Provider 端点（通常为 `/session/sso_provider`）
- `DISCOURSE_CONNECT_SECRET` — SSO 共享密钥
- `DISCOURSE_API_KEY` / `DISCOURSE_API_USERNAME` — Discourse API 凭据（用于站内信和用户状态检查）
- `JWT_SECRET` / `SESSION_SECRET` — 随机密钥
- `BASE_URL` — 本系统对外访问地址

### 2. 启动

```bash
chmod +x start.sh
./start.sh
```

脚本会自动：
- 检查 .env
- 同步数据库
- 构建 standalone 包（如未构建）
- 启动生产服务器

### 3. 定时任务（封禁检查）

设置 cron 每 5 分钟调用：

```bash
*/5 * * * * curl -s "https://connect.nodebyte.cn/api/cron/check-banned?key=YOUR_CRON_KEY" > /dev/null
```

## Discourse 后台配置

1. 开启「启用 Discourse Connect 提供商」
2. 配置与 `.env` 中 `DISCOURSE_CONNECT_SECRET` 一致的共享密钥
3. 回调域名加入白名单
4. 创建 API Key（用户名为 `system` 或管理员）

## API 接入

### OIDC Discovery

```
GET https://connect.nodebyte.cn/api/oidc/discovery
```

### 授权码流程

```
1. 引导用户访问:
   https://connect.nodebyte.cn/api/oauth/authorize?response_type=code&client_id=YOUR_APP_ID&redirect_uri=YOUR_CALLBACK&scope=openid+profile+email&state=RANDOM

2. 用户同意后回调:
   YOUR_CALLBACK?code=AUTH_CODE&state=RANDOM

3. 交换 Token:
   POST https://connect.nodebyte.cn/api/oauth/token
   Content-Type: application/x-www-form-urlencoded
   grant_type=authorization_code&client_id=YOUR_APP_ID&client_secret=YOUR_SECRET&code=AUTH_CODE&redirect_uri=YOUR_CALLBACK

4. 获取用户信息:
   GET https://connect.nodebyte.cn/api/oauth/userinfo
   Authorization: Bearer ACCESS_TOKEN
```

## 技术栈

- Next.js 16 (App Router) + TypeScript 5
- Prisma ORM (SQLite)
- Tailwind CSS 4 + shadcn/ui
- jose (JWT) + Node crypto (HMAC-SHA256)

## License

MIT
