# Phase 83 - API Microcompact Native Apply Readiness

## 目标

对齐 Claude Code `apiMicrocompact.ts` 与 API 请求层的连接方式，把 Phase 81/82 的 edit plan 和使用回执升级为可验证的原生应用契约。只有执行器明确提供 provider API request layer、启用 context-management beta，并生成真实请求补丁时，才允许声明 `native_applied`。

## 已完成

- 新增 `ccm-api-microcompact-native-apply-plan-v1`：
  - 校验执行器类型、传输层、显式能力、API request layer、feature flag 和 beta header。
  - 原生就绪时生成 `requestPatch.body.context_management`。
  - 自动携带 `context-management-2025-06-27`。
  - 生成 `applyPlanChecksum` 与 `requestPatchChecksum`。
- 子 Agent 记忆上下文、独立工作单和 handoff 引用新增 native apply contract。
- Claude Code、Cursor、Codex 等外部 CLI 执行器 fail closed 为 `advisory_only`，不会伪装成原生 API 应用。
- 回执验证升级为三重绑定：
  - `planChecksum`
  - `applyPlanChecksum`
  - `requestPatchChecksum`
- `native_applied` 还必须满足：
  - native apply plan 标记为 ready。
  - 请求体包含 `context_management`。
  - 请求包含规定的 beta header。
  - 三类 checksum 与下发契约一致。
- Memory Center 新增：
  - `api_microcompact_native_apply_readiness` 质量项。
  - `buildApiMicrocompactNativeApplyReadinessReport`。
  - `evaluateApiMicrocompactNativeApplyReadiness`。
  - `runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest`。
  - 群聊详情 `postCompactUsage.apiMicrocompactNativeApplyReadiness`。
  - 总览告警和 `API Microcompact Native Apply Readiness` 面板。
- 多群聊按 `group_id` 独立聚合，每个群的执行器能力、契约和缺口互不继承。

## 语义边界

- CCM 可以为自有原生 API 执行器生成可合并的 provider request patch。
- CCM 不修改第三方 CLI 的内部会话或私有请求体；这类执行器继续使用 advisory metadata。
- native apply plan 表示“具备安全应用条件”，不等于已经发送请求；只有执行器实际发送后才能在回执中声明 `native_applied`。
- API microcompact 只处理执行会话中的 thinking/tool context，不删除群聊 raw messages、typed MEMORY.md、Global Agent memory 或治理 ledger。

## 验证

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runGroupApiMicrocompactNativeApplyPlanSelfTest`
- `runApiMicrocompactReceiptValidationSelfTest`
- `runMemoryCenterApiMicrocompactNativeApplyReadinessSelfTest`
- `buildMemoryQualityReport({ checkIds: ['api_microcompact_native_apply_readiness'], refresh: true })`
- `npm run check`
- `npm run build`

## 结果

Phase 83 已完成。CCM 的 API microcompact 现在形成了 edit plan、执行器能力判定、provider request patch、交付回执和 Memory Center 治理闭环。CLI 误报 native apply、缺失 beta header、缺失请求补丁或 checksum 不匹配都会被拦截。

## 下一步候选

- 将 native apply contract 与 `task_agent_session_id`、memory snapshot id 强绑定，阻止跨会话复用。
- 增加 provider adapter 的发送后 proof，记录真实请求采用了哪个 request patch checksum。
- 对旧任务中的 API microcompact edit plan 做 legacy readiness backfill。
