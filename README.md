# NodeByte Connect

> 基于 NodeByte SSO 的统一身份认证系统，提供标准 OIDC 与 OAuth2 服务端接口。

## 功能特性

### 用户端
- **NodeByte SSO 登录** — 自动跳转社区 SSO，登录后获取用户等级、头像、用户名
- **艺术横幅** — "NodeByte Connect" 三色渐变艺术字，头像点击弹出用户信息
- **个人中心** — 只读账户信息与授权内容展示
- **应用管理** — 申请 / 编辑 / 删除应用，支持 OIDC 与 OAuth2 两种类型
- **凭据查看** — 验证账号后显示 APP ID、密钥、完整调用地址（可复制）
- **会话管理** — 查看活跃会话，远程注销
- **安全验证** — 人机验证（SVG 图形 + 逻辑题）、等级检查（后端强制校验）
- **会话安全** — 浏览器关闭即失效（session cookie，无 maxAge）

### 管理后台
- **概览仪表盘** — KPI卡片（计数动画+周环比趋势）、交互式趋势图、Top应用排行
- **应用列表** — 搜索、筛选、批量启用/停用/删除
- **审核列表** — 红点提醒、批量通过/拒绝（含理由）、CSV导出、站内信通知用户
- **用户列表** — 搜索、角色/状态筛选、用户详情弹窗（应用+活动历史）
- **用户日志** — 时间筛选、搜索、导出 CSV、颜色编码标签
- **系统设置** — 分组卡片（基础配置/通知策略/安全风控）、封禁检测手动触发

### OAuth2 / OIDC Provider（标准接口）

| 端点 | 路径 | 说明 |
|------|------|------|
| Authorization | `GET /api/oauth/authorize` | 授权端点，支持 `response_type=code` |
| Token | `POST /api/oauth/token` | Token端点，支持 `authorization_code` + `refresh_token` |
| UserInfo | `GET /api/oauth/userinfo` | 用户信息端点，Bearer Token 认证 |
| OIDC Discovery | `GET /api/oidc/discovery` | OIDC Discovery 文档 |
| JWKS | `GET /api/oidc/jwks` | JWKS 端点 |
| App Info | `GET /api/oauth/appinfo` | 公开应用信息（授权页面用） |

**支持的 Grant Types**: `authorization_code`, `refresh_token`
**支持的 Response Types**: `code`
**支持的 Scopes**: `openid`, `profile`, `email`
**Token 认证方式**: `client_secret_basic`, `client_secret_post`
**ID Token 签名算法**: `HS256`
**Token 返回字段**: `access_token`, `token_type`, `expires_in`, `refresh_token`, `scope`, `id_token`(OIDC)

### 安全
- **后端不信任前端** — 所有敏感操作从DB重新读取用户状态，前端无法绕过等级检查
- **封禁用户自动检测** — Cron 每 5 分钟批量获取用户状态，自动同步 trust_level/admin/moderator，封禁用户自动停用应用
- **HMAC-SHA256 签名** — SSO 协议签名校验 + nonce 防重放
- **HttpOnly Cookie** — 会话安全存储，浏览器关闭即失效
- **回调地址精确匹配** — redirect_uri 必须与预注册完全一致
- **redirect_uri HTTPS 校验** — 回调地址必须 HTTPS（localhost 除外）

## 快速开始

### 1. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env 填入真实配置
```

关键配置项：
- `BASE_URL` — 本系统对外访问地址（如 `https://connect.nodebyte.cn`）
- `DISCOURSE_BASE_URL` — Discourse 站点地址
- `DISCOURSE_CONNECT_URL` — SSO Provider 端点（通常为 `/session/sso_provider`）
- `DISCOURSE_CONNECT_SECRET` — SSO 共享密钥
- `DISCOURSE_API_KEY` / `DISCOURSE_API_USERNAME` — Discourse API 凭据
- `JWT_SECRET` / `SESSION_SECRET` — 随机密钥
- `DATABASE_URL` — MySQL 连接字符串 (`mysql://user:pass@host:port/db`)
- `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` — MySQL 连接参数

### 2. 初始化数据库并启动

```bash
chmod +x init-db.sh start.sh
./init-db.sh
```

`init-db.sh` 会自动：
- 读取 .env 中的 MySQL 连接参数
- 创建数据库（如不存在，utf8mb4）
- 导入 db/schema.sql 建表
- 调用 ./start.sh 启动服务

### 3. 定时任务（封禁检查 + 用户等级同步）

设置 cron 每 5 分钟调用：

```bash
*/5 * * * * curl -s "https://connect.nodebyte.cn/api/cron/check-banned?key=YOUR_CRON_KEY" > /dev/null
```

Cron 任务功能：
- 批量获取所有 Discourse 用户状态
- 自动同步用户等级 (trust_level)
- 自动更新管理员/版主状态
- 检测封禁用户 → 停用所有应用 + 清理会话
- 检测解封用户 → 恢复标记

## Discourse 后台配置

1. 开启「启用 Discourse Connect 提供商」
2. 配置与 `.env` 中 `DISCOURSE_CONNECT_SECRET` 一致的共享密钥
3. 回调域名加入白名单
4. 创建 API Key（用户名为 `system`）

## API 接入

### OIDC Discovery

```
GET https://connect.nodebyte.cn/api/oidc/discovery
```

### 授权码流程（标准 OAuth2 / OIDC）

```
# 1. 引导用户授权
GET https://connect.nodebyte.cn/api/oauth/authorize?
  response_type=code&
  client_id=YOUR_APP_ID&
  redirect_uri=YOUR_CALLBACK&
  scope=openid+profile+email&
  state=RANDOM_STATE

# 2. 用户同意后回调
GET YOUR_CALLBACK?code=AUTH_CODE&state=RANDOM_STATE

# 3. 交换 Token (支持 client_secret_basic 和 client_secret_post)
POST https://connect.nodebyte.cn/api/oauth/token
Content-Type: application/x-www-form-urlencoded
grant_type=authorization_code
client_id=YOUR_APP_ID
client_secret=YOUR_SECRET
code=AUTH_CODE
redirect_uri=YOUR_CALLBACK

# 响应:
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "...",
  "scope": "openid profile email",
  "id_token": "..."  // 仅 OIDC (scope 含 openid)
}

# 4. 获取用户信息
GET https://connect.nodebyte.cn/api/oauth/userinfo
Authorization: Bearer ACCESS_TOKEN

# 响应:
{
  "sub": "12345",
  "name": "用户名",
  "preferred_username": "username",
  "email": "user@example.com",
  "email_verified": true,
  "picture": "https://...",
  "trust_level": 2,
  "is_admin": false,
  "is_moderator": false
}

# 5. 刷新 Token
POST https://connect.nodebyte.cn/api/oauth/token
grant_type=refresh_token
client_id=YOUR_APP_ID
client_secret=YOUR_SECRET
refresh_token=REFRESH_TOKEN
```

### 代码示例

凭据查看页面提供 4 种语言的完整接入代码：cURL / JavaScript / Python / HTML

## 技术栈

- Next.js 16 (App Router) + TypeScript 5
- Prisma ORM (MySQL, utf8mb4)
- Tailwind CSS 4 + shadcn/ui
- jose (JWT) + Node crypto (HMAC-SHA256)

## License

MIT
