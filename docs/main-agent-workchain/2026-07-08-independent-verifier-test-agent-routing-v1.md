# 独立验证 Agent 路由 v1

## 背景

群聊主 Agent 已经能判断某些返工不应该由原实现 Agent 自证，而是需要新的验证视角。此前链路里已经有 `fresh_verification_worker` 路由标签，但实际 follow-up 仍可能回到原目标，用户看到的是“派独立验证 Agent”，执行上却没有真正切到独立复核者。

## 本次升级

- 增加独立验证 Agent 选择器，优先选择 `test-agent`、`test agent`、测试/QA/复核类成员。
- 选择器会排除原实现 Agent，避免 `web-app` 复核自己的交付证据。
- 当主 Agent 判定需要独立复核时，实际派发目标改为验证 Agent，原实现 Agent 写入 `reviewSubject/originalTarget/continuationOf`。
- 子 Agent 工作单会明确“独立复核对象”，提示验证 Agent 只读核对目标覆盖、文件变化、验证证据和风险。
- 如果当前群聊没有可用的独立验证 Agent，主 Agent 不再回派原实现者自审，而是把缺少验证 Agent 作为需要用户配置或确认的状态展示。

## 用户可见效果

- 有 `test-agent` 时，返工区会显示类似 `@test-agent 派独立验证 Agent 复核：复核 web-app 的交付证据`。
- 没有独立验证 Agent 时，用户会看到“需要配置独立验证 Agent”，技术详情里保留候选选择和路由信息。
- 技术字段如 route schema、verifier selection、review subject 继续放在结构化元数据中，不直接污染用户正文。

## 回归覆盖

- `getCoordinatorReworkProtocolSelfTest()` 覆盖：
  - 优先选择 `test-agent`。
  - 候选列表排除原实现 Agent。
  - 独立复核 follow-up 实际派给验证 Agent。
  - 没有验证 Agent 时阻断自动派发。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态扫描，防止独立验证路由 helper 和自测断言被误删。
