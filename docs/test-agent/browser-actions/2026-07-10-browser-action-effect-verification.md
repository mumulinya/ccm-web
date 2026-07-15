# TestAgent 浏览器动作效果验证

日期：2026-07-10

## 目标

让独立 TestAgent 不再把“浏览器工具调用成功”直接当成功能完成证据。

对于配置了 `verifyEffect` 的动作，TestAgent 必须在动作前后采集可观察状态，并证明至少一个指定信号发生变化。按钮可以点击但页面没有任何变化时，检查必须失败。

本里程碑只修改：

- `backend/test-agent/**`
- `docs/test-agent/**`

没有修改 `backend/modules/collaboration/**`。

## Claude Code 参考

主要参考：

`D:\claude-code\src\tools\AgentTool\built-in\verificationAgent.ts`

该 verification agent 明确强调：

- 代码阅读不是验证，必须执行真实行为。
- 测试套件结果只是上下文，不是实际功能证据。
- 完成前要寻找最后 20% 的问题。
- 重点风险包括按钮没有任何效果、刷新后状态丢失、后端在异常输入下崩溃。
- 前端任务应实际启动服务，并使用浏览器自动化进行导航、点击、截图和控制台检查。

TestAgent 将“按钮没有任何效果”转化为确定性的动作效果断言。

## Work Order

动作支持以下字段：

```json
{
  "type": "click",
  "role": "button",
  "name": "Save",
  "verifyEffect": true,
  "effectSession": "receiver",
  "effectSignals": ["url", "page_text", "dom"],
  "effectTimeoutMs": 3000
}
```

支持别名：

- `verifyEffect`
- `verify_effect`
- `expectEffect`
- `expect_effect`
- `effectSignals`
- `effect_signals`
- `effectTimeoutMs`
- `effect_timeout_ms`
- `effectSession`
- `effect_session`

效果等待时间最少 100ms，最多 10000ms，并受动作或浏览器默认超时约束。

## 可观察信号

支持以下信号：

- `url`
- `title`
- `page_text`
- `dom`
- `network`
- `dialog`
- `popup`
- `download`

Playwright 单会话检查可采集全部信号。

DOM 摘要包含页面 HTML 和表单控件当前状态，因此 `fill`、`selectOption`、`check` 等只修改 DOM 属性的动作也可以被观察。

MCP provider 首批支持：

- 当前 URL
- 页面文本

Playwright 多会话场景也支持 `verifyEffect`：

- session `setupActions` 可以要求效果验证。
- 顺序 `sessionSteps` action 可以要求效果验证。
- `parallel` 中的 action 可以要求效果验证。
- 每条 evidence 包含 `session`，并同时绑定对应 action step 和 `assert:actionEffect` step。
- 跨用户动作可以用 `effectSession` 指定从另一个已打开 session 采集动作前后状态。
- `actionIndex` 是整个 browser result 中所有 action step 的全局序号，包含自动 session `goto`。
- 并行动作在启动前预分配 action index，完成先后不会改变证据顺序。

详见 `2026-07-10-multi-session-action-effect-verification.md`。

跨 session 因果验证详见 `2026-07-10-cross-session-action-effect-verification.md`。

## 判定规则

执行顺序：

1. 动作前采集状态。
2. 执行真实浏览器动作。
3. 动作执行失败时直接停止。
4. 动作成功且要求效果验证时，在有界时间内轮询状态。
5. 任一指定信号发生变化时，加入通过的 `assert:actionEffect`。
6. 没有变化或 provider 无法观察指定信号时，加入失败的 `assert:actionEffect` 并停止后续动作。

状态包括：

- `changed`
- `unchanged`
- `unavailable`

`unchanged` 和 `unavailable` 都是失败证据。

## Acceptance Click Flow

从 acceptance criteria 自动生成的 click flow 会为每个点击动作自动加入：

```json
{
  "verifyEffect": true,
  "effectSignals": [
    "url",
    "title",
    "page_text",
    "dom",
    "dialog",
    "popup",
    "download"
  ]
}
```

这里刻意不使用 `network` 作为默认信号，避免后台轮询请求让无效按钮产生假通过。

## 证据安全

报告不保存动作前后的原始：

- URL
- 标题
- 页面文本
- DOM

字符串状态只保存 SHA-256。

事件型状态只保存计数：

- network count
- dialog count
- popup count
- download count

每条 evidence 还包含：

- provider
- action index 和 action type
- multi-session 场景中的 session
- 跨 session 场景中的 effect session
- requested、observed、changed signals
- status
- timeout 和 duration
- startedAt 和 finishedAt

Minimal existing-session 模式进一步清空 before/after digest 和计数，只保留信号及状态摘要，并设置 `detailSuppressed=true`。

合同和 artifact verifier 使用字段白名单。额外插入原始页面字段会被拒绝。

## 报告闭环

新增 `browserActionEffectSummary`，包含：

- 有效果验证的检查数
- 效果动作数
- changed、unchanged、unavailable、failed 数量
- minimal detail suppression 数量
- cross-session effect 数量
- action type 计数
- changed signal 计数
- 每个 browser check 的独立摘要

该摘要进入：

- execution plan
- CLI plan summary
- TestAgent report
- CLI report summary
- Markdown report
- verdict
- verdict evidence counters

## Artifact 防篡改

Artifact verifier 会独立检查：

- SHA-256 格式
- 计数必须为非负整数
- observed signals 必须由 before/after 重建
- changed signals 必须由 before/after 重建
- status 必须和 observed/changed signals 一致
- action effect 必须对应实际 action step
- multi-session action effect 必须指向已声明 session
- effect session 必须存在且不同于动作 actor session
- session 必须同时匹配 action step 和 effect assertion step
- `assert:actionEffect` 数量和状态必须匹配 evidence
- passed browser result 不能包含失败效果
- minimal existing-session 不得保留 before/after detail
- report summary 必须由 browser results 重建
- verdict summary 和 evidence counters 必须匹配 report

专项测试在重新计算 manifest 文件完整性后，分别篡改：

- digest
- dialog count
- action effect summary
- 原始页面字段

四种篡改都会被 `browser_action_effect_evidence` 语义检查拒绝。

## 主要文件

- `backend/test-agent/browser/action-effects.ts`
- `backend/test-agent/browser/action-effect-summary.ts`
- `backend/test-agent/browser/action-effect-self-test.ts`
- `backend/test-agent/browser/playwright-provider.ts`
- `backend/test-agent/browser/mcp-provider.ts`
- `backend/test-agent/browser/acceptance-click-flows.ts`
- `backend/test-agent/execution-plan.ts`
- `backend/test-agent/result-builder.ts`
- `backend/test-agent/verdict.ts`
- `backend/test-agent/artifacts.ts`
- `backend/test-agent/artifact-verifier.ts`
- `backend/test-agent/contract/schema.ts`
- `backend/test-agent/agent-profile.ts`

## 验证结果

后端 TypeScript：

```text
passed
```

专项与既有回归矩阵：

```text
TestAgent self-test matrix: passed
Total: 24, passed: 24, failed: 0
```

其中包含：

- Playwright sender-to-receiver cross-session action effect
- Playwright multi-session setup、顺序和并行动作效果
- multi-session session 删除与错配篡改拒绝
- Playwright 页面文本真实变化
- Playwright 可点击但无效果的失败检测
- Playwright URL 导航效果
- Playwright dialog count 效果
- MCP existing-session 页面文本效果
- minimal evidence detail suppression
- digest、count、summary、raw detail 篡改拒绝
- acceptance click flow 自动开启效果验证
- 4 项浏览器恢复回归
- 16 项认证、provider、normalization、execution plan、required coverage、contract、artifact、verdict 和 CLI 回归

## 后续集成边界

群聊主 Agent 后续只需要在 TestAgent work order 中提供：

- 项目目录
- 运行地址
- acceptance criteria
- 浏览器动作
- 需要验证效果的动作及信号
- 浏览器 provider 或 MCP executor

TestAgent 自己负责真实浏览器执行、动作效果验证、隐私摘要、报告、verdict 和 artifact 防篡改。当前里程碑不包含群聊协作代码接线。
