# CCM Group Memory CC-Parity Phase 9

日期：2026-07-07

## 目标

补齐全局 Agent 的群聊记忆使用缺口：全局 Agent 在做系统级决策、跨群聊派发、项目子 Agent 派发之前，默认获得一个预算受控的多群聊记忆上下文包，方向继续对齐 Claude Code 的记忆压缩与上下文恢复体验。

## 本次升级

- 新增 `buildGlobalGroupMemoryContext()`：从多个群聊读取压缩记忆、typed `MEMORY.md` 索引、召回片段、质量评分、PTL/partial compact 边界和原始来源路径。
- 新增 `renderGlobalGroupMemoryContextBundle()`：把多群聊结构化记忆渲染为全局 Agent 可直接理解的上下文文本。
- 新增 `runGlobalGroupMemoryContextSelfTest()`：验证多个群聊可同时进入上下文、typed memory 可召回、原始来源路径可追溯、用户要求忽略记忆时不会注入旧群聊记忆。
- 全局 Agent 默认 `buildAgenticContext()` 注入 `group_memory_context`，让全局 Agent 不需要先显式调用工具也能看到相关群聊长期记忆。
- 新增全局 Agent 工具 `query_group_memory`，用于按查询主动读取多个群聊的压缩记忆与 typed memory 召回。
- 新增 HTTP 端点：
  - `GET /api/global-agent/group-memory`
  - `GET /api/global-agent/group-memory/self-test`

## 记忆边界

- 该上下文包不会把所有群聊 transcript 全量灌入全局 Agent，而是使用 bounded multi-group summary。
- 群聊原文仍以 `group-messages/*.json` 为源，压缩状态在 `group-memory/*.json`，typed Markdown 在 `group-memory-md/<groupId>/MEMORY.md`。
- 涉及文件、函数、flag、验证命令的 typed memory 只作为召回线索，使用前仍必须核验当前仓库。
- 如果用户当前消息表达“忽略记忆 / 不使用 memory”，全局群聊记忆包会进入 `must_not_use_group_memory`，不带旧事实。

## 多群聊支持

Phase 9 明确按 `groupId` 隔离群聊记忆，并在全局层按 query 评分选择多个群聊。每个群聊保留自己的：

- `group_memory_file`
- `group_messages_file`
- typed memory dir / index file
- typed recall ledger scope
- distillation quality

这让一个全局 Agent 可以同时理解多个群聊的长期上下文，同时不会把不同群聊的 MEMORY.md 混写在一起。

## 后续方向

- 给 UI 增加全局群聊记忆包的可视化检查入口。
- 继续强化 query scoring：加入任务、项目配置、全局 mission 与群聊 member 的交叉权重。
- 增加按群聊/项目维度的召回预算策略，避免大型多群聊环境中高频群聊长期占满上下文。
