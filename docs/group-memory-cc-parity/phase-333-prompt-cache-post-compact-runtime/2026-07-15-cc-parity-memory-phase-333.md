# CCM Memory CC Parity Phase 333

## 目标

把 Phase 332 的 `cache_read_baseline=reset` 从持久化声明推进为真实运行时行为：群聊压缩后，下一次所属群聊主 Agent provider API 成功响应必须一次性消费 post-compaction 标记、建立新的 cache-read baseline，并避免把压缩造成的正常 cache read 降低误报为 cache break。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\api\promptCacheBreakDetection.ts`
- `notifyCompaction()`
- `checkResponseForCacheBreak()`
- `D:\claude-code\src\bootstrap\state.ts`
- `markPostCompaction()` / `consumePostCompaction()`
- `D:\claude-code\src\services\api\logging.ts`

Claude Code 的关键行为：

1. compact 与 main thread 共用 prompt-cache tracking key。
2. `notifyCompaction()` 把上一轮 cache-read baseline 清空。
3. 下一次 API success 先写入新 baseline，不比较旧值，不产生 cache-break 告警。
4. `markPostCompaction()` 只被下一次 API success 消费一次。
5. 普通调用仍按 cache read 降幅大于 5% 且绝对下降至少 2,000 tokens 识别 cache break。

## 实现

新增 `backend/modules/collaboration/group-prompt-cache-break-detection.ts`：

- `ccm-group-prompt-cache-break-ledger-v1`
- `ccm-group-prompt-cache-compaction-notification-v1`
- `ccm-group-prompt-cache-usage-event-v1`
- `notifyGroupPromptCacheCompaction()`
- `recordGroupPromptCacheUsage()`
- `readGroupPromptCacheBreakDetection()`
- `verifyGroupPromptCacheCompactionNotification()`

账本严格绑定 `group_id + gcs_*`，持久记录：

- baseline generation。
- 上一次 `cache_read_input_tokens`。
- 待消费的 post-compaction boundary/reset receipt。
- API success call count。
- cache-break count。
- 最近 body-free 用量事件和 checksum。

自动压缩成功后会调用 `notifyGroupPromptCacheCompaction()`：

- 清空所属 `gcs_*` 的旧 cache baseline。
- 写入一次性 pending post-compaction 标记。
- 生成 notification receipt，并与 Phase 332 reset receipt checksum、boundary ID 和 generation 绑定。
- 将 notification 写入 compaction、message compression 和 compact boundary。

群聊主 Agent provider 用量回调现在保留：

- `directInputTokens`
- `cacheCreationInputTokens`
- `cacheReadInputTokens`
- `outputTokens`

群聊主 Agent 的 planning、review 和 final summary 三个真实 provider success 入口都会调用 `recordGroupPromptCacheUsage()`。其中任一入口最先成功时，若发现 pending post-compaction：

- classification=`post_compaction_baseline_reset`
- `is_post_compaction=true`
- `cache_break=false`
- 当前 cache read 成为新 baseline
- pending 标记立即清除

后续普通 Anthropic 调用才按 CC 的 `5% + 2,000 tokens` 双阈值检测 cache break。OpenAI-compatible provider 没有 Anthropic cache 指标时记录 `unsupported_provider`，仍会一次性消费 post-compaction 标记，但不会伪造 cache-break 判断。

## 持久化与隔离

Prompt-cache ledger 使用原子写入、备份恢复、checksum 和文件锁。主文件与备份同时损坏时返回 `fail_closed`，停止 cache-break 推断，但不阻塞群聊主 Agent 的业务调用；下一次可信 compact notification 可建立新 generation。

Boundary journal identity 新增 `promptCacheCompactionNotificationChecksum`，并校验：

- 群聊、`gcs_*`、boundary。
- Phase 332 reset receipt checksum。
- baseline generation 一致。
- `reset_pending_next_api_success` 状态。
- body-free 和 notification checksum。

群聊会话删除会同步删除 prompt-cache primary、backup 和 lock 文件，不能遗留跨会话 baseline。

## 上下文与 Memory Center

项目子 Agent 受控记忆包会显示：

- cache notification 校验状态。
- pending/consumed generation。
- API call/cache-break 数量。
- 最近 classification、cache read 和 post-compaction 标记。

Memory Center 新增“Prompt Cache 运行时”面板，展示 exact-session baseline、notification、recent usage events、token drop 和 checksum 状态。

Global Agent 的 global-only 上下文不消费群聊 prompt-cache ledger。

## 验证

新增：

- `scripts/group-prompt-cache-post-compact-runtime-restart-selftest.mjs`
- `npm run test:group-prompt-cache-post-compact-runtime-restart`

专项结果：`14/14`。

覆盖：

- 自动压缩生成 notification。
- notification 与 Phase 332 reset/boundary 绑定。
- 下一次真实群聊主 Agent summary provider 用量回调消费 pending 标记。
- planning/review 后续调用共享所属 `gcs_*` 新 baseline。
- 压缩后大幅 cache read 下降不误报。
- 下一次小幅/小绝对值下降保持 stable。
- 普通大幅下降识别 cache break。
- 多 `gcs_*` baseline 与 break count 隔离。
- 重启后 baseline、call count 和 generation 保留。
- boundary journal 绑定 notification checksum。
- Memory Center 展示。
- ledger body-free。
- primary/backup 损坏 fail closed。
- 群聊会话删除清理 ledger。

回归：

- Phase 332 post-compact session reset：`14/14`。
- Phase 330 Session Memory selection：`15/15`。
- Phase 331 API invariant closure：`14/14`。
- boundary journal：`16/16`。
- LLM token usage normalization：通过。

## 当前判断

Phase 333 关闭了“收据显示 baseline 已重置，但 provider 运行时仍可能拿旧 cache read 比较”的差距。压缩后的第一轮群聊主 Agent API success 现在具有与 Claude Code 相同的一次性 post-compaction 语义，且在 CCM 的多群聊、多会话模型中按 exact `gcs_*` 持久隔离。

长期目标继续保持 active，下一轮继续从 Claude Code 源码和真实 provider 证据审计新的行为差异。
