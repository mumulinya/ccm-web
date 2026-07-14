# 主 Agent Follow-up 指令具体性门禁 v1

## 背景

对照 `D:\claude-code\src\coordinator\coordinatorMode.ts`，CC 的 Coordinator 在 Worker 完成研究后，不能把理解工作继续丢给 Worker。它要求主 Agent 先综合研究结果，再给出具体的继续任务：

- 包含文件路径、行号、错误信息、接口或验证命令等具体证据。
- 写清楚 done 标准。
- 禁止 “based on your findings” / “基于你的发现继续” 这类懒交接。
- Worker 失败或验证失败时，优先继续同一个 Worker，因为它保留错误上下文。

本项目此前已经有 follow-up preview 和证据门禁，但 LLM 生成的 `followUps[].task` 仍可能过于空泛，导致子 Agent 收到“继续处理一下”这种无法稳定执行的任务。

## 本次改动

- 在 `group-orchestrator.ts` 新增 `ccm-coordinator-follow-up-spec-quality-v1`。
- 对主 Agent 返工/继续任务做具体性检查：
  - 是否包含“基于你的发现”“based on your findings”“继续处理一下”等懒交接信号。
  - 是否包含文件路径、接口路径、错误/失败信息、验证命令或业务字段等具体证据。
  - 是否写清完成标准或验证要求。
- 当 LLM 给出的 follow-up 不合格时，后端会自动改写为更具体的任务：
  - 汇总已知缺口/证据。
  - 给出本轮目标。
  - 明确完成标准：实际动作、涉及文件/无需改文件依据、已执行验证或无法验证原因、结构化结果说明。
- `structured_review.follow_ups[]` 里带上 `quality`，供技术详情和后续调试查看。
- 更新 LLM coordinator review prompt，要求 `followUps.task` 必须是自包含的主 Agent 综合指令。

## 用户可见策略

用户仍看到简短预览，例如“补齐前端验证证据”。具体的质量结果和自动改写细节属于技术链路，不直接塞进普通文本框。

当返工任务被自动增强后，子 Agent 收到的是可执行的具体指令，而不是“基于你的发现继续”。

## 自测覆盖

- `runCoordinatorProtocolSelfTest()` 新增 `followUpSpecQualityPass`：
  - 输入懒交接任务：“基于你的发现继续修复一下。”
  - 上下文包含 `validate.test.ts:58`、`OrderDetail.vue`、`npm test failed`。
  - 预期质量门禁不通过，但自动改写后的消息包含具体证据和完成标准，且不再包含“基于你的发现”。
  - 合格任务包含 `frontend/src/views/OrderDetail.vue`、`validate.test.ts:58`、`npm test` 时，质量门禁通过。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态防退化检查。

## 预期效果

群聊主 Agent 在协调 CC/Cursor 等第三方子 Agent 时，返工/继续任务会更像一个项目负责人写出的明确工单，而不是把理解责任继续丢给子 Agent。这能提升“用户提需求 -> 主 Agent 拆解 -> 子 Agent 执行 -> 主 Agent 验收总结”的实际完成率。
