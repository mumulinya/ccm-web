# TestAgent Visible Label Polish V1

## 背景

群聊主 Agent 已经可以通过 TestAgent CLI handoff 边界做独立复核，但可见文本里仍可能出现 `passed`、`accept`、`report_json`、`browser_har` 这类偏技术枚举值。用户只需要知道复核是否通过、建议是什么、将产生哪些证据；原始枚举值应留在结构化结果说明和技术详情里。

## 本次完成

- TestAgent 复核结果的可见结论改为中文：
  - `passed` -> `通过`
  - `accept` -> `可以接受`
  - `rework` -> `需要返工`
  - `need_human` -> `需要人工确认`
- TestAgent 计划中的证据类型改为中文：
  - `report_json` -> `结构化报告`
  - `report_markdown` -> `报告文档`
  - `artifact_manifest` -> `证据清单`
  - `browser_har` -> `网络记录`
- 命令、接口、浏览器检查的可见验证行改成“已通过/未通过/超时/已阻塞”等中文状态。
- TestAgent 的原始 `report.summary` 不再直接作为用户可见主标题；可见标题由复核状态生成，原始 summary 保留在技术结果说明中。

## 自测覆盖

- `nativeTestAgentVisibleOutputUsesFriendlyLabels`
- `nativeTestAgentPlanSummaryUsesFriendlyArtifactLabels`
- 静态回归检查：
  - `testAgentStatusLabel`
  - `testAgentRecommendationLabel`
  - `testAgentEvidenceTypeLabel`
  - `testAgentVisibleReviewSummary`

## 验证

- `node scripts\main-agent-decision-ui-selftest.mjs`：通过。
- `npm run check` / `npm run build:backend`：当前被另一个 TestAgent 文件的 DOM 类型错误阻塞，阻塞点在 `backend/test-agent/browser/playwright-provider.ts`，本轮未修改 TestAgent 内部业务实现。
