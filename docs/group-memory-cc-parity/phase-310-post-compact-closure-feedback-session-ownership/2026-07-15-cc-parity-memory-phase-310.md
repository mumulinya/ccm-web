# CCM Memory Phase 310: Post-Compact Closure Feedback Session Ownership

日期：2026-07-15

## 目标

把 completion-preservation closure MEMORY.md 被子 Agent 使用后的 usage feedback、召回排序、证据置信度、冲突仲裁、冲突 resolution 和缺失回执修复链提升为严格的 `groupId + gcs_*` 会话所有权。

## 问题

Phase 308 已按会话保存 completion-preservation closure，Phase 309 已收口 Provider ranking 使用链，但 closure 的反馈账本仍写入裸 `groupId`：

1. 同一群聊不同会话的 `used`、`verified`、`ignored` 会被共同计分。
2. A 会话的低质量反馈可能降低 B 会话的新子 Agent 召回优先级。
3. A 会话的矛盾证据和 conflict resolution 可能被 B 会话继承。
4. 回执缺口、repair work item、candidate 和 dispatch brief 仍可能共享群级 sidecar。
5. 相同 task、packet、binding、execution 和 native-session 标识可能造成跨会话去重。

## 实现

### Exact-Session Usage Ledger

- usage ledger 物理路径改为 typed scope：`${groupId}--${groupSessionId}`。
- ledger 持久化 `sourceGroupId`、`groupSessionId`、`typedScopeId` 和 `exactSession`。
- usage entry 同时持久化 `group_session_id`、`typed_scope_id`。
- entry ID 纳入 `gcs_*` 和 typed scope，相同逻辑标识不会跨会话碰撞。
- 裸群聊 ledger 保留 legacy 读取能力，但 exact feedback 不再写入裸群聊副本。

### 召回排序与证据评分

- usage summary 从当前 typed scope 读取，不再从根群聊读取。
- task-family aging、receipt-source reliability、独立 session/packet 去重和 confidence 均在当前 `gcs_*` 内计算。
- WorkerContext 构造继续使用根 `groupId` 调度，但通过 `groupSessionId` 选择 exact typed-memory scope。
- A 会话的 `deprioritize_closure_recall` 不会抑制 B 会话的 closure MEMORY.md。

### Conflict Arbitration 与 Resolution

- conflict detection 只比较同一 `gcs_*` 内的正向和 ignored 分支。
- resolution row ID 纳入 group session 和 typed scope。
- resolution typed MEMORY.md、hot archive、checksum cold shards 和 manifest 均写入 exact scope 目录。
- resolution Markdown 明确记录 `Exact group-chat session: gcs_*` 和 root group。
- legacy unscoped resolution 标记为不可自动注入新的子 Agent。
- A 会话解决冲突后，B 会话的 recommendation、entry count 和 archive 均保持不变。

### 回执修复链

- 根 binding ledger 按 `group_session_id` 分桶后再生成 receipt rows。
- repair work item ID 纳入 `gcs_*`，并保存 `scopeId`、`typedScopeId` 和双命名 session 字段。
- repair work-item sidecar 使用 `<group>/<gcs_*>.json`。
- candidate metadata gate 校验 `group_session_id`。
- dispatch plan 和 brief 使用 `<group>/<gcs_*>.json`，不会由兄弟会话 supersede。
- feedback recorder 将真实子 Agent 回执写回当前 exact usage ledger。

### Memory Center

- usage feedback、receipt repair、recall priority、aging/task-family、evidence confidence、conflict arbitration 和 conflict resolution 报告按 exact scope 枚举。
- 报告统一返回 `groupCount`、`scopeCount`、`exactSessionCount` 和 `legacyScopeCount`。
- 质量探测构造 fresh WorkerContext 时显式传入 `groupSessionId`。

## 主要文件

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/knowledge/memory-control-center.ts`
- `scripts/post-compact-closure-feedback-exact-session-selftest.mjs`
- `package.json`

## 验收

新增命令：

```powershell
npm run test:post-compact-closure-feedback-exact-session
```

结果：13/13 通过。

覆盖：

- 同一群聊 A/B 两个 `gcs_*` 使用相同 work、packet、binding、task 和 execution 标识。
- A 的 ranking feedback 得出 `deprioritize_closure_recall`，B 独立得出 `promote_but_reverify_current_source`。
- fresh WorkerContext 在 A 抑制 generic closure recall，在 B 保留 closure MEMORY.md。
- conflict 只在 A 激活，B 不继承。
- resolution 只在 A distill，B 不生成 resolution 文档或 archive row。
- receipt gap 检查按预期失败，repair work item、candidate 和 brief 在两个 exact scope 中分别通过。
- 两个会话使用不同 usage ledger、repair sidecar 和 dispatch-plan 文件。
- 裸群聊 usage ledger 无污染。
- 删除 A 后 B 的 usage、typed docs、repair work item 和 dispatch brief 完整保留。
- ledger 不保存 raw transcript body。

## 回归结果

- Phase 310 exact-session closure feedback：13/13。
- Phase 309 Provider ranking memory usage repair：14/14。
- Phase 308 completion preservation closure：14/14。
- Phase 307 replay-repair feedback exact-session distillation：13/13。
- Worker compact exact-session distillation：通过。
- Provider reliability exact-session promotion：通过。
- Provider generation restart reconciliation：14/14。
- Group auto-compaction session scope：12/12。
- Global Agent global-only context：13/13。
- backend TypeScript build：通过。

## 长期目标状态

Phase 310 完成，但 Claude Code 级记忆系统长期目标继续保持 active。下一阶段继续审计 corrected-receipt completion consumption、typed completion feedback 和 conflict-resolution background maintenance 是否会从裸群级入口遗漏 exact work ledger；全局 Agent 继续只消费全局上下文。

## 生产部署

- URL：`http://localhost:3081`
- PID：`12808`
- stdout：`C:\Users\admin\.cc-connect\logs\ccm-server-phase310.log`
- stderr：`C:\Users\admin\.cc-connect\logs\ccm-server-phase310.err.log`
- 首页：HTTP 200
- Memory Center overview：9 个群聊
- targeted quality API：成功，新检查已注册；当前生产无匹配样本时状态为 `empty`
- stderr：0 bytes
