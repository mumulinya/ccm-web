# Phase 82 - API Microcompact Receipt Discipline

## 目标

Phase 81 已能生成 `ccm-api-microcompact-edit-plan-v1`，但还缺少“子 Agent 是否真的声明使用了该计划”的闭环。本阶段补齐回执纪律：当群聊记忆包下发 API microcompact edit plan 后，项目子 Agent 必须在结果说明中声明该 plan 是 `native_applied`、`advisory`、`ignored` 还是 `not_supported`。第三方 CLI 未实际调用 native API context-management 时不得声称 `native_applied`。

## 已完成

- 协作层新增 API microcompact 回执校验：
  - `evaluateReceiptApiMicrocompactEditPlan`
  - `collectTaskApiMicrocompactEditPlans`
  - `buildApiMicrocompactReceiptVisibleSummary`
  - `runApiMicrocompactReceiptValidationSelfTest`
- `scoreChildAgentReceipt()` 将 API microcompact 使用声明纳入结果说明质量：
  - 缺少使用状态声明会 hard fail。
  - 非 native 执行器误报 `native_applied` 会 hard fail。
  - `advisory` 与 `not_supported` 都是合法声明。
- `buildDeliverySummary()` 持久化：
  - `api_microcompact_edit_plans`
  - `api_microcompact_receipt_rows`
  - `api_microcompact_receipt_passed`
  - `api_microcompact_receipt_summary`
- Acceptance Gate / Runtime Kernel / targeted rework 接入：
  - `api_microcompact_receipt`
  - 缺声明时只要求补 API microcompact 使用声明，不需要整轮重跑。
- 子 Agent 工作单与记忆包新增回执要求：
  - `apiMicrocompactUsage`
  - 必须引用 `planChecksum`
  - 必须声明 `usageState=native_applied/advisory/ignored/not_supported`
  - 第三方 CLI 未实际使用 native API context-management 时不得写 `native_applied`
- Memory Center 新增长期治理：
  - `api_microcompact_receipt_discipline` 质量项
  - `buildApiMicrocompactReceiptDisciplineReport`
  - `evaluateApiMicrocompactReceiptDiscipline`
  - `runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest`
  - 群聊详情 `postCompactUsage.apiMicrocompactReceiptDiscipline`
  - 总览告警
  - 前端 `API Microcompact Receipt Discipline` 面板
- 静态自测新增 `memoryCenterGovernsApiMicrocompactReceiptDiscipline`，防止协作层、Memory Center 和前端面板脱节。

## 语义边界

- CCM 仍不直接修改第三方 CLI 的内部上下文缓存。
- 支持 native API context-management 的执行器可以声明 `native_applied`，但必须真实执行。
- Claude Code CLI / Cursor / Codex 等新会话型第三方 Agent 默认应声明 `advisory` 或 `not_supported`。
- 回执纪律只治理使用声明；群聊 raw messages、typed MEMORY.md、Global Agent memory、Memory Center ledger 仍不是 API microcompact 的删除对象。

## 验证

- `npm run build:backend`
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `runApiMicrocompactReceiptValidationSelfTest`
- `runMemoryCenterApiMicrocompactReceiptDisciplineSelfTest`
- `buildMemoryQualityReport({ checkIds: ['api_microcompact_receipt_discipline'], refresh: true })`
- `npm run check`
- `npm run build`

## 结果

Phase 82 已完成。CCM 现在不仅能把 Claude Code `apiMicrocompact.ts` 风格的 edit plan 放进子 Agent 上下文，还能要求每次项目子 Agent 会话在 `CCM_AGENT_RECEIPT` 中声明它如何处理该计划，并由协作验收、Memory Center 质量检查和前端治理面板共同监督。

## 下一步候选

- 为支持 native context-management 的执行器增加真实 apply adapter。
- 增加 legacy inferred API microcompact plan 的 backfill，把旧 compact boundary 从只读推断升级为持久化计划。
- 把 API microcompact receipt discipline 与 task agent memory context snapshot 更强绑定，要求 planChecksum 与具体 `task_agent_session_id` 同时匹配。
