# 会话上下文分项与比例展示

## 目标

在全局 Agent、群聊主 Agent、项目会话和 `tas_*` 项目子 Agent 的输入框旁展示当前精确会话的模型上下文用量，并说明每一类数据占用了多少 Token、占当前已用上下文的比例，以及自动压缩线位于模型容量的什么位置。

## 用户可见行为

- 点击输入框旁的上下文百分比按钮，打开当前精确会话的 Context 面板。
- 顶部显示 `当前模型可见 Token / 有效模型上下文容量` 和总体占用比例。
- 多色分段条按模型总容量绘制，每种颜色对应一个上下文类别；自动压缩线独立标记。
- 明细列表同时显示分类 Token 和该分类占当前已用上下文的比例。
- Token 为 `0` 或当前链路不存在的类别不展示，避免制造虚假数据。
- Provider 实测总量高于可解释的 payload 分桶时，差值显示为 `Provider observed remainder`，不伪装成某个具体类别。
- 手机端使用视口内固定定位，左右安全边距为 `12px`，面板可滚动且不会横向越界。

## 分类口径

共享 `ModelVisiblePayloadSnapshot` 使用无重叠分桶：

- `System prompt`：从 system 输入中扣除已识别 Rules、Skills、MCP 和子 Agent 定义后的剩余部分。
- `Tool definitions`：从工具定义中扣除 MCP 和子 Agent 工具后的剩余部分。
- `Rules`：规则、策略、权限、边界和约束。
- `Skills`：本轮实际注入的 Skill 定义或提示。
- `MCP & dynamic tools`：MCP 与动态工具定义。
- `Subagent definitions`：可派发项目、成员或子 Agent 定义。
- `Summarized conversation`：正式模型摘要或已验证 Session Memory。
- `Conversation`：当前动态近期原文；未压缩时为模型可见的完整会话原文。
- `Current request`：未在会话历史中重复计算的当前用户请求。
- `Recovery context`：压缩后的计划、文件、长期记忆和恢复附件。
- `Hooks`：`session_start` 等生命周期 hook 的模型可见结果。

项目子 Agent 的最终 Provider 输入按其真实边界额外显示：

- `Worker bootstrap prompt`
- `MCP hydrated context`
- `Provider envelope`

这些分类相加严格等于 payload 估算总 Token。Provider 实测总量仍是总体占用的优先口径，二者差额独立展示。

## 数据更新

- 全局 Agent：每次 Provider 调用完成后，按精确全局会话保存仅含数字、checksum 的 accounting 快照。
- 群聊主 Agent：每轮最终 payload 和 Provider usage 绑定精确 `gcs_*` 会话；Prompt cache usage 账本只保存分桶数字，不保存正文。
- 项目会话：第三方 Agent usage 回写时，同步保存精确项目会话的分桶与 Token measurement。
- 项目子 Agent：任务交付回执提交时保存最终派发 gate 的启动 Prompt、水合上下文和 Provider 包装 Token。
- Provider 不返回 usage 时：总量降级为完整模型可见 payload 估算，但仍保存分项 accounting 快照，不能退化为整块 remainder。
- 正式压缩前后继续使用同一分桶核心，压缩不会切换为另一套展示算法。

旧会话可能只有 Provider 总量而没有历史分桶。这类会话会先显示 `Provider observed remainder`；下一次真实模型调用或压缩检查后生成新的 accounting 快照，随后显示可解释分类。系统不会为旧调用编造分类比例。

## 数据安全

正常调用后的 accounting 快照只保存：

- `tokenBreakdown`
- `totalTokens`
- payload、fixed context 和 pending request checksum
- scope 与精确 session ID

它不复制 system、工具正文、摘要、消息、附件或 hook 正文，不形成第二套会话数据库。

## 验证证据

- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:session-context-breakdown`：通过，11 个分桶守恒，测试样本 `261` Token。
- `npm run test:session-context-accounting-persistence`：通过；全局和项目会话在 Provider usage 缺失时仍保存真实 payload 分桶。
- `npm run test:session-context-usage-ui`：通过，`25` 项。
- `npm run test:session-context-usage-ui:browser`：通过；桌面全局和群聊均显示 `158K / 256K` 的 8 类分项；手机无横向溢出，弹窗边界为 `left=12/right=378`（390px 视口）。
- `global-agent-model-session-compaction-selftest.mjs`：通过，`40` 项，S1 -> S2 -> S3，付费调用 `0`。
- `group-main-uncompacted-cc-context-selftest.mjs`：通过，`20` 项。
- `all-session-cc-compaction-alignment-selftest.mjs`：通过，`51` 项，付费调用 `0`。
- `final-worker-dispatch-payload-gate-restart-selftest.mjs`：通过。

`memory-center-live-token-display-selftest.mjs` 的旧 fixture 仍失败：fixture 直接写入群聊 memory JSON，但没有生成 canonical Group Session Memory 文件，却断言状态必须为 `ready`。该失败与本次 Token 分桶无关，本次未放宽 canonical Session Memory 判定。

## 截图

- [桌面上下文分项](./evidence/desktop-global-context.png)
- [移动端上下文分项](./evidence/mobile-global-context.png)
