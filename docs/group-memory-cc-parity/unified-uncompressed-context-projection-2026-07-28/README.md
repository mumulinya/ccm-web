# 全局、群聊与项目未压缩上下文统一投影

Date: 2026-07-28

Status: Implemented and audited against the local CC source

## 业务结论

全局 Agent、群聊主 Agent和项目主 Agent现在共用 `backend/system/session-model-context.ts`。作用域适配层只负责提供当前精确会话的 transcript、正式摘要、压缩边界与隐藏执行账本，不再各自实现消息裁剪。

未发生正式模型压缩时，投影模式为 `precompact_full_raw`，包含当前精确会话中位于本轮请求之前的全部完整用户/assistant轮次。当前请求若已经写入 transcript，会按内容精确去重并由调用方单独传入。兄弟会话、其他项目和其他群聊不会进入投影。

发生正式模型压缩后，投影模式为 `canonical_summary_recent_raw`，包含经过 checksum 校验的正式摘要和动态近期完整原文；边界前原文只作为可核验 archive 保留，不再重复发送给模型。原始 transcript 与隐藏执行账本始终不删除。

## Token 容量门禁

- 项目主 Agent 已删除会话上下文的 `5K/12K/24K` 字符裁剪。
- 最终计划和问答使用真实模型消息构造 `ModelVisiblePayloadSnapshot`，按模型上下文窗口和保留输出 Token 计算门限。
- 达到门限时先调用项目正式模型压缩，压缩完成后重新读取精确会话并重建模型消息。
- 压缩失败或重建后仍超出门限时 fail closed，不调用业务模型，不使用字符截断、本地摘要或放宽阈值继续。
- Provider usage可用时继续参与现有会话 Token 测量；缺失时使用完整模型可见 payload 的保守 Token 估算。

## CC MicroCompact 对齐

新产生的长工具结果不会因为字符数大而立即压缩。统一投影器只在以下条件成立时清理旧工具结果内容：

1. 当前为主会话投影；
2. `tool_use/tool_result` 已完整配对；
3. 工具属于可安全清理的读写、命令、检索或抓取类型；
4. 结果不在最近保留的 5 个工具结果中；
5. 距离上一条 assistant消息已超过配置的空闲时间，默认 60 分钟。

非 Anthropic 原生缓存编辑链不再使用“接近阈值”触发 MicroCompact。上下文压力只进入正式模型压缩；CCM 不用普通文本替换伪装 `cache_edits/cache_reference`。清理只改变本次模型投影，替换文本为 `[Old tool result content cleared]`。原始执行账本、工具调用身份、状态和回执不会修改。

`timeBasedMicrocompactEnabled`、时间间隔和近期保留数量由统一编排配置决定，三个作用域不再硬编码开启。新工具结果即使很长也保持原文，不能仅凭字符长度触发 MicroCompact。

Anthropic 支持原生 `cache_edits/cache_reference` 的模型可以在 Provider 适配层使用原生缓存编辑；其他 Provider 使用上述受控内容投影。受控投影会明确记录为 CCM MicroCompact，绝不伪装成 Provider 原生缓存命中或缓存删除。

对于超过 20K tokens、已经完成且不属于最近 5 个结果的旧工具结果，统一投影器可以使用独立的 recoverable content replacement。投影保留头尾、工具调用 ID、原始 Token、SHA-256 和执行账本定位符；原始结果仍完整保存在精确会话执行账本。这是可恢复内容替换，不计作 MicroCompact，也不会改写 canonical transcript。

## Prompt Too Long 恢复

压缩模型返回 Prompt Too Long 时，全局和项目压缩链按 CC 的 API 回合粒度从最旧回合开始剥离重试：用户前导消息属于第 0 组，之后每个新的 assistant response ID 开始一个新组，`tool_use/tool_result` 不拆开。剥离只影响当前压缩请求，原始 transcript 与隐藏执行账本保持不变。

压缩候选生成后还要对真正将要发送给业务模型的完整 payload 执行第二次容量门禁。首次候选仍超限时，全局、群聊和项目各允许一次正式模型重压缩；重压缩仍要通过原摘要保真和质量门禁。第二次仍超限、摘要无效或调用失败时，候选不提交、boundary 不推进、Provider 调用被禁止。

## 精确会话隔离

- 全局投影只接收当前全局 `sessionId`。
- 群聊投影只接收当前 `groupId + gcs_*`，并保留旧版本 typed-memory 中没有显式 ID 的事实锚点和长期要求。
- 项目投影只接收当前 `project + projectSessionId`。
- 记忆中心缺少完整 transcript 时不使用其他会话或当前时间伪造投影和新鲜度。
- 群聊子 Agent 的关键长期要求和事实锚点排在诊断信息之前，避免派发上下文本身的显示预算遮住必读约束。

## 验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `node scripts/session-model-context-selftest.mjs`：17 项通过。
- `node scripts/session-execution-ledger-selftest.mjs`：13 项通过。
- `node scripts/all-session-cc-compaction-alignment-selftest.mjs`：51 项通过，付费 Provider调用 `0`。
- `node scripts/group-main-uncompacted-cc-context-selftest.mjs`：20 项通过。
- `node scripts/project-main-agent-orchestration-selftest.mjs`：31 项通过。
- `node scripts/memory-center-microcompact-display-selftest.mjs`：6 项通过。
- `node scripts/group-time-based-tool-result-microcompact-restart-selftest.mjs`：21 项通过，包含记忆中心展示、重启恢复与回执核验。
- `node scripts/group-post-compact-message-order-restart-selftest.mjs`：28 项通过，包含强制/部分压缩顺序以及超限候选拒绝提交。
- `node scripts/true-post-compact-payload-recompact-restart-selftest.mjs`：真实压缩后 payload 二次门禁通过。
- `node scripts/memory-core-session-isolation-selftest.mjs`：精确会话隔离通过。

## 记忆中心展示

记忆中心对全局、群聊和项目的精确会话复用同一个 `MicroCompactStatusPanel`。面板只展示服务端保存并通过 checksum 核验的真实回执，包括触发方式、清理数量、近期保留数量、节省 Token、执行时间和原始 transcript保留状态。群聊另外展示文件去重、已调用 Skill、当前计划、动态 MCP/Agent目录和子任务状态恢复；全局与项目展示旧大工具结果的可恢复替换。所有面板默认只显示 body-free 回执。

旧会话若没有回执，页面显示“历史数据未记录”，不根据当前 transcript反推历史清理数量或节省 Token。长期记忆等不适用的 scope不显示该面板。新产生的全局、群聊和项目会话投影会把回执保存到各自精确会话的 compaction状态中，记忆中心读取同一事实源。
