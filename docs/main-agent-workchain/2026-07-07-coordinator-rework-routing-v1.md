# Coordinator Rework Routing v1

日期：2026-07-07

## 背景

对比 `D:\claude-code\src\coordinator\coordinatorMode.ts` 后，群聊主 Agent 的返工链路还缺少明确路由：

- 测试失败、构建错误、文件找不到等失败，应该继续同一个子 Agent，因为它保留失败上下文。
- 独立验证和只读复核，应该换新的验证视角，避免原实现者自证。
- 用户变更需求或发现方向错误时，应该先停止旧方向，再用修正后的目标继续。

旧逻辑把所有返工都写成 `same_worker_scratchpad`，用户和后续执行链路无法区分这些场景。

## 本次升级

新增 `buildCoordinatorReworkRoutingDecision()`，输出结构化路由：

- `continue_same_worker`：继续同一子 Agent 修复。
- `fresh_verification_worker`：派独立验证 Agent 复核。
- `spawn_fresh_worker`：重新派发给新的子 Agent。
- `stop_wrong_direction_then_continue`：停止旧方向并按新要求继续。

返工工作单现在会写入“返工路由”，并把 `reworkRoute` / `rework_routes` 保存在主 Agent 复盘与 assignment 元数据中。用户可见区使用中文短摘要，例如“继续同一子 Agent 修复”“派独立验证 Agent 复核”，完整工作单仍保留给执行链路和技术详情。

## 用户体验

- 群聊计划卡优先展示 `userTaskPreview`，不直接把完整返工工作单塞给用户。
- 协作看板和任务管理页会把内部策略翻译成中文标签。
- `same_worker_scratchpad` 这类内部字段不再直接出现在用户可见的续跑说明里。

## 验证

已补充自测覆盖：

- 验证失败时继续同一子 Agent。
- 独立复核时使用新的验证视角。
- 用户改目标或方向错误时标记停止旧方向后继续。
- 用户可见路由标签不包含 `scratchpad`、`trace_id`、`session_id`、`CCM_AGENT_RECEIPT` 等内部协议词。

