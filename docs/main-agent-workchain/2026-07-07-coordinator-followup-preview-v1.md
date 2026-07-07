# Coordinator Follow-Up Preview v1

## 背景

参考 `D:\claude-code\src\tools\SendMessageTool\SendMessageTool.ts`：发送给 worker / teammate 的普通消息需要带 `summary`，作为 UI 预览。这样用户和主 Agent 不需要阅读整段技术工作单，也能知道这次续跑是为了补什么。

## 本次升级

- `runLlmCoordinatorReview()` 的 `followUps` JSON schema 新增 `summary`。
- LLM 没有给 summary 时，后端会从 reason/task 中生成短预览。
- 规则验收门禁 `buildEvidenceGateFollowUps()` 也会生成用户可读预览，例如：
  - `补齐可验收结果说明`
  - `补齐已执行验证证据`
  - `补跑项目验证命令`
- 主 Agent 返工工作单新增 `用户可见返工摘要`，完整技术工作单继续给子 Agent 执行。
- 第 N 轮验收续跑的 SSE 状态会展示短预览，避免用户只看到泛化的“继续追问相关子 Agent”。

## 用户体验

用户看到的是“web-app：补齐前端验证证据”这类短目标；完整的回执要求、验证要求、上下文注入和技术协议仍放在工作单/技术详情里。

## 验证

- `getCoordinatorReworkProtocolSelfTest()` 覆盖 `用户可见返工摘要`。
- `taskNotificationChecks` 覆盖缺结果说明时的 follow-up 预览。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加 `backendCoordinatorFollowUpsCarryUserPreview`。
