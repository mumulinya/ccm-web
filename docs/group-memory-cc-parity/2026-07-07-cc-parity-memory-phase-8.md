# CCM Group Memory CC Parity Phase 8

日期：2026-07-07

## 本次目标

补齐长期日志蒸馏的质量评分层。Phase 5 已经能把群聊 transcript 蒸馏成 `MEMORY.md` 风格 typed Markdown，但还需要像 Claude Code 记忆系统强调的那样：记忆里的文件、函数、flag 等声明只是“写入当时为真”，使用前必须核验当前仓库。

本阶段为 distilled memory 增加 coverage / stale path / contradiction 检查，使子 Agent 在每次新会话拿到记忆时能看到这批长期记忆的可信度和风险点。

## 已实现

- `backend/modules/collaboration/group-memory-index.ts`
  - 新增 `GROUP_TYPED_MEMORY_DISTILLATION_QUALITY_VERSION`。
  - 新增 `evaluateGroupTypedMemoryDistillationQuality()`。
  - `distillGroupMessagesToTypedMemory()` 每次蒸馏后会生成并返回 `quality`。
  - `.distillation-ledger.json` 会持久化最新 quality report。

## 质量检查项

- `typed_doc_coverage`
  - 有蒸馏事实的类型必须有对应 typed Markdown。
- `source_message_links_preserved`
  - Markdown 中必须保留 `#messageId`，确保可回溯 raw transcript。
- `file_path_claims_checked`
  - 抽取记忆中的文件路径声明，并按当前 project root 检查是否存在。
  - 不存在的路径作为 stale path 风险写入 gaps。
- `no_unresolved_status_contradictions`
  - 检查同一 task id 是否出现“已完成后又阻塞/失败”的未解决矛盾。
- `distilled_signal_not_empty`
  - 有源消息时，蒸馏结果不能是空洞记忆。

## 子 Agent 上下文

- `backend/modules/collaboration/memory.ts`
  - 渲染文本新增 “长期日志蒸馏质量”。
  - 显示 score/status、stale path 数、状态矛盾数。
  - 明确提醒：涉及文件/函数/flag 的记忆使用前必须核验当前仓库。

## 新增自测

- `runGroupTypedMemoryDistillationQualitySelfTest()`
  - 构造一个存在的 `package.json` 路径和一个不存在的 `src/missing-distillation-quality.ts`。
  - 验证 stale path 被捕获，但 `package.json` 不被误报。
  - 构造同一 task 先完成后失败，验证 unresolved contradiction 被捕获。
  - 验证 source message links 保留。
  - 验证 ledger 持久化 quality report。
- 更新 `runGroupTypedMemoryLogDistillationSelfTest()`
  - 验证普通蒸馏会生成 quality report。
- 更新 `runGroupTypedMemoryContextSelfTest()`
  - 验证子 Agent 渲染文本包含 “长期日志蒸馏质量”。

## 后续增强方向

- 稀疏 active window：让 sidecar partial segments 能参与上下文窗口裁剪。
- 完整 completion audit：逐项核验长期目标所有能力是否已被当前代码和测试覆盖。
- 可选模型辅助 dream：在 deterministic facts 基础上合并主题知识页，但必须保留 message id 和 checksum provenance。
