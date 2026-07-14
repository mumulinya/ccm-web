# CCM Memory CC Parity Phase 257

## 目标

补齐第三方子 Agent 原生会话续接和实际模型容量变化后的上下文重新预算证明，避免 CCM 只凭请求参数或返回的 session id 就误认为已经 resume，也避免 200K 预算派发后实际落到 64K 模型时继续沿用过大的记忆额度。

固定边界保持不变：

- 群聊记忆只使用 `groupId--gcs_*`，多个群聊以及同一群聊的不同会话相互隔离。
- 每个项目子 Agent 任务使用独立 `tas_*`，只注入所属群聊当前 `gcs_*` 的记忆。
- Global Agent 只接收全局记忆和群聊路由元数据，不接收群聊消息正文。
- `ignore memory` 不注入历史记忆，也不生成虚假的续接或重新预算证明。
- `default`、legacy、归档历史和废弃旧会话直接删除，不迁移、不恢复。

## Claude Code 对照

Claude Code 的 resume 与 compact 后继续执行依赖真实 provider 运行结果，而不是调用方自己的意图声明。CCM 因此把“请求继续某个会话”和“provider 已实际继续该会话”拆成两层：

1. runner 产生签名 native continuation evidence，绑定 provider、请求、期望 session、返回 session 和退出状态。
2. invocation lineage 只接受校验通过的 runner evidence，不接受调用方回填的 session id 作为强证明。
3. 实际 provider capacity receipt 与已经派发的 typed-memory capsule budget 做不可变对账。
4. 如果实际窗口更小，只记录本轮已经发生的容量漂移，并强制下一轮在派发前重建和重新压缩；绝不声称已经发送的 prompt 被事后改写。

## 实现

### Native Continuation Evidence

新增 `backend/agents/native-continuation.ts`，定义签名 runner evidence，并区分四种来源：

- `provider_output`：provider 输出了可核验的原生 session id。
- `provider_resume_exit_success`：真实 `--resume` 成功退出，但 provider 没有重复打印 session id。
- `request_fallback`：只有请求中携带的 session id，仍为 `unverified`。
- `missing`：没有原生续接证据。

新增 `ccm-task-agent-native-continuation-receipt-v1`。receipt 绑定 invocation edge、`groupId--gcs_*--tas_*`、runner request、provider 和 native session；session 不一致、跨群复用、checksum 篡改或仅 request fallback 都不能确认 adoption。

### Context Rebudget Proof

新增 `ccm-task-agent-context-rebudget-proof-v1`，把实际 provider capability receipt 与已派发 capsule 的以下事实绑定：

- 派发时模型上下文窗口和有效记忆 token 额度。
- provider 实际上下文窗口和按相同策略重算的额度。
- 容量差值、额度漂移和 capability receipt 校验结果。
- 本轮 prompt 是否可能已重新预算。
- 下一次派发是否必须先 rebuild/recompact。

200K 降到 64K 的覆盖用例中，已派发记忆额度为 4000 tokens，实际允许额度为 1280 tokens，漂移为 2720 tokens。proof 明确记录 `current_prompt_rebudgeted=false`，并设置 `next_dispatch_rebuild_required=true`。

### 真实派发路径

以下三条路径都持久化 native continuation evidence、原始 capability receipt 和 capsule budget：

- 群聊协作派发。
- direct task 派发。
- auto assign 派发。

direct dispatch spool 崩溃恢复也保留这些证据，不会在恢复时退化为调用方声明。

### Capacity Downgrade Gate

`backend/agents/worker-handoff.ts` 在容量下降后无论复用还是重建 WorkerContextPacket，都保留 `capacity_downgrade_gate`。下一次派发必须先执行 `rebuild_and_recompact_before_next_dispatch`，防止重建 packet 时丢失降级栅栏。

### Memory Center

Task Agent Memory 报告新增：

- native continuation receipt、acknowledged 和 unverified 计数。
- context rebudget proof、verified、drift 和 unavailable 计数。
- invocation 明细中的 rebudget 状态和 recovery fence。

前端卡片新增 `native resume` 与 `re-budget`，数据来自持久化 invocation evidence，不由前端推测。

## 验证

新增 `scripts/task-agent-native-continuation-rebudget-selftest.mjs`，Phase 257 专项测试为 26/26，覆盖：

- provider resume 确认。
- request fallback 拒绝。
- native session 不一致。
- receipt 篡改。
- 跨群复用拒绝。
- 200K 到 64K 容量下降和下一轮重建栅栏。
- durable direct-spool 崩溃恢复。
- Global Agent 正文隔离边界。

顺序回归结果全部通过：

- Phase 257：26/26。
- Phase 256：42/42。
- Phase 255：32/32。
- Phase 254：22/22。
- recovery center：26/26。
- direct spool：39/39。
- dispatch WAL：39/39。
- consume ticket：40/40。
- delivery capsule：21/21。
- delivery lease：50/50。
- model-aware budget：42/42。
- atomic JSON：24 workers、26 records、leftovers 0。
- model capability cache：通过。
- model capability recovery/race：通过。
- Memory Center session isolation：通过。
- `npm run check`：通过。
- `npm run build`：通过。

浏览器验收：

- 桌面 `1280x720`：页面宽 1280px、document scroll width 1280px，记忆中心宽 985px、scroll width 985px。
- 手机 `390x844`：document scroll width 390px，记忆中心宽 367px、scroll width 367px。
- 两种尺寸都能找到 `native resume` 和 `re-budget`。
- 浏览器 console warning/error：0。

## 会话清理

旧会话按用户要求直接删除，不做迁移：

- `gmps7ha15` 只保留当前 `gcs_mriu5m33_ahy0yo`。
- `gmqbz18hj` 只保留当前 `gcs_mriu5m6i_2vpxc9`。
- `gmr02wpbv` 只保留当前 `gcs_mriu5m94_sfq6ix`。
- 三个 manifest 都只有一个 session，`legacy=false`。
- `default`、legacy 和 history session 为 0。
- 空群聊暂不物化 Session Memory 目录；首次产生有效消息后再创建，不用空制品冒充记忆。

## 生产状态

- 服务：`http://localhost:3081`。
- 生产 PID：`18284`。
- Memory Center overview：HTTP 200。
- Memory Center quality：HTTP 200。
- `.runtime-server.err.log`：0 字节。
- invocation lineage 正式制品：0。
- invocation recovery 正式制品：0。
- typed-memory dispatch WAL 正式制品：0。
- 当前没有正式 invocation record，因此 Memory Center 中本阶段生产计数为 0，符合实际状态。

## 后续方向

长期 CC parity 目标继续保持 active。下一阶段继续审计真实 provider 的 fork/resume 兼容矩阵、长任务与服务重启 soak，以及容量降级栅栏在下一轮真实派发前的自动兑现；现有多群聊、多 `gcs_*`、独立 `tas_*` 和 Global Agent 正文隔离边界不变。
