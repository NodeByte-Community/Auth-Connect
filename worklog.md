# NodeByte Connect - SSO 系统 工作日志

## 项目当前状态描述

NodeByte Connect 是一个基于 Discourse Connect 的统一身份认证 (SSO) 系统，提供 OIDC 与 OAuth2 服务端能力。当前已实现核心功能并通过 agent-browser 端到端验证。

### 技术栈
- Next.js 16 (App Router) + TypeScript 5
- Prisma ORM (SQLite) + Tailwind CSS 4 + shadcn/ui
- jose (JWT) + Node crypto (HMAC-SHA256 SSO 签名)

## 当前目标 / 已完成的修改 / 验证结果

### 已完成功能
1. **Discourse Connect (SSO) 登录**
   - `/api/auth/login` - 发起 SSO 跳转 (HMAC-SHA256 签名)
   - `/api/auth/callback` - 回调验签 + 用户同步 + 会话创建
   - `/api/auth/logout` / `/api/auth/session`
   - 开发模式 dev-login 降级 (未配置真实密钥时)

2. **OAuth2 / OIDC Provider**
   - `/api/oauth/authorize` - 授权端点 (已登录显示同意界面，未登录跳 SSO)
   - `/api/oauth/token` - Token 端点 (authorization_code + refresh_token)
   - `/api/oauth/userinfo` - UserInfo 端点 (Bearer token)
   - `/api/oidc/discovery` - OIDC Discovery 文档
   - `/api/oidc/jwks` - JWKS 端点
   - ID Token 使用 HS256 签名 (JWT)
   - **已验证完整流程**: authorize → consent → code → token → userinfo ✓

3. **用户端**
   - 艺术横幅 "NodeByte Connect" (三色渐变 + 大写 C)
   - 头像点击 → 弹出等级/用户信息
   - 用户名 + 社区 ID 显示
   - 个人中心 (只读账户信息 + 授权内容)
   - 退出登录 (会话级，浏览器关闭失效)
   - 应用列表 + 申请应用按钮
   - 申请表单: 名称/图标(在线预览)/描述/类型(OIDC|OAuth2)/回调地址(多行)/站点LOGO/理由/人机验证
   - 人机验证: SVG 图形验证码 + 逻辑题 (数学/倒序/计数)
   - 等级检查 (前后端双重校验)
   - 应用详情: 验证账号 (Discourse 站内信 5 分钟验证码) → 显示 APP ID/密钥/完整调用地址
   - 凭据可复制、可滑动查看、密钥可显示/隐藏
   - 应用编辑 (修改后需重新审核)
   - 应用删除 (确认弹窗)
   - 拒绝理由展示 + 自动弹出修改界面

4. **管理后台**
   - 自动识别管理员 (Discourse 用户组 + trust_level)
   - 5 个标签页: 应用列表 / 审核列表 / 用户列表 / 用户日志 / 系统设置
   - 应用列表: 搜索(应用名/AppID/用户名) + 筛选(状态/类型) + 批量启用/停用/删除
   - 审核列表: 红点提醒 + 批量通过/拒绝(含理由) + 清理
   - 用户列表: 搜索 + 点击查看用户应用 + 批量停用申请权限/停用所有应用
   - 用户日志: 时间筛选(今天/昨天/7天/自定义) + 搜索 + 导出 CSV + 清空
   - 系统设置: 最大应用数/最低等级/会话超时/通知开关
   - 站内信通知 (提交/通过/拒绝)

5. **安全**
   - 封禁用户自动检查 cron (`/api/cron/check-banned`)
   - 批量获取 Discourse 用户状态列表 (非逐个查询，节省资源)
   - 自动停用封禁用户所有应用 + 清理会话
   - 刷新 trust_level + admin 状态
   - HttpOnly + SameSite Cookie
   - 回调地址 HTTPS 校验
   - 签名验证 + nonce 防重放

6. **外部站点授权流程**
   - 站点 LOGO + 应用描述展示
   - 权限范围展示 (openid/profile/email)
   - 同意/拒绝 → 跳转回调 URL
   - 已登录直接显示授权界面，未登录先跳 SSO 再返回授权 (解决回调到主页问题)

### 验证结果
- ✅ 页面渲染正常 (横幅/按钮/列表)
- ✅ Dev 登录 (普通用户 + 管理员)
- ✅ 申请应用 (含人机验证) → 待审核
- ✅ 管理员审核通过 → 红点消失
- ✅ 应用详情 → 验证账号 → 显示凭据 (APP ID/密钥/调用地址)
- ✅ OAuth2 授权流程: authorize → consent → code → callback
- ✅ Token 交换: code → access_token + refresh_token + id_token
- ✅ UserInfo 端点返回正确用户信息
- ✅ ID Token 正确签名 (HS256 JWT)
- ✅ OIDC Discovery + JWKS 端点
- ✅ 管理后台 5 标签页正常
- ✅ Lint 通过

## 未解决问题或风险

1. **Discourse API 未配置真实凭据** - 站内信发送在开发模式下降级返回验证码；生产需配置真实 DISCOURSE_API_KEY/USERNAME
2. **Cron 定时任务** - 需要外部 cron 调用 `/api/cron/check-banned?key=xxx` 每 5 分钟一次
3. ~~GitHub 推送~~ ✅ 已完成: 仓库 cshdotcom/nbconnect 已创建，源码已推送，Tag v1.0.0 已打，Standalone 包已上传 Release
4. ~~Standalone 打包~~ ✅ 已完成: next.config.ts 已配置 output: "standalone"，构建成功 (53MB tarball)
5. ~~15 分钟 web dev review cron~~ ✅ 已创建 (job_id: 286497)
6. **JWKS** - 当前使用 HS256 对称签名，JWKS 返回空 keys 集；如需 RS256 非对称签名需额外实现 RSA 密钥对
7. **Lint** - ✅ 已全部通过

## GitHub 发布信息
- 仓库: https://github.com/cshdotcom/nbconnect
- Tag: v1.0.0
- Release: https://github.com/cshdotcom/nbconnect/releases/tag/v1.0.0
- Standalone 下载: https://github.com/cshdotcom/nbconnect/releases/download/v1.0.0/nbconnect-standalone-v1.0.0.tar.gz

## 下一阶段优先事项
1. 持续 UI/UX 细节打磨（由 15 分钟 cron 自动推进）
2. 配置真实 Discourse 凭据后端到端测试
3. 可选: RS256 非对称签名 + RSA JWKS
4. 可选: PKCE 支持
5. 可选: 更丰富的权限范围 (trust_level 自定义 scope)
