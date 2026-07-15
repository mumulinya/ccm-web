# CCM Memory CC Parity Phase 329

## 目标

对齐 Claude Code 对 compaction API 响应 `usage` 的处理，补齐 CCM 压缩模型调用的实际 input/output/cache token 证据，并与 true post-compact context payload 估算严格分离。

## Claude Code 对照

本阶段对照：

- `D:\claude-code\src\services\compact\compact.ts`
- `getTokenUsage(summaryResponse)`
- `compactionInputTokens`
- `compactionOutputTokens`
- `compactionCacheReadTokens`
- `compactionCacheCreationTokens`
- `compactionTotalTokens`
- `truePostCompactTokenCount`

Claude Code 明确区分：

1. 生成摘要的模型调用实际用量。
2. 压缩完成后重新组合的上下文 token 估算。

CCM 之前已有模型输入预算和 true post-compact payload 门禁，但 `callCompactionModel()` 解析响应后丢弃了 provider `usage`。

## 实现

### Provider usage receipt

新增：

- `ccm-group-compaction-model-usage-v1`
- `buildGroupCompactionModelUsageReceipt()`
- `verifyGroupCompactionModelUsageReceipt()`

receipt 保存：

- 精确 `group_id + gcs_*`
- provider 和 model
- `input_tokens`
- `output_tokens`
- `cache_read_input_tokens`
- `cache_creation_input_tokens`
- provider total 和 CCM accounted total
- 请求预算中的 estimated input
- actual/estimated delta 和 ratio
- response id、stop reason
- `usage_checksum`
- `body_free=true`

不保存 prompt、摘要正文、API URL、API key 或 HTTP response body。

### Provider 口径

- Anthropic：input、cache read、cache creation、output 分开统计，accounted total 为四项之和。
- OpenAI-compatible：支持 `prompt_tokens / completion_tokens / total_tokens`。
- OpenAI `prompt_tokens_details.cached_tokens` 作为 cache-read 可见指标，但标记 `cache_read_included_in_input=true`，不会重复计入 total。
- 兼容接口成功但未返回 usage：`status=unreported`，不伪装为 reported zero usage。
- HTTP/解析失败：`status=failed`，保留预算审计并继续使用 deterministic fallback summary。

### 持久化与恢复

receipt 写入：

- `compactBoundary.compactionUsage`
- `compactBoundary.compactMetadata.compactionUsage`
- `compactBoundary.post_compact_restore.compactionUsage`
- `compaction.compactionUsage`
- `messageCompression.compactionUsage`

boundary journal identity 加入重新计算的 `compactionUsageChecksum`。commit 和 resume projection 校验 receipt checksum、group、精确会话和 journal identity；篡改用量后 resume fail closed，不能把伪造 token 当作容量或 provider 可靠性证据。

### 子 Agent 与 Memory Center

项目子 Agent 受控记忆包显示已验证的 provider/model/input/output/cache/total/estimated input。无效 receipt 显示 `fail_closed`。

Memory Center 新增 `Compaction Model Usage` body-free 面板，展示：

- provider/model
- input/output
- cache read/create
- accounted total
- actual/estimated delta
- receipt 状态与 checksum

实际 compaction-call usage 与 `True post-compact payload` 保持两个独立面板和两个独立 checksum。

Global Agent 不读取群聊 compaction usage。

## 专项验证

新增：

- `scripts/group-compaction-model-usage-restart-selftest.mjs`
- `npm run test:group-compaction-model-usage-restart`

结果：`23/23`。

测试使用本地 HTTP provider 实际执行四类请求：

- OpenAI-compatible reported usage。
- Anthropic-compatible cache usage。
- 成功但 usage 缺失。
- HTTP 500 fallback。

覆盖：

- OpenAI token 正规化。
- Anthropic cache read/create 保留。
- OpenAI cached token 不重复计数。
- unreported 与 failed 明确区分。
- body-free 与 secret/prompt 不落 receipt。
- request estimate 与 actual usage 对账。
- actual call usage 与 post-compact payload 分离。
- 多位置持久化。
- 同群其他 `gcs_*` 拒绝。
- raw transcript 不修改。
- boundary journal 有效恢复。
- usage 篡改 fail closed。
- 子 Agent verified/fail-closed 展示。
- 新进程重启后 receipt 保持。

回归：

- Phase 328 compact lineage：`19/19`。
- Phase 327 message order：`28/28`。
- boundary journal：`16/16`。
- model capacity：`7/7`，3 MB 原始内容不会整份送入小窗口模型。
- `npm run check`：通过。

## Memory Center 最终验收

使用正式 `buildGroupCompactionModelUsageReceipt()` 和 `saveGroupMemory()` 创建同群聊、三个精确会话的 body-free 验收数据：

- `phase329-ui-acceptance::gcs_phase329_ui_reported`
- `phase329-ui-acceptance::gcs_phase329_ui_unreported`
- `phase329-ui-acceptance::gcs_phase329_ui_failed`

后端 `/api/memory-center/scope` 对三个会话分别返回 `reported / unreported / failed`，receipt 均 `valid=true`、`body_free=true`。reported 会话展示 input `120`、output `30`、cache read `80`、accounted total `150`，OpenAI cache read 未重复计入 total。

浏览器验收结果：

- 桌面 `1280 x 720`：7 张 usage 卡全部无内部溢出，面板 `scrollWidth=clientWidth=634`，整页无横向溢出。
- 移动端 `390 x 844`：卡片按两列布局，面板 `scrollWidth=clientWidth=306`，7 张卡和整页均无横向溢出。
- 三种状态均显示正确，checksum receipt 显示 `valid`，body-free 说明存在。
- 控制台 error：`0`。

验收期间发现 64 位 checksum 会撑宽通用 discipline 卡片和 hook ledger。已为卡片值、说明增加 `overflow-wrap:anywhere`，并为重复 checksum code 增加单行省略约束；完整 checksum 仍在 receipt 卡中可见。

最终验证：

- `npm run check`：通过。
- `npm run build`：通过。
- 最终 CSS 修复后的 `npm run build:frontend`：通过。
- 最终 Memory Center 资源：`MemoryCenter-lsqFG6GJ.js`、`MemoryCenter-BH-BNTOV.css`。

## 当前判断

Phase 329 已完成。CCM 现在同时拥有压缩请求预算、provider 实际调用 usage 和压缩后上下文估算三类独立证据。长期目标继续保持 active，后续继续审计 Claude Code session-memory compact 的触发选择和 usage 归因。
