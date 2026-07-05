# 主 Agent ↔ 子 Agent 协作协议 6.0

目标：让群聊主 Agent 不只是“派发任务”，而是能管理子 Agent 的接单、执行、契约同步、回执质量和精准返工。

## 本轮新增

任务卡新增 `agent_coordination`：

- `handoff`：接单确认
- `heartbeat`：进度心跳
- `contract_sync`：跨 Agent 契约同步
- `receipt_quality`：回执质量评分
- `targeted_rework`：精准返工建议

## 子 Agent 契约增强

`buildChildAgentDevelopmentContract()` 已写入 6.0 要求：

- 开始执行前确认理解目标和准备修改范围。
- 长任务中输出关键阶段进度。
- 涉及接口、字段、schema、路由、类型、配置时，必须说明契约变化。
- `status=done` 只有在目标覆盖、文件/产出和验证证据齐全时才能写。
- 缺文件、缺验证、仍有依赖或不确定时写 `blocked / needs_info / partial`。

## 回执质量评分

`scoreChildAgentReceipt()` 会检查：

- 状态是否为 done
- 是否说明完成内容
- 是否列出执行动作
- 是否列出文件变更
- 是否列出已执行验证
- 是否无开放阻塞
- 是否声明记忆使用

评分：

- `good`：>= 85
- `partial`：>= 60
- `weak`：< 60

## 契约同步

`extractContractSyncHints()` 会从任务、工作单和回执中识别：

- API / 接口
- schema / DTO / 类型
- 字段
- 路由
- 前后端契约

如果检测到契约变化，任务卡会提示是否已追踪。

## 精准返工

`buildTargetedReworkSuggestions()` 会把验收缺口转成更小的返工动作：

- 缺真实文件 Diff → 只派实现返工
- 缺已执行验证 → 只派验证返工
- 缺子 Agent 回执 → 要求补回执
- 目标覆盖不足 → 主 Agent 重新复盘目标覆盖
- 验证失败 → 只修失败验证点
- 回执质量弱 → 要求补充高质量回执

这样避免整轮重跑。

## 用户可见效果

任务卡会显示：

- 接单确认
- 进度心跳
- 契约同步
- 回执质量
- 精准返工建议
- 下一步动作

内部协议、Trace、session 仍然折叠。

## 自测覆盖

- 协作协议区可见。
- 接单确认可识别。
- 进度心跳可识别。
- 契约同步可识别。
- 回执质量评分可识别。
- 缺 Diff / 缺验证时生成精准返工建议。
