# 主 Agent ↔ 子 Agent 协作协议 6.1

目标：把 6.0 的“能看见、能评分、能提示返工”升级为“结构化确认、结构化契约、硬门禁、可执行精准返工”。

## 1. 结构化 ACK

子 Agent 的 `CCM_AGENT_RECEIPT` 现在要求包含 `ack`：

```json
{
  "ack": {
    "understoodGoal": "我理解的目标",
    "plannedScope": ["准备修改/查看的范围"],
    "forbiddenScope": ["不会动的范围"],
    "verificationPlan": ["准备执行的验证"],
    "unclear": []
  }
}
```

如果 `unclear` 非空，子 Agent 不应该写 `status=done`。

## 2. 结构化 contractChanges

涉及 API、字段、schema、路由、类型、配置或前后端契约时，子 Agent 要写：

```json
{
  "contractChanges": [
    {
      "type": "api",
      "endpoint": "POST /api/orders",
      "request": "...",
      "response": "...",
      "fields": ["status", "ownerId"],
      "consumers": ["frontend"],
      "note": "契约变化说明"
    }
  ]
}
```

任务卡会优先显示结构化契约同步状态。

## 3. 回执质量硬门禁

回执质量评分已经接入完成门禁。

daily_dev 任务如果要求代码或验证，则弱回执/不完整回执不能被当成完成。

评分检查项：

- `status=done`
- 结构化 ACK
- 完成摘要
- 执行动作
- 文件变更
- 已执行验证
- 必要时提供 contractChanges
- 无开放阻塞
- 声明记忆使用/未使用

## 4. 精准返工按钮

任务卡的“精准返工建议”现在可以点击执行。

按钮会调用：

```text
POST /api/tasks/continue-from-gaps
```

并携带：

- `rework_kind`
- `target`
- `reason`
- `title`

后端会生成精准返工说明，复用原任务、原 Trace、原 native session / scratchpad，只处理对应缺口。

支持的返工类型：

- 缺真实文件 Diff
- 缺已执行验证
- 缺子 Agent 回执
- 目标覆盖不足
- 验证失败
- 回执质量不足
- 契约未同步

## 5. 关键实现

- 回执解析：`normalizeAgentReceipt()`
- 质量评分：`scoreChildAgentReceipt()`
- 硬门禁：`buildAcceptanceGate()` / `canCompleteDailyDevFromDeliverySummary()`
- 精准返工说明：`buildTargetedReworkContinuationDraft()`
- 前端按钮：`TaskExperienceCard.vue`
- 群聊 action：`GroupChat.vue`

## 自测覆盖

- ACK / contractChanges 能进入回执结构。
- 契约同步能识别结构化 contractChanges。
- 回执质量评分参与硬验收。
- 精准返工建议能显示按钮。
- 点击按钮走 `targeted_rework` action。
