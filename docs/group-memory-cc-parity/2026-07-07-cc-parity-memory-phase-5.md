# CCM Group Memory CC Parity Phase 5

日期：2026-07-07

## 本次目标

补齐长期日志蒸馏能力，让 CCM 不只在群聊 JSON 中保留 raw transcript，也能像 Claude Code 记忆系统里的 `MEMORY.md` + 主题文件 + 日志蒸馏思路一样，把长期群聊事实沉淀成可召回的 Markdown 记忆。

参考本地 `D:\claude-code\docs\context\project-memory.mdx` 中的设计线索：

- `MEMORY.md` 是稳定入口索引。
- 具体记忆放在独立 Markdown 文件中。
- 日志可由后台 dream/distillation 类过程沉淀成主题文件。
- 使用记忆前，如果涉及文件、函数或 flag，必须重新核验当前仓库。

## 已实现

- 在 `backend/modules/collaboration/group-memory-index.ts` 增加长期日志蒸馏：
  - `distillGroupMessagesToTypedMemory()`
  - `readGroupTypedMemoryDistillationLedger()`
  - `getGroupTypedMemoryDistillationLedgerFile()`
- 新增 ledger：
  - `<CCM_DIR>/group-memory-md/<groupId>/.distillation-ledger.json`
  - 按 checksum 去重，记录 source message id、actor、source index、fact type、first/last seen。
- 新增自动生成的 typed memory Markdown：
  - `distilled-log-user-requirements.md`
  - `distilled-log-project-context.md`
  - `distilled-log-feedback-failures.md`
  - `distilled-log-reference-artifacts.md`
- 蒸馏事实分类：
  - user：长期用户要求、验收约束、硬性目标。
  - project：调度决策、技术方案、任务分配、已完成工作。
  - feedback：失败、阻塞、超时、异常、needs_info。
  - reference：文件路径、技能/工具、验证命令。
- 所有蒸馏事实都保留 `#messageId`，子 Agent 可以按原始群聊消息回溯。

## 接入点

- `runGroupMemoryAutoCompactionNow()`
  - 自动压缩完成或跳过后，执行一次长期日志蒸馏。
  - 结果写入 `memory.compaction.logDistillation` 和 `memory.longTermLogDistillation`。
- `buildAgentMemoryContextBundle()`
  - 子 Agent 受控记忆包构建前执行轻量蒸馏。
  - 随后刷新 `MEMORY.md` 索引，使本轮新会话可召回刚沉淀的长期事实。
- `renderGroupMemoryContextBundle()`
  - 渲染 “长期日志蒸馏” 状态，包括候选数量、新增事实数、写入 Markdown 数和 ledger 文件。

## 新增自测

- `runGroupTypedMemoryLogDistillationSelfTest()`
  - 验证四类 distilled Markdown 文件被创建。
  - 验证第二次蒸馏不会重复新增相同事实。
  - 验证 `MEMORY.md` 链接 distilled docs。
  - 验证召回可命中 sentinel、文件、失败和验证命令。
  - 验证原始 messages 不被修改。
- 更新 `runGroupTypedMemoryContextSelfTest()`
  - 验证构建子 Agent 记忆包会触发长期日志蒸馏。
  - 验证渲染文本包含 “长期日志蒸馏”。
- 更新 `runGroupMemoryAutoCompactionSelfTest()`
  - 验证后台压缩路径写入 `compaction.logDistillation`。

## 当前边界

- 当前蒸馏为 deterministic 规则抽取，不调用模型。
- ledger 会保存去重事实，Markdown 由 ledger 重建，因此不会因窗口滑动丢失已蒸馏事实。
- 未来可以增加模型辅助 dream，把大量 facts 进一步合并成主题知识页，但仍应保留 message id 和 checksum provenance。

## 后续增强方向

- 多边界 partial compact：支持 `from`、`range` 和按 task id 压缩。
- PTL 自动恢复：压力下降后从 emergency digest 恢复到 normal digest。
- 蒸馏质量评分：对每次 distilled docs 执行 coverage / stale path / contradiction 检查。
