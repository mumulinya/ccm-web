# Phase 224：群聊会话热 Sidecar 完整隔离

日期：2026-07-13

## 目标

把仍按群聊 ID 共用的运行期记忆 sidecar 收敛到 `groupId + groupSessionId`，保证一个群聊中的每个 `gcs_*` 会话拥有独立的记忆使用、压缩恢复、proof、replay 和删除生命周期。旧 `default` 单会话数据不迁移。

## 本阶段完成

1. 下列热 sidecar 统一使用 `<root>/<groupId>/<groupSessionId>.json`：
   - memory reload audit
   - post-compact first-dispatch marker
   - post-compact candidate usage
   - API microcompact native apply proof
   - API microcompact request telemetry
   - compact-boundary replay repair ledger
   - replay repair work items
2. 主 Agent 子任务回执、memory context bundle、raw source manifest 和 pressure recall usage 都绑定当前群聊会话；会话 A 的数据不会进入会话 B 的子 Agent 上下文。
3. 未显式传 session 的旧调用会解析到群聊当前活动会话，防止兼容调用重新创建群聊根 sidecar；显式传入历史 session 时仍严格读取该 session。
4. Memory Center 的群聊 scope 使用 `groupId::groupSessionId`，candidate、proof、telemetry、replay ledger 和 work items 均按所选会话读取；任务 proof 诊断也会过滤 `group_session_id`。
5. 删除群聊会话时同步删除该会话的结构化记忆、typed MEMORY.md、session memory、tool continuity、上述热 sidecar、compact boundary journal 和 resume proof；不会删除同群聊其他会话。
6. PTL recovery、preserved segment、compact strategy、post-compact recovery/cleanup audit 中的 transcript 路径已改为当前会话 transcript，不再指向旧群聊根消息文件。
7. API microcompact `planChecksum` 改为稳定计划身份：`createdAt` 和连续变化的 `idleMinutes` 不参与 checksum；执行计划语义变化仍会生成新 checksum。这样上一轮 provider proof 不会仅因下一次读取时间不同而失效。
8. 旧 `default` 会话无需迁移；Phase 223 已删除旧 manifest 与旧根记忆。本阶段继续清理 7 个热 sidecar 根目录中的 1311 个旧群聊根文件（约 24 MB），直接根文件剩余 0；新的会话子目录不受影响。

## 关键文件

- `backend/modules/collaboration/memory.ts`
- `backend/modules/collaboration/group-memory-compaction.ts`
- `backend/modules/collaboration/collaboration.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/group-session-sidecar-isolation-selftest.mjs`

## 专项验收

`group-session-sidecar-isolation-selftest.mjs` 覆盖：

- 两个会话的 reload、dispatch、candidate usage、proof、replay 文件路径独立。
- candidate ID、replay repair、API proof 和渲染上下文均不跨会话。
- Memory Center 所选会话返回对应 proof/replay 文件。
- 测试过程不创建群聊根热 sidecar。
- 删除会话 A 后，会话 B 的记忆和 sidecar 保持存在。

## 验证结果

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npm run build`：前端、MCP Feishu、后端完整构建通过。
- `group-session-sidecar-isolation-selftest.mjs`：14 项通过。
- `group-memory-boundary-journal-selftest.mjs`：14 项通过。
- `group-memory-resume-integration-selftest.mjs`：7 项通过。
- `memory-center-session-scope-selftest.mjs`：5 项通过。
- `group-session-maintenance-race-selftest.mjs`：4 项通过。
- model capability cache/recovery/refresh-race 三组回归：全部通过。
- 测试产生的 `phase224-sidecars-*` 空目录已清理，剩余 0。
- 旧热 sidecar 根文件：删除 1311 个，剩余 0；会话子目录文件保留。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`23024`
- Memory Center 生产 API 暴露 4 个独立群聊会话 scope。
- 抽查 `gmps7ha15::gcs_mrhk9qcz_zkwcvm`：candidate、replay ledger、replay work items、native proof 均返回 `<groupId>/<groupSessionId>.json`。
- 生产 UI 的“记忆范围”显示 4 个独立群聊会话条目，并展示各自 `gcs_*` ID。

## 架构边界

- 群聊是会话容器，不是共享 transcript 或共享热记忆的作用域。
- 群聊主 Agent 只把当前群聊会话的记忆交给本次第三方项目子 Agent 会话。
- Global Agent 继续只使用全局记忆与路由/任务状态，不读取群聊正文。

## 后续长期方向

Phase 224 已关闭运行期热 sidecar 的跨会话共享风险。长期目标继续 active；下一阶段继续把 Memory Center 的高级质量报表从“当前活动会话缺省视角”扩展为可显式汇总全部历史会话，同时继续对照 Claude Code 的 compact/resume、context budget 和 proof 生命周期。
