---
name: ccm-implementation-plan-authoring
description: Author a user-confirmable CCM implementation plan card. Use when a group or project main Agent must present an executable plan with operational rules and demoable delivery slices before any dispatch or code change.
---

# CCM Implementation Plan Authoring

为群聊/项目主 Agent 产出一张用户可确认的计划卡。完整契约只在本 Skill；调用 `ccm_present_plan` 出卡，不要把计划写成散文。

## Workflow

1. 从会话里已有的目标、约束、上一轮计划和工具结果起步。第一次为当前需求出实现计划时，允许最小只读核实以点名缝在哪（现有模块/表或明确无现成域）。展开、重述或整理已有计划稿时不要再读项目文件。
2. 在 `goal` 或 `overview` 钉死运转规则：状态怎么走、资源何时占用/释放、超时从哪个时钟算、如何挂到现有对象；没有现成域就写明 greenfield。关键决策和边界写在这里，不要写进 steps。
3. `steps` 写成一行待办（id+title）。条数按需求来，不设上下限；按能单独演示/验收的交付切片（例如占住资源、核销改状态、超时释放）。禁止按设计/接口/前端/后端/联调分层，不要默认 P0–P4，不要每步再写要做/结果。
4. 用 `exclusions` 或 `expectedResults` 写明本次不包含或完成后可见口径。不要把 TestAgent 写成待办。
5. 会改整张计划的分叉才调用 `ccm_ask_user`。Plan Mode 下鼓励只读探索，本轮必须以 `ccm_present_plan` 出卡，不得派发。
6. 用户已确认计划卡后，`ccm_dispatch` 必须覆盖卡片每条切片的验收口径；一项目可覆盖多条切片，不要把卡片重写成前端/后端/测试分工。`architecturePlan.dependencySteps` 可以按项目/依赖排期，但每条 `targets[].task` 要写明落实了哪些已确认切片。不要把 TestAgent 写成卡片待办或 `targets[]`；独立验收沿用卡片 overview 与 steps 作为口径。

## Required Output

Call `ccm_present_plan` with:

- `title`: short name
- `goal` / `overview`: operational rules and boundaries
- `steps`: one-line demoable slices (`id` + `title` only); count follows the work, no 2–8 cap
- `exclusions` or `expectedResults`: at least one boundary or outcome line

## Boundaries

- Do not dispatch, edit code, or call child Agents while authoring the card.
- Do not restate a confirmed card as frontend/backend/test workstreams.
- TestAgent is independent acceptance, never a todo or dispatch target.
