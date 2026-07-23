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

---

## 第二轮迭代 (2025-01-23) — 视觉优化 + 新功能

### 项目当前状态描述
系统核心功能已稳定运行，本轮聚焦于 VLM 视觉审计反馈的修复 + 高价值新功能开发。所有改动通过 agent-browser + VLM 验证。

### 当前目标 / 已完成的修改 / 验证结果

#### 视觉优化（基于 VLM QA 反馈）
1. **横幅文字对比度** — 渐变色从 -500 加深到 -600/-700，添加 drop-shadow-sm，副标题文字加深为 slate-600
2. **应用卡片视觉权重** — 添加左侧彩色渐变竖条（按状态着色），图标容器升级为渐变背景+圆角+hover缩放，App ID 文字加深
3. **头像 Fallback** — 从 "AD"（admin_demo 两部分首字母）改为单字符首字母，避免 "AD=广告" 歧义，支持中文名首字
4. **Admin Tab 图标统一** — 全部使用线性图标（LayoutDashboard/AppWindow/ScrollText/Users/Activity/Settings），新增"概览"为默认 Tab
5. **Admin 表格 App ID 对比度** — slate-400 → slate-600，更易读
6. **日期格式标准化** — 所有 `toLocaleString("zh-CN")` → ISO 8601 `fmtDate()` (YYYY-MM-DD HH:mm:ss)
7. **授权同意页面** — 按钮等高 (h-11)，重定向 URL 文字加深+背景框+font-mono
8. **申请应用对话框** — 分组（基础信息/品牌外观/技术配置/审核信息）+ 分段控制器选择应用类型 + 验证码 skeleton 加载态

#### 新功能
1. **管理后台概览仪表盘** (`/api/admin/stats` + OverviewTab)
   - 4 个 KPI 卡片（应用总数/注册用户/Token签发/待审核）带渐变图标+高亮动画
   - 应用状态分布进度条
   - 近 14 天趋势柱状图（新增应用 + Token 签发双系列）
   - Token 签发 Top 5 应用排行
   - 最近活动时间线（带 action 中文翻译）
   - 系统状态健康检查面板
2. **应用使用统计** — 应用详情对话框显示 Token 签发总数/活跃Token/最近使用时间三个统计卡片
3. **会话管理** (`/api/sessions` + SessionManager 组件)
   - 查看所有活跃会话（标记当前会话）
   - 注销单个会话
   - 一键注销所有其他会话
4. **内联 API 接入代码示例** — 凭据查看页面显示完整的 3 步接入代码（授权/Token交换/UserInfo），含 curl 示例

#### 验证结果
- ✅ Lint 全部通过
- ✅ Dev server 运行正常 (HTTP 200)
- ✅ 概览仪表盘渲染正常（KPI/图表/列表/活动）
- ✅ 应用卡片左侧竖条 + hover 效果
- ✅ 会话管理对话框正常（显示当前会话+注销）
- ✅ 应用使用统计显示正确（Token签发1/活跃1/最近使用）
- ✅ 凭据页代码示例完整显示
- ✅ VLM 视觉评分 7/10（数据量少导致图表单薄，功能完整）

### 未解决问题或风险
1. 趋势图在数据量少时较单薄（需真实数据填充）
2. 代码示例目前仅 HTML/cURL，可扩展 JS/Python/Java 多语言 Tab
3. 密钥暂无"重新生成"功能（可作为下一期安全增强）
4. 会话管理暂未记录 User-Agent/设备信息（显示统一"浏览器会话"）

### 建议下一阶段优先事项
1. 密钥重新生成功能（安全增强）
2. 多语言代码示例 Tab（JS/Python/Java）
3. 会话设备识别（User-Agent 解析）
4. PKCE 支持（OAuth2 安全增强）
5. Webhook 事件通知（应用接入事件回调）
6. 应用健康检查（定期 ping 回调地址）
7. 暗黑模式支持
8. 国际化 (i18n) 中英文切换

---

## 第三轮迭代 (2025-01-23) — 关闭开发模式 + 登录页重构 + 功能完善

### 项目当前状态描述
用户要求：关闭开发模式与测试模式，登录界面仅显示登录按钮与品牌，管理员与用户共用同一登录按钮，登录后检查是否管理员自动显示后台按钮。同时完成上一轮遗留的 HealthCheck 组件和密钥重新生成功能。

### 当前目标 / 已完成的修改 / 验证结果

#### 关闭开发模式
1. **.env** — `NEXT_PUBLIC_DEV_MODE=false`
2. **删除 dev-login 路由** — `src/app/api/auth/dev-login/` 完全移除
3. **移除 verify route 的 dev fallback** — 不再在 PM 发送失败时返回验证码，直接报错
4. **移除 app-detail-dialog 的 devCode 自动填充** — 验证码必须用户手动从 Discourse 站内信获取

#### 登录页重构（page.tsx）
- 移除 DevLoginPage 组件
- 未登录用户看到**品牌登录页**：渐变背景 + 品牌Logo + "NodeByte Connect" 艺术字 + OIDC/OAuth2/Discourse SSO 标签
- **单一登录按钮**"使用社区账号登录"，不区分管理员/用户
- 点击后跳转 `/api/auth/login` → Discourse SSO
- 登录成功后回调，系统根据 Discourse 返回的 admin/trust_level/group 自动判断是否管理员

#### 管理员自动识别（已验证）
- 登录回调 `/api/auth/callback` 中检查：
  - Discourse 返回的 `admin=true` → isAdmin
  - trust_level >= ADMIN_TRUST_LEVEL (默认4) → isAdmin
  - 属于 ADMIN_GROUP_NAME (默认 admins) 用户组 → isAdmin
- Dashboard 中后台按钮：`{user.isAdmin && <Button>后台</Button>}` — 仅管理员可见
- 普通用户访问 `/?admin=1` → 自动重定向到普通仪表盘（不显示管理后台）

#### 新功能（完成上一轮遗留）
1. **HealthCheck 组件** (`src/components/app-detail-dialog.tsx`)
   - 应用详情中"回调地址健康检查"区块
   - 点击"开始检查"对每个回调 URL 发 HEAD/GET 请求（5s 超时）
   - 显示 HTTP 状态码、响应时间、成功/失败标识
   - API: `POST /api/apps/[id]/health-check`
2. **密钥重新生成** (`src/app/api/apps/[id]/regenerate-secret/`)
   - 凭据查看页显示"重新生成密钥"按钮（amber 警告色）
   - 需验证码确认（复用验证流程）
   - 生成新密钥 + 撤销所有已签发 access token
   - 用户需重新授权
3. **多语言代码示例** (CodeExamples 组件)
   - 凭据页显示 4 种语言 Tab：cURL / JS / Python / HTML
   - 每种语言完整 3 步接入示例（授权/Token交换/UserInfo）
   - 可单独复制

#### Bug 修复
1. **Top 5 apps 头像溢出** — 添加 `overflow-hidden` + `shrink-0` + `truncate`
2. **移动端横幅文字溢出** — 重构 banner 为 flexbox 布局，标题自适应字号 (text-3xl sm:text-5xl)
3. **移动端按钮换行错位** — 改用 grid grid-cols-2 布局，按钮 size="sm"
4. **App ID 移动端溢出** — 添加 `overflow-hidden` + `min-w-0` + `truncate`
5. **DialogContent accessibility warning** — `aria-describedby={undefined}` 移到 `{...props}` 之后避免被覆盖

#### 验证结果
- ✅ Lint 全部通过
- ✅ Dev server HTTP 200
- ✅ 登录页：仅品牌 + 单一登录按钮，无管理员/用户区分
- ✅ 管理员登录后显示"后台"按钮，普通用户不显示
- ✅ 普通用户访问 /?admin=1 被重定向到普通仪表盘
- ✅ 管理后台 6 标签页正常（概览/应用/审核/用户/日志/设置）
- ✅ 应用列表显示 ISO 8601 日期格式
- ✅ 健康检查功能正常（API 返回 200）
- ✅ OAuth 授权流程完整（authorize → consent → code → callback）
- ✅ DialogContent warning 已消除
- ✅ 移动端响应式良好（无溢出）
- ✅ VLM 视觉确认登录页合规

### 未解决问题或风险
1. **Discourse 未配置真实凭据** — 验证码发送、站内信通知、封禁检查 cron 需配置真实 DISCOURSE_API_KEY 后才能端到端测试
2. 密钥重新生成需用户先完成验证流程（获取验证码），UX 可优化为独立验证弹窗
3. 健康检查对需要认证的回调地址会显示"重定向/需认证（可能正常）"

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据进行完整端到端测试
2. PKCE 支持（OAuth2 安全增强）
3. Webhook 事件通知（应用接入事件回调）
4. 暗黑模式支持
5. 国际化 (i18n) 中英文切换
6. User-Agent 解析用于会话设备识别
7. 应用接入统计图表增强（按小时/天/周聚合）

---

## 第四轮迭代 (2025-01-23) — 品牌重命名 Discourse SSO → NodeByte SSO

### 项目当前状态描述
用户要求将所有用户可见的"Discourse SSO/Connect"文案替换为"NodeByte SSO"。底层 API 调用仍为 Discourse，但用户面向的界面统一使用 NodeByte 品牌名。

### 当前目标 / 已完成的修改 / 验证结果

#### 用户可见文案替换（9处）
1. **登录页** (`page.tsx`)
   - 副标题："基于 Discourse Connect" → "基于 NodeByte SSO"
   - 特性标签："Discourse SSO" → "NodeByte SSO"
   - 提示文字："跳转至 Discourse 社区" → "跳转至 NodeByte 社区"
2. **Layout metadata** — description 和 keywords 更新
3. **Dashboard footer** — "基于 Discourse Connect" → "基于 NodeByte SSO"
4. **个人中心** (`personal-center.tsx`)
   - "通过 Discourse 社区账号登录" → "通过 NodeByte 社区账号登录"
   - "前往 Discourse 社区个人设置" → "前往 NodeByte 社区个人设置"
5. **应用详情验证** (`app-detail-dialog.tsx`)
   - "Discourse 站内信" → "NodeByte 站内信"（3处）
   - "Discourse 社区 → 个人消息" → "NodeByte 社区 → 个人消息"
6. **管理后台概览** — "Discourse API" 状态标签 → "NodeByte API"
7. **管理后台设置** — "Discourse API 批量获取" → "NodeByte API 批量获取"
8. **验证码 API 成功消息** — "Discourse 站内信" → "NodeByte 站内信"
9. **代码注释** — login route / sso.ts / verify route 注释更新

#### 保留不动
- `src/lib/discourse.ts` — 文件名和内部函数名（底层调用 Discourse API）
- 环境变量名 `DISCOURSE_*`（配置兼容性）
- 内部代码注释中的 Discourse 技术说明

#### 验证结果
- ✅ Lint 全部通过
- ✅ 登录页：VLM 确认无"Discourse"字样，显示"NodeByte SSO"
- ✅ Dashboard footer："基于 NodeByte SSO"
- ✅ 个人中心："NodeByte 社区账号"、"NodeByte 社区个人设置"
- ✅ 应用验证对话框："NodeByte 站内信"、"NodeByte 社区 → 个人消息"
- ✅ 管理后台概览："NodeByte API" 状态标签
- ✅ 代码已推送 GitHub (commit 7493c56)

### 未解决问题或风险
无。重命名仅涉及用户可见文案，底层 API 调用不受影响。

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据进行完整端到端测试
2. PKCE 支持（OAuth2 安全增强）
3. Webhook 事件通知
4. 暗黑模式支持
5. 国际化 (i18n)

---

## 第五轮迭代 (2025-01-23) — 审核流程端到端验证与修复

### 项目当前状态描述
用户要求检查自动审核并修复。发现数据库被清空（可能由之前的db:push导致），重新创建测试数据后完整验证了审核流程，发现并修复了应用详情对话框的日期格式问题。

### 当前目标 / 已完成的修改 / 验证结果

#### 测试数据重建
数据库被清空，重新创建：
- admin_demo (管理员, Trust Level 4)
- user_demo (普通用户, Trust Level 2)
- 5个测试应用（3个pending + 1个approved + 后续2个pending用于批量测试）

#### 审核流程端到端验证（全部通过）
1. **单个通过** ✅ — 应用状态+审核记录更新为approved，reviewerId/reviewedAt正确记录
2. **单个拒绝** ✅ — 拒绝理由保存到 application.rejectReason 和 appReview.reason
3. **批量通过** ✅ — 多个应用一次性通过
4. **批量拒绝** ✅ — 带理由批量拒绝，理由正确保存到每个应用
5. **编辑后重新审核** ✅ — 应用状态变为 pending_re_review，创建新审核记录，旧记录保留
6. **用户端拒绝展示** ✅ — 显示拒绝理由 + "请修改后重新提交审核" + "修改应用"按钮
7. **状态筛选** ✅ — 待审核/已通过/已拒绝 三种筛选正常
8. **红点提醒** ✅ — 待审核数量实时更新（3→1→0→3→0）
9. **日期格式** ✅ — 审核列表和应用详情均为 ISO 8601 (YYYY-MM-DD HH:mm:ss)

#### Bug 修复
- **app-detail-dialog 日期格式** — `toLocaleString("zh-CN")` → `fmtDate()` (ISO 8601)
  - 修复前：创建时间显示 "2026/7/23 03:30:40"
  - 修复后：创建时间显示 "2026-07-23 03:30:40"
  - 添加 fmtDate helper 函数到组件

#### 验证结果
- ✅ Lint 全部通过
- ✅ 单个通过：DB 验证 status=approved, reviewerId/reviewedAt 正确
- ✅ 单个拒绝：DB 验证 status=rejected, rejectReason 正确
- ✅ 批量通过：pending 列表清空
- ✅ 批量拒绝：3个应用同时拒绝，理由一致
- ✅ 编辑重审：status=pending_re_review, 新审核记录创建
- ✅ 用户端：拒绝理由显示，修改按钮可用
- ✅ 日期格式：ISO 8601 统一
- ✅ 代码已推送 GitHub (commit 93380a7)

### 未解决问题或风险
1. 数据库可能因 db:push --accept-data-loss 被清空，生产环境应使用 migrate 而非 push
2. 审核通知（Discourse PM）因未配置真实 API 凭据未能端到端测试

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. 添加审核记录导出功能
3. 审核超时自动提醒
4. PKCE 支持
5. 暗黑模式

---

## 第六轮迭代 (2025-01-23) — 概览仪表盘增强 + 审核导出

### 项目当前状态描述
系统稳定运行，本轮聚焦于管理后台概览仪表盘的交互性增强和数据可视化改进，以及审核记录导出功能。基于 VLM QA 反馈实现了 KPI 趋势指示器、交互式图表 tooltip、最近审核 widget。

### 当前目标 / 已完成的修改 / 验证结果

#### 新功能
1. **KPI 趋势指示器** (KpiCard 组件)
   - 每个KPI卡片显示周环比涨跌百分比 (↑100% 绿色 / ↓5% 红色 / —0% 灰色)
   - 底部显示"本周 N · 上周 M"对比数据
   - hover 阴影效果
   - API: `/api/admin/stats` 新增 `trends` 字段 (apps/users/tokens 的 current/previous/pct)

2. **交互式趋势图表** (InteractiveChart 组件)
   - 鼠标 hover 柱子显示 tooltip: 日期 + 应用数 + Token数 + 用户数
   - hover 时柱子颜色加深 + 日期标签加粗
   - hover 指示线
   - 替换了原来无交互的静态图表

3. **最近审核决定 widget** (概览页)
   - 显示最近5条审核记录 (通过/拒绝)
   - 每条显示: 应用名、审核人、时间、状态标签
   - API: `/api/admin/stats` 新增 `recentReviews` 字段

4. **审核记录 CSV 导出** (ReviewsTab)
   - 导出按钮支持当前筛选条件 (status + q)
   - CSV 列: 时间/应用名/应用ID/申请者/类型/状态/审核人/理由
   - API: `/api/admin/reviews?export=1` 支持 CSV 导出

5. **快速操作按钮** (概览系统状态卡片)
   - 4个按钮: 查看审核 / 用户日志 / 应用列表 / 系统设置
   - 点击切换到对应标签页 (onNavigate 回调)

#### 布局优化
- 概览页重新排列: KPI → 图表 → 最近审核+Top应用 → 最近活动+系统状态
- 系统状态卡片从4列改为2列，新增快速操作区

#### 验证结果
- ✅ Lint 全部通过
- ✅ KPI 趋势指示器显示正确 (VLM确认: ↗100% 绿色, —0% 灰色)
- ✅ 图表 hover tooltip 正常 (测试: "2026-07-23 应用: 6 Token: 0 用户: 2")
- ✅ 最近审核决定 widget 显示拒绝记录
- ✅ 快速操作按钮导航正常 (点击"查看审核"→切换到审核列表)
- ✅ CSV 导出正常 (curl测试返回完整CSV数据)
- ✅ 代码已推送 GitHub (commit 9b019c0)

### 未解决问题或风险
1. Discourse 站内信通知仍未端到端测试（需真实API凭据）
2. 趋势图在数据量极少时仍较单薄（需真实使用数据填充）

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. PKCE 支持（OAuth2 安全增强）
3. 暗黑模式支持
4. 国际化 (i18n)
5. 应用健康检查定时任务（自动定期ping回调地址）
6. Webhook 事件通知
