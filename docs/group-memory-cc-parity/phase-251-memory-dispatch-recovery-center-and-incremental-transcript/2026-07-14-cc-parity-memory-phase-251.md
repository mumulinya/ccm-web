# CCM Memory CC Parity Phase 251

日期：2026-07-14

## 目标

本阶段把 Phase 249/250 的记忆派发 WAL 与 direct CLI spool 提升为可审计、可恢复、可人工安全处理的 Memory Center 能力，并补齐 direct CLI 增量执行轨迹。

固定边界：

- 群聊记忆身份必须是 `groupId--gcs_*`。
- 每个项目子 Agent 任务必须绑定独立 `tas_*`。
- Global Agent 不读取群聊正文，也不接入群聊派发 transcript。
- legacy、default 和废弃旧会话直接删除，不迁移、不复活。
- 人工操作不能绕过 delivery receipt、checksum 或 consume ticket 强制提交 surfaced ledger。

## 已实现

### 1. Direct CLI 增量 transcript

新增 `~/.cc-connect/agent-runner/transcripts/adr_*.jsonl`：

- `request_prepared`
- `process_spawned`
- bounded `stdout` / `stderr`
- `tool_loop_started` / `tool_loop_completed`
- `verification_started` / `verification_completed`
- `result_committed`
- `request_cancelled`

每个事件包含严格递增 sequence、previous checksum 和 event checksum。读取时会复算完整哈希链，任何内容篡改、顺序篡改或跨 request 拼接都会 fail closed。

容量边界：

- 单事件文本最多 4096 字符。
- stream 事件预算 448 KiB。
- 单 transcript 硬上限 512 KiB。
- Memory Center 最多返回最近 40 个事件，stdout/stderr 文本再次截断到 600 字符。
- 不向 UI 返回 direct request 的完整 message，也不返回 WAL recovery payload。
- request/result 保留期清理会同步清理 transcript；取消未启动和 pre-spawn 失败也进入有界清理。

### 2. Memory Center 恢复 inventory

新增：

- `GET /api/memory-center/dispatch-recovery`
- `POST /api/memory-center/dispatch-recovery/resolve`

inventory 组合并校验：

- typed memory dispatch WAL
- direct request/result pair
- transcript hash chain
- `groupId`、`gcs_*`、task、`tas_*`
- ticket、lease、capsule、packet 和 prompt checksum
- runner request、PID、receipt 与 ledger 状态

recoverability 分类：

- `recoverable_commit`
- `active`
- `cancel_prepared`
- `uncertain`
- `invalid`
- `terminal`

同时修复 committed WAL 清空 recovery payload 后被误判 invalid 的问题。committed WAL 仍必须通过 schema、record checksum、`gcs_*` 和 `tas_*` 校验。

### 3. 安全人工 resolve

仅允许四种动作：

- `retry_recovery`：只有完整 request/result、start witness、checksum 和 receipt 恢复证据时才运行既有恢复路径。
- `acknowledge_uncertain`：只封存人工确认，不提交 surfaced ledger。
- `cancel_prepared`：只允许取消 prepared 且从未 spawn 的 direct request，并同步终结 WAL。
- `prune_terminal`：只允许删除校验完整的 terminal WAL 与 direct request/result/transcript pair。

每次操作必须提交：

- exact ticket ID/checksum
- WAL record checksum
- exact runner request ID/checksum
- transcript head checksum
- `explicitConfirmation=true`
- actor
- 非空 reason

resolve receipt 使用单次消费身份，状态从 `executing` 进入 `completed` 或 `failed`。终态回执使用 fsync + rename，读取确认状态前会复算 checksum；同一证据身份不能重复执行。Memory Center audit 会记录 receipt ID/checksum，并明确 `forcedCommitAllowed=false`。

### 4. Memory Center UI

新增紧凑的“子 Agent 记忆派发恢复”面板：

- total、recoverable、active、uncertain、invalid、committed 汇总
- group / `gcs_*` / `tas_*` / ticket / runner 状态
- transcript 有效性、大小、事件数和截断轨迹
- 根据 recoverability 自动收窄的操作按钮
- 原因输入和显式确认弹窗
- desktop 与 390 px mobile 无横向溢出

## 测试

新增：

- `scripts/group-memory-dispatch-recovery-center-selftest.mjs`
- `npm run test:group-memory-dispatch-recovery-center`

专项结果：26/26。

覆盖：

- 强证据人工恢复并只消费 surfaced ledger 一次
- committed WAL 校验
- terminal pair 精确清理
- prepared-only 取消
- uncertain acknowledgement 不提交 ledger
- resolve receipt 单次消费
- transcript 512 KiB 上限
- transcript 篡改 fail closed
- inventory 不暴露完整 prompt
- Global Agent 边界

回归：

- Phase 250 direct spool：39/39
- Phase 249 dispatch WAL：39/39
- Phase 248 consume ticket：40/40
- `npm run check`：通过
- `npm run build:backend`：通过
- `npm run build:frontend`：通过

## 生产验收

- 服务：`http://localhost:3081`
- PID：`29068`
- 首页：HTTP 200
- dispatch recovery API：success
- dispatch total / pending / invalid：0 / 0 / 0
- server error log：0 bytes
- 群聊数：3
- 每个群聊只有 1 个活动 `gcs_*`
- legacy/default 会话：0
- 浏览器控制台错误：0
- desktop 与 390 px mobile：无水平溢出或操作按钮越界

## 后续方向

长期目标仍保持 active。下一阶段继续对照 Claude Code 的恢复语义，优先增强 transcript 分段归档、跨进程 transcript append lease、Memory Center 历史趋势和异常证据隔离；继续保持群聊会话隔离、子 Agent `tas_*` 隔离以及 Global Agent 只读全局上下文的边界。
