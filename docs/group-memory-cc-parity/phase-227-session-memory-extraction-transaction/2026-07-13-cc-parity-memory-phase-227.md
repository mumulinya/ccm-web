# Phase 227：Session Memory 提取事务与失败恢复

日期：2026-07-13

## 目标

对齐 Claude Code Session Memory 的顺序化提取生命周期。每个群聊 `gcs_*` 会话只允许一个提取事务持有者；并发、进程退出、租约陈旧或提取失败时，不得推进摘要 checksum、token 游标、message 游标和 extraction count。

## Claude Code 对照

参考源码：

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`

对齐语义：

- 提取按会话顺序执行，不能由并发调用重复更新。
- 提取开始时记录 in-progress 状态。
- 只有隔离提取成功后，才记录 token count 与最后摘要 message ID。
- 等待活动提取最长 15 秒。
- 60 秒未完成的提取可判定为 stale 并恢复。
- 提取失败保留旧 Session Memory 和旧游标，后续调用可以重试。

## 实现

### 1. 每会话提取租约

新增 `group-session-memory-extraction.ts`，租约位于每个 scoped Session Memory 目录：

- `.extraction-lease.json`
- `extraction-state.json`

租约使用 `wx+` 独占创建，包含 `leaseId`、owner PID/hostname、60 秒 TTL、checksum、recovery count 和单调递增 fencing token。活动租约返回 `lease_busy`；本机死亡进程或超时租约被识别为 stale，恢复者取得更高 fencing token。

等待 API 使用 Claude Code 的 15 秒默认超时；测试可注入更短 timeout、TTL 和固定时间。

### 2. 原子游标提交

`saveGroupMemory()` 在 Session Memory 到达提取条件或显式保存时进入 `runGroupSessionMemoryExtractionTransaction()`：

- `in_progress`：先持久化事务状态。
- `completed`：快照和 markdown 成功落盘后，才提交 cadence 游标及 completed 状态。
- `lease_busy`：读取旧快照，返回 in-progress 观察结果，不写摘要、不推进游标。
- `failed`：记录错误与失败次数，保留旧摘要 checksum、token/message 游标及 extraction count。
- `stale recovery`：接管旧租约后重试，成功快照记录 recovery 和更高 fencing token。

Session Memory snapshot 中新增 `ccm-group-session-memory-extraction-transaction-v1` 证据，绑定 `leaseId`、fencing token、恢复状态和完成时间。

### 3. 持久审计

`ccm-group-session-memory-extraction-state-v1` 记录：

- `status`
- `attempts / completed / failed / recovered`
- `leaseId / fencingToken / lastFencingToken`
- `startedAt / lastCompletedAt / lastFailedAt`
- `lastError`

状态文件使用同目录临时文件加 rename 原子替换。热租约正常完成或失败后释放；服务重启后仍可从 state 审计历史结果。

### 4. Memory Center

Session Memory Fleet 现在逐个 `groupId::gcs_*` 检查：

- active extraction
- failed extraction
- stale in-progress extraction
- recovered extraction
- attempts、completed、failed、fencing token 和最后错误

失败且已有旧摘要时标记 warning，失败且无可用摘要或 stale 状态标记 fail。页面 `extractions` 卡片显示累计提取、活动数和失败会话数；每行显示 `tx idle/in_progress/completed/failed`。

### 5. Agent 边界

- 租约、state、summary 和游标均按 `groupId--gcs_*` 隔离。
- 会话 A 的忙锁、失败或恢复不会阻塞会话 B。
- 项目子 Agent 只使用所属群聊会话最后一次成功提交的记忆。
- Global Agent 仍只使用全局记忆、群聊路由目录和任务状态，不注入群聊 Session Memory 正文。
- 不创建或迁移 legacy `default` 会话。

## 验证

- `npm run build`：前端、MCP Feishu、后端全部通过。
- `node scripts/group-session-memory-extraction-transaction-selftest.mjs`：11/11。
- Phase 226 cadence：15/15。
- Phase 225 budget/fleet：12/12。
- Phase 224 sidecar isolation：14/14。
- resume integration：7/7。
- model capability cache/recovery/refresh race：全部通过。

专项覆盖：

- 成功提取提交游标并释放热租约。
- 并发持有者存在时返回 busy，旧 checksum 和 extraction count 不变。
- 注入 commit 前失败时不推进 token 游标。
- 失败状态可持久审计，并能在下一轮成功重试。
- 死亡 PID 租约被判定 stale。
- stale recovery 使用更高 fencing token。
- 活动事务等待 API 正确超时。
- Fleet 最终恢复为健康状态，且不产生 `default` scope。

## 界面验收

- 桌面端 Session Memory Fleet 正常显示 3 个真实会话。
- `390 x 844` 移动端卡片、会话路径和状态均无重叠。
- 浏览器控制台 0 error。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`18172`
- `sessionCount = 3`
- `cadenceWaitingInitializationCount = 3`
- `activeExtractionCount = 0`
- `failedExtractionSessionCount = 0`
- `staleExtractionCount = 0`
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`

三个真实会话都未达到 10000-token 初始化阈值，因此 `checkedSessionCount = 0`、Fleet `status = empty` 是正常等待状态，不表示漏扫。

## 后续方向

长期目标保持 active。下一阶段继续对照 Claude Code，增强提取事务的真实模型执行回执绑定、跨进程长耗时 lease renewal/fencing 校验，以及提取来源与项目子 Agent 消费回执的端到端可追踪性。
