# 独立复核门禁自动派发 v1

## 背景

主 Agent 已经有复杂/高风险变更的独立复核门禁，也能在最终验收中判断“缺少独立复核证据”。但如果门禁只把任务保持进行中，用户会看到任务卡住，却不知道主 Agent 下一步会怎么补齐。

参考 Claude Code coordinator 的原则：复杂变更不能让原实现者自证，验证应该由独立视角证明结果可用。因此本次把“独立复核门禁缺口”接到返工派发链路。

## 本次升级

- 新增 `buildIndependentReviewGateFollowUps()`。
- 主 Agent 复盘子 Agent 输出时，会计算 `buildIndependentReviewGate()`。
- 如果变更需要独立复核但缺少通过证据，会自动生成返工 follow-up。
- follow-up 先以原实现 Agent 作为复核对象，再交给 `buildCoordinatorReworkFollowUp()` 选择独立验证 Agent。
- 有 `test-agent` / QA Agent 时，会实际派发给独立验证 Agent。
- 已有 LLM follow-up 明确要求独立复核时，不重复生成系统 follow-up。

## 用户可见效果

- 用户不会只看到“验收未通过，任务继续进行中”。
- 主 Agent 会明确展示下一步：补齐独立复核。
- 示例：`@test-agent 派独立验证 Agent 复核：复核 web-app 的交付证据`。
- 原始门禁、候选选择、文件风险等技术细节继续留在结构化元数据/技术详情中。

## 回归覆盖

- `getCoordinatorReworkProtocolSelfTest()` 覆盖：
  - 高风险文件变更会创建独立复核 follow-up。
  - follow-up 标记为 `independent_review_gate`。
  - follow-up 经过路由后派给 `test-agent`。
  - 工作单包含原实现 Agent 作为独立复核对象。
- `scripts/main-agent-decision-ui-selftest.mjs` 增加静态扫描，防止自动派发 helper 和协议断言被误删。
