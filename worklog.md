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

---

## 第七轮迭代 (2025-01-23) — 数据可视化增强 + 微交互

### 项目当前状态描述
基于 VLM QA 反馈，本轮聚焦于数据可视化的空状态处理、KPI 数字计数动画、应用详情迷你图表。所有改动通过 agent-browser + VLM 验证。

### 当前目标 / 已完成的修改 / 验证结果

#### 新功能
1. **KPI 数字计数动画** (CountUp 组件)
   - 使用 requestAnimationFrame + easeOutCubic 缓动函数
   - 800ms 动画时长，tabular-nums 等宽数字
   - useRef 跟踪上一次值实现增量动画

2. **趋势图空状态** (InteractiveChart)
   - 当14天无任何数据时显示友好提示
   - Activity 图标 + "过去 14 天暂无活动记录"
   - 避免空白图表造成困惑

3. **KPI 绝对变化指示器**
   - 趋势百分比旁增加 "+N 较上周" 绝对数值
   - 替换原来的"本周N·上周M"为更直观的对比

4. **应用详情 4 统计卡片** (从3个扩展到4个)
   - Token 签发 / 活跃 Token / 授权次数 / 最近使用
   - 授权次数 (authCount) 新增 - 统计 authCode 记录数

5. **应用详情 7 天迷你图表** (MiniChart 组件)
   - 近 7 天 Token 签发柱状图
   - hover tooltip 显示日期+次数
   - 空状态显示"暂无 Token 签发记录"
   - API 新增 dailyUsage (7天数组) + authCount

#### 技术细节
- InteractiveChart 柱子颜色改为 inline style (避免 Tailwind 动态类名问题)
- CountUp 使用 useRef 避免 effect 内同步 setState lint 错误
- MiniChart 复用 InteractiveChart 的 hover 模式

#### 验证结果
- ✅ Lint 全部通过
- ✅ KPI CountUp 动画正常 (VLM确认数字: 6/2/8/0)
- ✅ 趋势图空状态友好提示
- ✅ 应用详情4统计卡片 (VLM确认: 8/0/0/2026-7-22)
- ✅ 迷你图表显示柱状图 (VLM确认: 柱状图形式展示7天趋势)
- ✅ 迷你图表空状态正确 (rejected app 显示"暂无记录")
- ✅ hover tooltip 正常
- ✅ 代码已推送 GitHub (commit 9450925)

### 未解决问题或风险
1. Top 5 应用列表数据较少（仅1个应用有Token记录）
2. 趋势图数据集中在最后一天（需真实使用数据分布）

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. PKCE 支持（OAuth2 安全增强）
3. 暗黑模式支持
4. 国际化 (i18n)
5. 应用健康检查定时任务
6. Webhook 事件通知
7. 管理员用户详情弹窗（完整活动历史）

---

## 第八轮迭代 (2025-01-23) — 用户仪表盘增强 + 应用卡片交互

### 项目当前状态描述
基于 VLM QA 对移动端和桌面端的反馈，本轮聚焦于用户仪表盘的信息密度提升和应用卡片交互优化。

### 当前目标 / 已完成的修改 / 验证结果

#### 新功能
1. **用户仪表盘统计摘要** (4个StatCard)
   - 应用总数 / 已通过 / 待审核 / 已拒绝停用
   - 每个卡片带渐变图标 + hover阴影
   - 仅在有应用时显示（空状态不显示）

2. **应用卡片复制APP ID按钮**
   - 每个应用卡片右下角添加复制图标按钮
   - 点击复制APP ID到剪贴板 + toast反馈
   - stopPropagation 防止触发卡片点击

3. **空状态重新设计**
   - 大尺寸图标 (16x16 rounded-2xl 渐变背景)
   - "还没有应用"标题 + 引导文案
   - "申请应用"CTA按钮直接创建

#### 验证结果
- ✅ Lint 全部通过
- ✅ 统计卡片显示正确 (VLM确认: 1/1/0/0)
- ✅ 复制按钮存在 (VLM确认: 📋图标)
- ✅ 空状态友好显示 (VLM确认: 图标+提示+按钮)
- ✅ 空状态时不显示统计卡片
- ✅ 代码已推送 GitHub (commit 17c7d0a)

### 未解决问题或风险
1. Toast反馈可能因duration太短在测试中不易捕获（功能正常）
2. 统计卡片数据来自前端filter，大量应用时可能需优化

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. PKCE 支持（OAuth2 安全增强）
3. 暗黑模式支持
4. 国际化 (i18n)
5. 管理员用户详情弹窗
6. 应用健康检查定时任务

---

## 第九轮迭代 (2025-01-23) — 系统设置页面重构 + 管理员触发封禁检测

### 项目当前状态描述
基于 VLM QA 对设置页面的反馈，本轮重构系统设置页面，添加分组、单位、描述、重置功能，并实现管理员手动触发封禁检测。同时修复了 .env 文件被意外截断的问题。

### 当前目标 / 已完成的修改 / 验证结果

#### 系统设置页面重构
1. **3个分组卡片**
   - 基础配置 (teal渐变图标): 最大应用数/最低等级/会话超时
   - 通知策略 (fuchsia渐变图标): 4个通知开关带描述
   - 安全与风控 (rose渐变图标): 封禁检测说明+立即执行按钮

2. **输入框增强**
   - 添加单位标签 (个/TL/分钟)
   - min/max 属性限制输入范围
   - 辅助说明文字 (如"默认720分钟(12小时)")

3. **ToggleRow 增强**
   - 每个开关添加 description 描述文字
   - 垂直布局 (标题+描述) + 右侧开关

4. **保存/重置功能**
   - 保存按钮: 有更改时可用，无更改时禁用
   - 重置按钮: 恢复上次保存的值
   - "有未保存的更改"指示器 (amber脉冲点)
   - sticky底部操作栏

5. **管理员触发封禁检测**
   - 新API: POST /api/admin/check-banned (admin-only)
   - 设置页"立即执行检测"按钮
   - 显示检测结果: 检查N用户/发现N封禁/停用N应用/清理N会话/耗时Nms
   - 成功/失败状态颜色区分

#### Bug修复
- .env文件被意外截断只剩DATABASE_URL，已恢复完整配置

#### 验证结果
- ✅ Lint 全部通过
- ✅ 3个分组卡片显示正确 (VLM确认)
- ✅ 输入框单位显示 (VLM确认: 个/TL/分钟)
- ✅ 通知开关有描述文字
- ✅ 立即执行检测按钮工作 (测试: "检查3用户，发现0封禁，停用0应用，清理0会话，耗时25ms")
- ✅ 保存/重置按钮功能正常
- ✅ 代码已推送 GitHub (commit ffb90fb)

### 未解决问题或风险
1. Discourse 站内信通知仍未端到端测试
2. PKCE/Webhook/i18n 等高级功能待实现

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. 管理员用户详情弹窗（完整活动历史）
3. PKCE 支持（OAuth2 安全增强）
4. 暗黑模式支持
5. 国际化 (i18n)
6. 应用健康检查定时任务

---

## 第十轮迭代 (2025-01-23) — 管理员用户详情增强 + 用户列表筛选

### 项目当前状态描述
基于 VLM QA 对用户列表和用户详情的反馈，本轮重构管理员用户详情对话框，添加用户信息、统计、活动历史，并为用户列表添加角色/状态筛选器。

### 当前目标 / 已完成的修改 / 验证结果

#### 管理员用户详情对话框重构
1. **用户信息头部** — 头像(首字母fallback)、用户名、等级标签、角色标签(管理员/版主/封禁/禁申)、邮箱、注册时间、最后登录时间
2. **4个应用统计卡片** — 已通过/待审核/已拒绝/已停用数量
3. **增强应用列表** — 彩色状态标签、图标、停用按钮
4. **最近活动区域** — 最近10条操作日志，显示action/details/time/ip

#### API扩展
- `GET /api/admin/users/[id]/apps` 现在返回: user(完整信息) + apps + recentLogs + statusCounts

#### 用户列表筛选器
- 角色筛选: 全部/管理员/版主/普通用户
- 状态筛选: 全部/封禁/禁申/正常
- 前端过滤 (filteredUsers)
- 全选复选框尊重筛选后的列表

#### 验证结果
- ✅ Lint 全部通过
- ✅ 用户详情显示用户信息 (VLM确认: 演示用户@user_demo, Lv.2)
- ✅ 4个统计卡片 (VLM确认: 已通过1/待审核0/已拒绝4/已停用0)
- ✅ 应用列表显示5个应用
- ✅ 最近活动区域显示
- ✅ 角色筛选器工作 (测试: 筛选"管理员"只显示admin_demo)
- ✅ 代码已推送 GitHub (commit 6cb6b62)

### 未解决问题或风险
1. Discourse 站内信通知仍未端到端测试
2. 用户列表筛选为前端过滤，大量用户时应改为后端筛选

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. 后端筛选支持 (users API 接受 role/status 参数)
3. PKCE 支持（OAuth2 安全增强）
4. 暗黑模式支持
5. 国际化 (i18n)
6. 应用健康检查定时任务

---

## 第十一轮迭代 (2025-01-23) — 移动端管理后台响应式修复

### 项目当前状态描述
基于 VLM QA 对移动端管理后台的测试，发现标签页换行、表格溢出、批量操作栏遮挡等问题。本轮全面修复移动端响应式布局。

### 当前目标 / 已完成的修改 / 验证结果

#### 移动端修复
1. **管理后台 Header**
   - 标题响应式: "NodeByte Connect" + "管理后台"(sm以上显示)
   - 返回按钮: 移动端只显示箭头，桌面端显示"返回前台"
   - 管理员标签: 移动端只显示用户名
   - padding: px-3 sm:px-4

2. **标签页横向滚动**
   - 移动端: flex + overflow-x-auto + shrink-0
   - 桌面端: grid grid-cols-6
   - 所有tab添加 shrink-0 防止挤压

3. **表格横向滚动**
   - 4个表格统一: ScrollArea添加 overflow-x-auto
   - table添加 min-w-[640px] 确保最小宽度
   - 移动端可横向滑动查看完整表格

4. **批量操作栏 sticky**
   - 3个批量操作栏(apps/reviews/users): sticky bottom-2 + z-20 + shadow-lg
   - border-teal-300 加强边框
   - flex-wrap + ml-auto 移动端按钮换行
   - 按钮分组(div包裹)便于布局

#### 验证结果
- ✅ Lint 全部通过
- ✅ 移动端标题不换行 (VLM确认)
- ✅ 标签页可横向滚动 (VLM确认)
- ✅ 表格可横向滚动 (VLM确认)
- ✅ 批量操作栏sticky + shadow (VLM确认)
- ✅ 代码已推送 GitHub (commit 72c14c8)

### 未解决问题或风险
1. 移动端表格仍是横向滚动，未来可考虑卡片式布局
2. Discourse 站内信通知仍未端到端测试

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. 移动端表格卡片式布局（可选优化）
3. PKCE 支持（OAuth2 安全增强）
4. 暗黑模式支持
5. 国际化 (i18n)
6. 应用健康检查定时任务

---

## 第十二轮迭代 (2025-01-23) — 表格视觉增强 + 概览页交互优化

### 项目当前状态描述
基于 VLM QA 对日志页面和概览页的反馈，本轮增强表格可读性（斑马纹、颜色编码标签）和概览页交互性（可点击KPI卡片、查看全部链接）。

### 当前目标 / 已完成的修改 / 验证结果

#### 表格视觉增强
1. **斑马纹** — 4个admin表格统一添加 even:bg-slate-50/50，hover改为 teal-50/50
2. **颜色编码日志标签** (actionTagColor函数)
   - 绿色: approve/enable/verify success (ADMIN_REVIEW_APPROVE, OAUTH_APPROVE等)
   - 红色: reject/disable/delete/ban (ADMIN_REVIEW_REJECT, APP_DELETE等)
   - 琥珀色: submit/edit/settings (APP_SUBMIT, APP_EDIT, ADMIN_SETTINGS_UPDATE等)
   - 青色: login/logout/token (LOGIN, LOGOUT, OAUTH_TOKEN_ISSUED)
   - 紫色: dev/session (DEV_LOGIN, SESSION_REVOKE)
3. **日志详情tooltip** — 长文本添加title属性，hover显示完整内容

#### 概览页交互优化
1. **可点击KPI卡片** — 4个KPI卡片添加onClick导航:
   - 应用总数 → apps tab
   - 注册用户 → users tab
   - Token签发 → logs tab
   - 待审核 → reviews tab
   - cursor-pointer + hover:scale-[1.02] 动效
2. **查看全部链接** — 最近审核决定和最近活动区域添加"查看全部 →"按钮

#### 验证结果
- ✅ Lint 全部通过
- ✅ 斑马纹显示 (VLM确认: 奇偶行背景色不同)
- ✅ 颜色编码标签 (VLM确认: 拒绝红色,通过绿色,编辑黄色)
- ✅ KPI卡片点击导航 (测试: 点击应用总数→跳转应用列表)
- ✅ 查看全部链接显示
- ✅ 代码已推送 GitHub (commit 4e9734c)

### 未解决问题或风险
1. Discourse 站内信通知仍未端到端测试
2. 趋势图数据稀疏（需真实使用数据）

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. PKCE 支持（OAuth2 安全增强）
3. 暗黑模式支持
4. 国际化 (i18n)
5. 应用健康检查定时任务

---

## 第十三轮迭代 (2025-01-23) — 授权页面安全增强 + 应用详情复制优化

### 项目当前状态描述
基于 VLM QA 对授权同意页面和应用详情的反馈，本轮增强授权页面的安全提示，并为应用详情信息表格添加复制功能。

### 当前目标 / 已完成的修改 / 验证结果

#### 授权同意页面安全增强
1. **Redirect URL安全提示框**
   - 改为 amber 警告色背景框 (bg-amber-50 border-amber-200)
   - 域名加粗显示为 amber-700 色
   - 添加安全提示文案："请确认您信任此站点，授权后将分享您的账户信息"
   - Lock图标改为 amber-600 色

#### 应用详情复制优化
1. **Row组件增强** — 添加 copyable prop
   - hover显示复制按钮 (opacity-0 group-hover:opacity-100)
   - 复制后显示绿色checkmark 2秒
   - APP ID、回调地址、权限范围 行可复制
2. **交互细节** — group hover效果，按钮hover变teal色

#### 验证结果
- ✅ Lint 全部通过
- ✅ 授权页面amber安全提示框 (VLM确认: 浅黄色背景, 加粗橙色域名)
- ✅ 安全提示文案显示 (VLM确认)
- ✅ 应用详情4个复制按钮 (APP ID/回调地址/权限范围 + 应用卡片)
- ✅ 代码已推送 GitHub (commit 76a50f4)

### 未解决问题或风险
1. Discourse 站内信通知仍未端到端测试
2. "记住选择"复选框未实现（OAuth标准中可选）

### 建议下一阶段优先事项
1. 配置真实 Discourse 凭据测试站内信通知
2. PKCE 支持（OAuth2 安全增强）
3. 暗黑模式支持
4. 国际化 (i18n)
5. 应用健康检查定时任务
6. 应用Logo上传功能（目前只支持URL）

---

## v1.1.0 Release 发布 (2025-01-23)

### 发布内容
- **Tag**: v1.1.0
- **Release**: https://github.com/cshdotcom/nbconnect/releases/tag/v1.1.0
- **Standalone包**: nbconnect-standalone-v1.1.0.tar.gz (52MB)
- **下载地址**: https://github.com/cshdotcom/nbconnect/releases/download/v1.1.0/nbconnect-standalone-v1.1.0.tar.gz

### 版本亮点
v1.1.0 是重大功能更新版本，包含自 v1.0.0 以来的所有迭代改进：

#### 管理后台
- 概览仪表盘 (KPI计数动画+趋势图+Top应用+最近活动)
- 系统设置重构 (3分组+单位+重置+封禁检测手动触发)
- 审核CSV导出
- 用户详情增强 (信息+统计+活动历史)
- 用户列表筛选 (角色/状态)

#### 用户端
- 会话管理
- 密钥重新生成
- 多语言代码示例 (cURL/JS/Python/HTML)
- 应用健康检查
- 应用使用统计 (7天迷你图表)
- 统计摘要卡片

#### OAuth/OIDC
- 授权同意页面安全增强
- 完整授权码流程

#### 视觉优化
- 表格斑马纹+颜色编码日志标签
- KPI卡片可点击导航
- 移动端响应式
- CountUp动画

### 发布状态
- ✅ 源码已推送 main 分支
- ✅ Tag v1.1.0 已创建
- ✅ GitHub Release 已创建 (ID: 358509385)
- ✅ Standalone包已上传 (52MB)
- ✅ 未覆盖 v1.0.0 (两个版本共存)
