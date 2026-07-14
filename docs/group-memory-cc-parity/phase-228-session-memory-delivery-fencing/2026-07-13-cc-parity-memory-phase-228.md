# Phase 228：Session Memory 送达回执与租约 Fencing

日期：2026-07-13

## 目标

把群聊会话记忆从“生成了快照”推进到“可证明地送达并由正确的项目子 Agent 声明使用”。同时补齐长耗时提取的 lease renewal、提交前 fencing，以及多群聊、多进程同时派发时任务会话索引的事务一致性。

## Claude Code 对照

参考源码：

- `D:\claude-code\src\services\SessionMemory\sessionMemory.ts`
- `D:\claude-code\src\services\SessionMemory\sessionMemoryUtils.ts`

继续保持 Claude Code 的核心生命周期：Session Memory 提取按会话顺序执行，开始时记录状态，只有成功后才推进 token/message 游标；活动提取等待上限 15 秒，60 秒陈旧事务可以恢复。

CCM 在此基础上增加第三方 Agent 所需的分布式证据：提取结果必须通过当前租约 fencing 后才能提交，子 Agent 的独立会话必须同时具备系统送达见证和 Agent 自身使用声明。

## 实现

### 1. Lease renewal 与 staged commit

`group-session-memory-extraction.ts` 新增租约验证和续租 API。提取事务支持 staged commit：

- operation 先准备 Session Memory snapshot，不立即覆盖已提交摘要。
- 提交前续租并重新验证 `leaseId + fencingToken + owner`。
- lease 已过期、被恢复者接管或 fencing token 不再匹配时，拒绝 commit。
- commit 完成后再次核验所有权，避免旧持有者把新持有者的状态覆盖为成功或失败。
- catch 路径同样不能覆盖更高 fencing token 的事务状态。

`saveGroupMemory()` 已改为在事务内准备 snapshot，在取得有效续租后才原子写入 `snapshot.json` 和 `summary.md`。原始 transcript 始终保留为权威来源。

### 2. 精确群聊会话绑定

项目子 Agent 的记忆包和持久快照现在明确携带：

- `groupId`
- `groupSessionId`
- `scopeId = groupId--gcs_*`
- `memoryBindingId`
- `sessionMemoryChecksum`
- Session Memory snapshot/summary 路径
- extraction fencing token

渲染给子 Agent 的上下文直接展示这些字段，不能只依赖提示词中的隐式文本。不同群聊和同群聊不同 `gcs_*` 会话不能互认 checksum 或 binding。

### 3. Runner 送达回执

第三方 Agent 实际调用完成后，CCM runner 写入签名送达回执：

- schema：`ccm-task-agent-memory-context-delivery-receipt-v1`
- 绑定 task Agent session、memory snapshot ID/checksum、worker packet 和 execution/trace。
- 绑定准确的群聊会话 scope、memory binding 与 Session Memory checksum。
- 对比 snapshot prompt 与实际 dispatch prompt，记录 `exact`、`contains_snapshot_prompt` 或失败模式。
- 记录 runtime、native session、attempt、执行结果和 output checksum。

送达回执与 snapshot 同目录保存，并进入快照保留/删除生命周期；删除快照时同步删除 companion delivery receipt。

### 4. Agent 消费声明

worker handoff receipt 强制要求 `memoryContextUsage`：

- `bindingId`
- `groupSessionId`
- `sessionMemoryChecksum`
- `usageState = used | verified | ignored`
- `reason`

验收升级为 `ccm-task-agent-memory-context-consumption-validation-v2`。只有以下两部分同时通过，才能证明本轮使用了记忆：

1. 系统送达：有效 runner delivery receipt 精确绑定 session、snapshot、checksum 和群聊会话。
2. Agent 声明：第三方 Agent 自己返回准确 binding/session/checksum，并给出一致的 used/verified/ignored 语义和理由。

CCM 自动注入的顶层 snapshot ID 不再能替代 Agent 声明；错误 `groupSessionId` 默认 fail closed。`ignored` 也必须明确声明，而不是静默跳过。

### 5. 多进程任务会话事务

并行回归发现 `task-agent-sessions.json` 虽然使用原子 rename，但原来的“读取、修改、写回”不是跨进程事务。多个群聊同时派发时，较晚写入者可能使用旧副本覆盖其他进程刚创建的会话。

现已新增 `task-agent-sessions.json.lock` 文件租约：

- `wx` 独占创建。
- owner token、PID、acquired/expires 时间。
- 本机死亡 PID 或超过 60 秒的锁可恢复。
- 最长等待 15 秒，20ms 间隔重试。
- 所有修改入口都在持锁后重新读取最新 store，再执行修改和原子保存。
- 正常完成后校验 owner token 再释放锁，生产与测试均无残留 lock。

覆盖的写入口包括创建/推进/关闭/重开任务会话、绑定 snapshot、记录 delivery receipt、容量降级门禁、快照保留清理、任务 purge 和启动 reconcile。

### 6. Memory Center

`TASK AGENT MEMORY / 项目子 Agent 记忆快照` 面板新增：

- delivered
- session bound
- delivery missing/failed
- delivery checksum mismatch
- delivery group-session scope mismatch

行级状态展示准确 `gcs_*`、group/project/task、送达状态和 prompt binding mode。送达缺失是 warning；checksum、snapshot/session 或 group-session 绑定错误是 fail。

## Agent 边界

- 群聊主 Agent 和项目子 Agent 只使用所属 `groupId::gcs_*` 的 Session Memory。
- 项目子 Agent 每次独立执行会话都取得自己的 memory snapshot 和 delivery receipt。
- Global Agent 继续只使用全局记忆、群聊路由目录和任务状态，不注入群聊 Session Memory 正文。
- 不创建或迁移 legacy `default` 会话。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npm run build`：前端、MCP Feishu、后端全部通过。
- Phase 228 delivery/fencing：13/13。
- 12 个独立 Node 进程同时创建任务会话并绑定记忆快照：12/12 会话和快照完整保留。
- Phase 227 extraction transaction：11/11。
- Phase 226 cadence：15/15。
- Phase 225 budget/fleet：12/12。
- Phase 224 sidecar isolation：14/14。
- boundary journal：14/14。
- resume integration：7/7。
- Memory Center session scope：5/5。
- model capability cache/recovery/refresh race：全部通过。
- Memory Center Task Agent snapshot 自测：6/6。
- Task Agent receipt validation：7/7。
- Agent collaboration protocol：9/9。

专项验证覆盖：

- 过期 lease 无法执行 staged commit。
- 显式续租可以延长所有权并完成提交。
- snapshot 精确绑定当前 `gcs_*`。
- 未送达 snapshot 与已签名送达回执可区分。
- 系统送达和 Agent 声明同时通过才验收。
- 只有系统注入 ID、错误群聊会话声明均 fail closed。
- delivery receipt checksum 可持久复验。
- 并发进程不会再丢失 task Agent session 或 snapshot。
- 测试清理后无事务 lock、无 `default` scope。

## 界面验收

- 桌面端 Session Memory Fleet 和 Task Agent Memory 面板正常显示。
- `390 x 844` 移动端 8 个 Task Agent 指标以两列稳定排列。
- 面板 `scrollWidth = clientWidth`，卡片无横向溢出或文字裁切。
- 浏览器控制台 0 warning、0 error。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`25088`
- `sessionCount = 3`
- `checkedSessionCount = 0`
- `budgetExceededCount = 0`
- `legacyDefaultSessionCount = 0`
- Task Agent snapshot report：`empty`，当前无未清理真实 snapshot。
- `task-agent-sessions.json.lock`：无残留。
- server stderr：空。

三个真实群聊会话当前都低于 Claude Code 的 10000-token 初始化阈值，因此 fleet 等待初始化属于正常状态。

## 后续方向

长期目标保持 active。下一阶段继续对照 Claude Code，优先审计真实模型提取执行与 fallback 的可验证性、Session Memory 更新失败后的退避/调度，以及送达后子 Agent 输出对具体记忆事实的引用证据，而不是只停留在声明层。
