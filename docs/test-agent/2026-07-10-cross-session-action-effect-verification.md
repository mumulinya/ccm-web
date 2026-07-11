# TestAgent Cross-Session Action Effect Verification

日期：2026-07-10

## 目标

让 TestAgent 能证明群聊或协同场景中的因果链：

```text
sender 执行动作 -> receiver 的已打开页面发生可观察变化
```

之前的 multi-session action effect 只能观察动作执行者自己的页面。它能发现 sender 按钮没有效果，但不能直接证明 sender 的动作影响了 receiver。

本里程碑只修改：

- `backend/test-agent/**`
- `docs/test-agent/**`

没有修改 `backend/modules/collaboration/**`。

## Work Order

动作新增：

```json
{
  "type": "click",
  "role": "button",
  "name": "Broadcast",
  "verifyEffect": true,
  "effectSession": "receiver",
  "effectSignals": ["page_text"],
  "effectTimeoutMs": 2000
}
```

支持：

- `effectSession`
- `effect_session`

`session` 表示 actor，`effectSession` 表示观察目标。

## 执行语义

Playwright 执行跨 session 效果动作时：

1. 从 receiver runtime 采集动作前状态。
2. 在 sender runtime 执行真实动作。
3. 在 receiver runtime 中轮询指定信号。
4. receiver 任一指定信号变化时，动作效果通过。
5. sender 自己发生变化但 receiver 未变化时，动作效果失败。

action step 与 effect assertion step 仍归属 sender：

```text
session:sender:action:click
session:sender:assert:actionEffect
```

effect assertion detail 包含：

```text
effectSession=receiver
```

## 验证规则

- `effectSession` 只能用于 multi-session browser check。
- 必须同时启用 `verifyEffect` 或其别名。
- 目标必须引用已声明 session。
- 目标必须不同于 actor session。
- setup、顺序和 parallel action 都可以指定目标。
- MCP multi-session 仍明确 blocked，不能降级为单页弱验证。

## 证据

`BrowserActionEffectEvidence` 记录：

```json
{
  "session": "sender",
  "effectSession": "receiver",
  "actionIndex": 3,
  "actionType": "click",
  "status": "changed",
  "changedSignals": ["page_text"]
}
```

页面内容仍只保存 SHA-256 digest，不保存 receiver 原始页面文本或 DOM。

`browserActionEffectSummary` 增加 `crossSession`：

- report 总数
- 每个 browser check 数量
- CLI 和 Markdown summary
- verdict counter `browserCrossSessionActionEffects`

Execution plan 增加：

- `browserCrossSessionActionEffectActions`
- 每个 browser check 的 `crossSessionActionEffectCount`

## Required Check

可以要求：

```json
{
  "requiredChecks": ["browser_cross_session_effect"]
}
```

别名包括：

- `cross_session_action_effect`
- `remote_session_effect`
- `browser_remote_effect`

存在通过的 sender-to-receiver changed evidence 时为 `verified`。目标未变化、browser check 失败或 blocked 时为 `not_verified`。

## 真实浏览器专项

`runTestAgentCrossSessionActionEffectSelfTest` 启动真实本地 HTTP 服务和两个隔离 Playwright contexts。

成功场景：

- receiver 页面先打开并轮询共享频道。
- receiver 的 `waitForText` 与 sender 的 Broadcast 点击并行执行。
- sender action index 为 `3`。
- evidence 为 `sender -> receiver`。
- receiver page text digest 发生变化。
- `browser_cross_session_effect` 为 `verified`。

失败场景：

- sender 点击 Local only。
- sender 页面文本发生变化。
- receiver 页面保持不变。
- receiver snapshot digest 前后一致。
- effect status 为 `unchanged`。
- 整个 browser check 失败。
- `browser_cross_session_effect` 为 `not_verified`。

这验证了 TestAgent 不会把“发送者自己有反馈”误判成“消息已经送达接收者”。

## 防篡改

合同和 artifact verifier 会检查：

- actor session 存在
- effect session 存在
- actor 与目标不同
- effect session 与 assertion step detail 一致
- action index 仍指向 actor action step
- summary 与 browser results 重建结果一致
- verdict cross-session counter 与 report 一致

专项在重新计算 manifest 完整性后执行：

- 删除 `effectSession`
- 把 receiver 篡改为 sender

两种篡改都会被 report contract 和 `browser_action_effect_evidence` artifact 校验拒绝。

## 验证结果

```text
PASS runTestAgentCrossSessionActionEffectSelfTest
```

聚焦回归：

```text
TestAgent self-test matrix: passed
Total: 11, passed: 11, failed: 0
```

包含跨 session、multi-session、Playwright、MCP、work-order normalization、execution plan、required coverage、contract、artifact、verdict 和 CLI。

完整回归：

```text
TestAgent self-test matrix: passed
Total: 24, passed: 24, failed: 0
```

其中包括 4 项 action-effect、4 项 existing-session recovery 和 16 项认证/provider/合同/报告回归。

## 集成边界

群聊主 Agent 后续只需要把 sender/receiver session、运行地址、动作和目标 session 写入标准 work order。TestAgent 自己负责隔离 context、跨 session 状态采集、真实效果判断、required check、报告和 artifact 防篡改。

本阶段不接入或修改群聊协作模块。
