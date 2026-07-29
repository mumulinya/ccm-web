# CC 记忆链五项收口

Date: 2026-07-28

Status: Implemented

## 范围

本轮基于本机 `D:\claude-code` 的会话存储、Session Memory、compact、MicroCompact 和 auto-memory 源码，对 CCM 的全局、群聊和项目单会话链完成五项收口。Anthropic 原生 `cache_edits/cache_reference` 仍属于 Provider 专有能力，不由普通 Provider 模拟。

## 1. 群聊压缩后恢复

压缩后恢复内容包括已调用 Skill、当前计划、文件恢复去重、动态 MCP/工具/可派发 Agent目录和子任务状态。恢复项绑定精确 `groupId + gcs_*` 并通过 checksum 回执核验。恢复快照重建或进程重启不会以空重算结果覆盖已核验附件；实时目录存在新数据时仍以当前授权目录为准。

## 2. MicroCompact 触发

普通内容投影只允许空闲时间触发 MicroCompact：完整工具对、结果足够旧、排除最近 5 个结果。上下文接近容量阈值时不清理结果，直接进入正式模型压缩。Provider 不具备 Anthropic 原生缓存编辑时，回执明确记录为 CCM 投影。

## 3. 长期记忆分类与准入

统一 CC 分类为 `user | feedback | project | reference`。项目现有细分类继续兼容，但每条新 durable memory 保存 `ccMemoryType` 和准入回执。只有成功且验收通过的稳定内容可提交；临时任务状态、普通成功/失败文本、原始工具结果、可从源码直接读取的事实、Skill/MCP定义和恢复附件不进入长期记忆。

## 4. 可恢复工具结果替换

全局与项目隐藏执行账本中的旧超大工具结果可以在模型投影中替换。默认门限 20K tokens，最近 5 个完整结果不替换。替换文本包含工具调用 ID、原始 Token、SHA-256、账本事件定位符和有限头尾；账本原文不变，回执可校验。

## 5. 一次正式重压缩

首次正式摘要通过质量门禁但完整 post-compact payload 仍超限时，只允许一次额外正式模型重压缩。第二次摘要仍须保留用户要求、纠正、决定、授权、文件和未完成事项。成功后再执行真实容量门禁；失败或仍超限则 fail closed，不推进 boundary，不调用业务模型。

## 展示

Memory Center 的“旧工具结果整理”继续展示真实 MicroCompact回执；新增“压缩后工作上下文恢复”，展示恢复种类、数量和核验状态，不展示 Skill正文、计划正文、MCP instructions 或工具结果正文。

## 验证

- `scripts/session-model-context-selftest.mjs`
- `scripts/group-post-compact-invoked-skill-attachment-restart-selftest.mjs`
- `scripts/group-post-compact-plan-attachment-restart-selftest.mjs`
- `scripts/group-post-compact-file-restore-dedup-restart-selftest.mjs`
- `scripts/group-post-compact-dynamic-context-delta-restart-selftest.mjs`
- `scripts/group-post-compact-task-status-restart-selftest.mjs`
- `scripts/true-post-compact-payload-recompact-restart-selftest.mjs`
- `scripts/project-memory-business-flow-v4-selftest.mjs`

以上使用本地 mock 或纯逻辑夹具，付费 Provider调用为 `0`。
