# Phase 54 - Compact File Reference Usage Discipline

## 目标

继续对齐 Claude Code 的 `compact_file_reference` 与 session file access hooks 思路：CCM 已经能把群聊记忆、raw messages、Session Memory、Tool Continuity、typed MEMORY.md 等压缩后来源作为 compact file references 下发给子 Agent；本阶段补齐下发后的使用闭环，要求后续 worker ledger / group message / receipt 在 `memoryUsed` 或 `memoryIgnored` 中声明实际引用的 `reference_id` 或路径。

## 本次升级

- 新增 `compact_file_reference_usage_discipline` 质量检查。
- 新增 per-group 使用纪律报告：统计 checked / passed / missing / mention rate，并列出未声明的 reference gaps。
- Memory Center 群聊详情新增 `compactFileReferenceDiscipline`，前端展示 `Compact Reference Usage` 面板。
- Memory Center 总览新增系统与群聊告警：当 compact file references 已下发但后续缺少 `memoryUsed` / `memoryIgnored` 证据时直接标记风险。
- 新增 `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`：模拟子 Agent 新会话拿到 compact file references，只声明其中一个 reference，验证已声明的通过、未声明的成为 gap。

## 设计边界

- 这是观测和质量门禁，不强制子 Agent 一定读取所有文件。
- 子 Agent 只要没有使用某个引用，应在 `memoryIgnored` 里说明原因。
- Memory Center 只检查 `reference_id` / 路径是否在近期 worker ledger、群聊消息或 receipt 中出现，不替代真实文件读取权限与当前任务判断。

## Claude Code 对照

- `D:\claude-code\src\utils\messages.ts` 的 `compact_file_reference` 会提醒 agent 必要时用 Read tool 读取文件。
- `D:\claude-code\src\utils\sessionFileAccessHooks.ts` 会追踪 session memory / transcript / memdir 等文件访问。
- CCM 本阶段的对应能力是：下发 compact file reference 后，用 `memoryUsed` / `memoryIgnored` 回执形成可审计的消费声明。

## 验证

- 已通过：
  - `npm run check`
  - `npm run build:backend`
  - `runMemoryCenterCompactFileReferenceUsageDisciplineSelfTest`
  - `runMemoryCenterCompactFileReferenceSelfTest`
  - `runMemoryCenterGroupToolContinuitySnapshotSelfTest`
  - `runMemoryCenterGroupSessionMemorySnapshotSelfTest`
  - `runMemoryCenterCompactBoundaryReplayGateSelfTest`
  - `npm run build:mcp-feishu`
  - `npm run build:frontend`
  - `npm run test:chat-experience`
