# CCM vNext 缺口补齐实现说明

更新时间：2026-08-08

## 当前实现边界

CCM 已保留 Agent Communication V2、Terminal Gate、租约、generation fencing、TestAgent 独立验收、Skill/MCP 动态加载和记忆连续性。vNext 补齐项在这些能力之上增量实现，不另建第二套通信状态机。

## 已落地能力

- 统一 Evidence Registry：Worker Result、项目任务终态、第三方通信回执和测试结果可以转换为无正文 Evidence。
- RepoStateIdentity：记录 worktree、Git HEAD/tree、工作区状态、dirty patch 和声明文件指纹。
- Evidence Freshness：Evidence 区分 `valid`、`stale`、`invalid`、`unknown`，代码状态改变后不能直接复用旧证据。
- Acceptance Evaluation：验收条件可以关联 Evidence ID，终态决策中返回 Evidence 统计和 AC 评估结果。
- FailureRecord：失败按执行、验收、计划、环境、资源和授权分类；重复失败会升级为 `repeated_failure`。
- Delta Repair：项目返工沿用原 WorkItem，递增 attempt，并携带 unresolved criteria、允许文件和禁止文件。
- Plan Inheritance：计划修订保留旧计划，生成旧 WorkItem 到新 WorkItem 的继承映射和 checksum。
- Operation Registry：只读、测试、构建、lint 和 typecheck 等操作可以在相同权威代码状态下复用结构化 Evidence。
- Verifier 最小上下文：TestAgent handoff 使用无正文的最小验收账本，不传完整历史工具结果。
- 动态循环预算：全局、项目和群聊主 Agent 可按上下文容量、工具次数、模型轮数和时间预算决定继续循环。
- 任务 revision/CAS：任务状态更新支持 `expectedRevision`，并记录状态迁移 timeline。
- 任务 Transition Ledger：在现有任务快照旁影子写入无正文 transition event，可按 task 重放出状态投影。

## 实际运行链

```text
Worker/主 Agent/TestAgent 产生结果
        ↓
CCM 清洗并生成无正文 Evidence
        ↓
绑定 RepoStateIdentity + generation/attempt/lease
        ↓
更新 Claim / Acceptance Criterion
        ↓
valid Evidence 满足全部 AC？
   ├─ 否：FailureRecord → Delta Repair / Replan
   └─ 是：CCM Terminal Gate → Terminal Receipt
```

## 持久化与兼容

- Evidence、FailureRecord、Operation Registry、Transition Ledger 使用带锁和原子写入的 JSON 注册表。
- 不保存 Prompt、工具原始正文、命令输出正文或第三方 Agent 私有配置。
- 既有通信、任务、TestAgent 和记忆数据继续兼容读取。
- 无法恢复完整代码状态的历史 Evidence 标记为 `unknown`，不会自动重判历史终态。
- `ccm-package` 只由构建生成，源码修改完成后通过正式构建更新。

## 尚需持续增强

当前实现已完成核心闭环，但严格 freshness 的依赖感知失效、任务域完整 Event/Reducer 切换以及更复杂的副作用操作审计仍按灰度方式演进，不影响现有通信和终态门禁。
