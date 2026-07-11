# 主 Agent 与 TestAgent 完成前抽查门禁 v1

日期：2026-07-10

## 本轮目标

在不接管 `backend/test-agent/**` 内部业务的前提下，为群聊主 Agent 和全局主 Agent 补齐 TestAgent 通过后的完成前真实抽查：

- TestAgent 报告通过后，主 Agent 抽查少量关键验证，不能只相信报告文字。
- 抽查结果与 TestAgent 一致时才允许进入最终完成。
- 抽查失败、工作目录无效、命令记录不完整或报告状态与退出码矛盾时，保持 Todo 活跃并重新复验。
- 抽查不一致优先复用原 TestAgent 工作单和验证上下文，不错误交给实现成员返工。
- 用户正文只展示抽查数量、结论和下一步；命令、工作目录、退出码、输出和协议字段默认放入技术详情。

## 实现

### 完成前真实抽查

新增 `backend/agents/post-review-spot-check.ts`：

- 从 TestAgent 报告中选择最多 3 项已执行命令进行真实重跑。
- 工作目录必须真实存在并位于项目根目录内；无效目录不会回退到项目根目录继续执行。
- 同时核对报告状态、报告退出码、实际退出码和实际执行结果。
- 动态命令允许输出文本不同，但成功/失败状态必须一致。
- 抽查记录不完整、命令缺失、目录越界、报告写通过但退出码非 0，均判为 `needs_recheck`。
- 用户摘要使用第一人称表达，只提供抽查数量、是否一致和下一步。

### 群聊主 Agent

- TestAgent 独立复核通过后运行完成前抽查。
- 抽查通过才允许最终验收和完成总结。
- 抽查不一致时保持任务未完成，并生成 `post_review_spot_check_reverify`。
- 复验沿用原 TestAgent 工作单、原验证对象和同一验证上下文。
- 抽查不一致与实现缺陷分开处理，不直接把抽查问题派给实现成员返工。

### 全局主 Agent

- 全局 TestAgent relay 同步保留抽查摘要和技术结果。
- 旧版顶层 `passed/accept` 不能覆盖抽查失败。
- 流式事件、最终 `result` 和历史运行合并都会保留：
  - `post_review_spot_check_summary`
  - `postReviewSpotCheckSummary`
  - `post_review_spot_check`
  - `postReviewSpotCheck`
- 支持顶层、`technical`、蛇形和驼峰字段来源。
- `post_review_spot_check_ready` 可以直接更新当前全局流式任务卡。

### 工作链与交付报告

- workchain 最终总结质量门禁加入“完成前抽查”检查项。
- 抽查通过时保持完成状态。
- 抽查失败时 Todo 保持活跃，交付报告降为未完成，并给出重新复验的下一步。
- 用户可见文案区分“需复验”和“需返工”，避免把验证不一致误描述成代码实现缺陷。

### 用户展示

- 群聊任务卡显示“完成前抽查”通过态。
- 全局流式任务卡显示“完成前抽查”通过态。
- 全局归档/历史任务卡显示“需复验”状态和复验动作。
- 技术详情默认折叠。
- 普通问话不显示 Todo、TestAgent 计划、独立复核或完成前抽查。
- 全局流式卡增加不可见的 `data-run-id`，供真实渲染回归精确定位运行，避免相同摘要文案误选其他卡片。

## 验证

已通过：

- `npm run test:post-review-spot-check`
  - 正常抽查通过。
  - 实际重跑失败。
  - 没有命令记录。
  - 命令结果块不完整。
  - 工作目录越界。
  - 报告状态与退出码矛盾。
  - 用户摘要不泄漏命令、路径、退出码或输出。
- `runGlobalAgentIntentSelfTest()`
  - 抽查通过允许验收。
  - 抽查不一致覆盖旧版通过结论。
- `runCoordinatorReworkProtocolSelfTest()`
  - 复用同一 TestAgent 和原工作单复验。
- `runMainAgentWorkchainSelfTest()`
  - 抽查通过允许完成。
  - 抽查失败阻止错误完成。
- `runMainAgentDeliveryReportSelfTest()`
  - 抽查通过保持完成。
  - 抽查失败降为未完成。
- `node scripts/main-agent-decision-ui-selftest.mjs`
- `npm run build:frontend`
- `npm run test:chat-experience`
- `npm run test:render-regression`
  - 26 张真实浏览器截图全部通过。
  - 普通问话不显示 Todo。
  - 群聊和全局都显示抽查摘要。
  - 技术详情默认折叠。
  - 抽查失败不显示完成。
- `npm run test:replay-regression`
  - 4 张历史回放截图全部通过。
- 关闭声明生成后，后端运行代码类型检查和 JavaScript 产物发射通过。
- 完整声明构建仍被并行维护的 TestAgent 契约 `backend/test-agent/contract/schema.ts` 中 `TS7056` 阻塞；本轮没有修改该目录。
- `git diff --check`

重点截图：

- `scratch/render-regression/02e-group-live-test-agent-review-merged.png`
- `scratch/render-regression/07a-global-stream-test-agent-spot-check-passed.png`
- `scratch/render-regression/07e-global-post-review-spot-check-recheck.png`

## 边界

- 本轮只负责主 Agent 与 TestAgent 的连接、结果消费、完成门禁和用户展示。
- 本轮没有修改或覆盖 `backend/test-agent/**` 的内部业务实现。
- 工作区中 `backend/test-agent/**` 的并行变化由对应 TestAgent 工作线负责，本轮验证基于当前工作区共同状态完成。
