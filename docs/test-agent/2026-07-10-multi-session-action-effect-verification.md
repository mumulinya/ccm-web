# TestAgent Multi-Session Action Effect Verification

日期：2026-07-10

## 目标

让独立 TestAgent 在群聊、协同编辑、通知同步等多用户场景中，不只证明浏览器动作被调用，还能证明动作在正确的用户 session 中产生了真实可观察效果。

本里程碑只修改：

- `backend/test-agent/**`
- `docs/test-agent/**`

没有修改 `backend/modules/collaboration/**`。

## 行为

Playwright multi-session browser check 的以下动作都可以配置 `verifyEffect`：

- session `setupActions`
- 顺序 `sessionSteps` action
- `parallel` group action

示例：

```json
{
  "parallel": [
    {
      "session": "sender",
      "action": {
        "type": "click",
        "role": "button",
        "name": "Send",
        "verifyEffect": true,
        "effectSignals": ["page_text"]
      }
    },
    {
      "session": "receiver",
      "action": {
        "type": "click",
        "role": "button",
        "name": "Acknowledge",
        "verifyEffect": true,
        "effectSignals": ["page_text"]
      }
    }
  ]
}
```

每条 `BrowserActionEffectEvidence` 增加可选 `session`。只要 browser result 含 `browserSessions`，每条 action-effect evidence 就必须带 session。

动作还可以使用 `effectSession` 指定另一个 session 作为效果观察目标。此时：

- `session` 是动作执行者。
- `effectSession` 是动作前后状态采集目标。
- 两者必须引用已声明且不同的 session。
- action step 和 effect assertion step 继续归属动作执行者。
- effect assertion detail 明确记录目标 session。

## 全局动作索引

`actionIndex` 对应 browser result 中 `steps.filter(step => step.kind === "action")` 的全局序号。

索引包含：

- 每个 session 自动执行的 `goto`
- session setup actions
- 顺序 scenario actions
- parallel group actions

并行动作在 `Promise.all` 启动前按声明顺序预分配索引，因此网络速度或页面响应速度不会改变 evidence 顺序。

专项通过场景的实际顺序：

```text
0 session:sender:action:goto
1 session:sender:action:click
2 session:receiver:action:goto
3 session:receiver:action:click
4 session:sender:action:click
5 session:receiver:action:click
```

其中效果 evidence 的 action index 为 `1,4,5`，session 为 `sender,sender,receiver`。

## 失败语义

如果任一 session 的动作：

- 没有产生指定状态变化
- provider 无法观察指定信号
- 动作本身执行失败

该 session 的 effect assertion 会失败，后续 scenario stage 停止，整个 multi-session browser check 判定失败。

专项 no-op 场景产生：

```text
session:right:assert:actionEffect
status=failed
changed=none
```

因此 TestAgent 能指出“哪个用户 session 的哪个动作没有真实效果”，而不是只返回模糊的群聊场景失败。

## 合同与 Artifact 防篡改

合同和 artifact verifier 会验证：

- multi-session evidence 必须包含 session
- session 必须存在于 `browserSessions`
- effect session 必须存在且不能等于 actor session
- session 必须匹配 `actionIndex` 指向的 action step
- session 必须匹配对应的 `assert:actionEffect` step
- effect assertion 数量与 evidence 数量一致
- action index 不重复
- passed browser result 不得包含 unchanged 或 unavailable effect

专项测试在重新计算 manifest 文件完整性后执行两种篡改：

- 删除 evidence 的 session
- 把 sender evidence 改为 receiver

两种情况都会被 report contract 和 `browser_action_effect_evidence` artifact 语义校验拒绝。

## 计划与报告

Execution plan 会统计 multi-session setup 和 scenario action 中配置效果验证的动作：

- `browserActionEffectChecks`
- `browserActionEffectActions`
- 每个 browser check 的 `actionEffectCount`

报告继续输出：

- 原始 session-scoped action-effect evidence
- `browserActionEffectSummary`
- Markdown action-effect 明细中的 session
- verdict action-effect counters

证据仍只保留 digest、计数和信号摘要，不保存原始页面文本、URL 或 DOM。

## 专项验证

`runTestAgentMultiSessionActionEffectSelfTest` 使用真实本地 HTTP 页面与隔离 Playwright contexts，验证：

- setup action 页面文本变化
- 两个 session 的并行动作都产生页面文本变化
- 自动 goto、setup、parallel 下的全局 action index
- 并行 evidence 顺序稳定
- 一个 session no-op 导致整个 check 失败
- 失败证据明确归属 session
- execution plan action-effect 数量正确
- report contract 通过
- artifact verification 通过
- session 删除和错配篡改被拒绝

专项结果：

```text
PASS runTestAgentMultiSessionActionEffectSelfTest
```

完整聚焦回归：

```text
TestAgent self-test matrix: passed
Total: 24, passed: 24, failed: 0
```

矩阵包含：

- 4 项 action-effect 专项
- 4 项 existing-session recovery 专项
- 16 项认证、provider routing、normalization、execution plan、required coverage、contract、artifact、verdict 和 CLI 回归

## 集成边界

群聊主 Agent 后续只需提交明确的 sessions、session steps、运行地址和需要验证的 effect signals。TestAgent 负责隔离浏览器 context、执行动作、观察真实效果、输出 session-scoped evidence 和最终 verdict。

本里程碑不包含群聊协作模块接线。
