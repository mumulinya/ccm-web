# 主 Agent 与 TestAgent 登录态浏览器验收桥接 v1

日期：2026-07-10

## 目标

在不修改 `backend/test-agent/**` 内部业务的前提下，让群聊主 Agent、全局主 Agent 和最终工作链正式消费 TestAgent 已提供的：

```text
report.metadata.browserAuthenticationSummary
```

需要满足：

- 登录态检查通过时，用户能看到检查数量、通过数量和已登录会话数量。
- 登录态检查失败时，即使旧版报告或裁决顶层写着 `passed/accept`，主 Agent 也必须进入返工。
- 登录态检查因测试账号或登录条件受阻时，主 Agent 必须进入待确认，不能误判为产品失败。
- 凭据环境变量名、状态文件信息、Cookie、Token、SHA 和存储内容不能进入用户可见摘要。
- 复核结论继续复用现有独立复核卡；普通问话不新增 Todo 或复核卡。

## TestAgent 输入

TestAgent 当前报告摘要包含：

- `configuredChecks`
- `passedChecks`
- `failedChecks`
- `blockedChecks`
- `authenticatedSessions`
- `credentialEnvNames`
- `storageStateCount`
- `sensitiveArtifactSuppressionCount`

主 Agent 只把前五项中的业务计数转换为用户摘要。其余字段不进入独立复核摘要、Todo、最终总结或可见下一步。

## 实现

### 共享桥接

`backend/agents/test-agent-review-bridge.ts` 新增：

- `summarizeTestAgentBrowserAuthentication`
  - 从报告、报告 `metadata`、裁决、回执和技术数据中读取登录态摘要。
  - 生成通过、失败、受阻和尚未确认的业务计数。
  - 生成用户可读的登录态浏览器验收结论。
- `compactTestAgentBrowserAuthenticationSummary`
  - 只保留检查数量和已登录会话数量。
  - 不携带 `credentialEnvNames`、状态文件数量或其他认证证据元数据。

### 群聊主 Agent

`backend/modules/collaboration/collaboration.ts` 已接入：

- 登录态失败强化 TestAgent 裁决为 `needsRework`。
- 登录态受阻强化裁决为 `needsHuman`。
- 旧版顶层通过不能覆盖登录态失败或受阻。
- 原生 TestAgent 回执、验证摘要和独立复核卡显示登录态业务摘要。
- 压缩回执只携带安全计数，原始认证报告仍属于默认折叠的技术数据。
- 必检项别名 `browser_auth`、`browser_authentication`、`authenticated_browser`、`login_session` 统一显示为“登录态浏览器验收”。

### 全局主 Agent

`backend/modules/global/global-agent.ts` 已接入：

- 全局 TestAgent relay 消费登录态摘要。
- 失败进入 `needs_rework`。
- 受阻或尚未确认进入 `needs_user`。
- 可接受条件同时要求登录态检查没有失败和受阻。
- 全局流式独立复核卡显示相同的用户摘要。

### 最终工作链

`backend/agents/workchain.ts` 已接入：

- 登录态摘要进入独立复核证据。
- 登录态失败阻止最终总结质量门禁通过。
- 登录态受阻保持 Todo 的质量跟进步骤活跃，并提示补齐测试账号或登录条件。
- 用户可见最终总结不会被旧版“已完成”文案覆盖。

### 前端展示

`frontend/src/components/tasks/TaskExperienceCard.vue` 沿用现有独立复核区域：

- 登录态摘要加入高优先级复核行。
- 可见复核行上限调整为 11，避免登录态、多人会话、真实浏览器流程和返工动作相互挤出。
- 没有新增嵌套卡片。
- 技术详情继续默认折叠。

## 隐私边界

自测和渲染 fixture 刻意注入了以下测试数据：

- `TEST_EMAIL`
- `TEST_PASSWORD`
- `PRIVATE_TEST_LOGIN`
- `GLOBAL_TEST_PASSWORD`
- `credentialEnvNames`
- `storageStateCount`

用户可见区域只出现：

```text
登录态浏览器验收：共执行 2 项登录检查，2 项通过，覆盖 2 个已登录会话。
```

失败或受阻时只说明登录流程、会话恢复、测试账号或登录条件，不显示凭据名、状态文件、Cookie、Token 或哈希。

## 验证

已通过：

- `npm run check`
- `npm run build:backend`
- `npx tsc -p backend/tsconfig.json --noEmit --declaration false`
- `npx tsc -p backend/tsconfig.json --declaration false`
- `runTestAgentReviewBridgeSelfTest()`
- `runCoordinatorReworkProtocolSelfTest()`
- `runMainAgentWorkchainSelfTest()`
- `runGlobalAgentIntentSelfTest()`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `npm run test:replay-regression`
- `npm run test:post-review-spot-check`
- `npm run test:render-regression`
  - 27 张真实浏览器截图通过。
  - DOM 断言覆盖群聊通过态、群聊返工态、全局流式通过态。
  - 技术详情默认折叠。
  - 用户可见区域不存在凭据环境变量名和认证存储字段。
- `git diff --check`

关键截图：

- `scratch/render-regression/02d-test-agent-failed-review-rework.png`
- `scratch/render-regression/02e-group-live-test-agent-review-merged.png`
- `scratch/render-regression/07f-global-stream-test-agent-authentication-review.png`

## 最终构建状态

最终回归时，并行维护中的 TestAgent 契约声明已经恢复，`npm run check` 和 `npm run build:backend` 均已通过。主 Agent 连接代码已经进入 `ccm-package/dist`。

本轮桥接没有修改 `backend/test-agent/**`；TestAgent 内部业务仍由其独立维护链路负责。
