# Phase 246: Model-aware Memory Attachment Budget

## 目标

把项目子 Agent 的类型化记忆投递从字符数粗裁剪升级为与 Claude Code attachment 机制一致的容量控制，并结合 CCM 的多群聊、多任务会话结构补齐：

- UTF-8 实际字节限制。
- 单文档行数限制。
- 当前子 Agent 模型窗口感知。
- 同一 `tas_* + compact epoch` 的累计投递上限。
- Runtime Kernel 独立统计复算和 fail closed。
- 记忆中心用户可配置入口。

legacy/default/废弃旧会话仍直接删除，不迁移。

## Claude Code 对照

依据 `D:\claude-code\src\utils\attachments.ts`：

- `MAX_MEMORY_LINES = 200`。
- `MAX_MEMORY_BYTES = 4096`。
- 每轮最多 5 份相关记忆，约 20KB。
- `RELEVANT_MEMORIES_CONFIG.MAX_SESSION_BYTES = 60 * 1024`。
- compact 后 surfaced byte 预算自然重置。

依据 `D:\claude-code\src\memdir\memdir.ts`：

- `MEMORY.md` 是短索引，不是把全部长期记忆正文永久塞入模型上下文。
- 相关正文按当前任务选择后，以独立、有界 attachment 进入当前会话。

## 实现

### 1. 记忆中心容量配置

新增配置：

| 配置 | 默认值 | 硬范围 |
| --- | ---: | ---: |
| `typedMemoryDeliveryMaxDocuments` | 5 | 1-5 |
| `typedMemoryDeliveryMaxBytesPerDocument` | 4096 | 512-4096 bytes |
| `typedMemoryDeliveryMaxLinesPerDocument` | 200 | 10-200 行 |
| `typedMemoryDeliveryMaxSessionBytes` | 61440 | 4096-61440 bytes |
| `typedMemoryDeliveryMaxTokens` | 5000 | 500-20000 token |

用户可以调小限制，但不能突破 Claude Code 的 5 文件、单文件 4KB/200 行、单压缩周期 60KB 硬边界。

### 2. 模型感知 token 预算

每次为项目子 Agent 构建胶囊时使用：

```text
effective_max_tokens = min(
  configured_max_tokens,
  max(1000, floor(model_context_window * 0.02))
)
```

- 32K 模型窗口自动下降到 1000 token。
- 516K 和 1M 窗口仍受用户配置的 5000 token 默认上限约束。
- 优先使用当前 task Agent session 已验证的 `modelContextWindow`。
- 当前 session 尚未获得原生模型能力时，使用编排配置；两者都没有时使用 200K 保守默认值。

### 3. Unicode 安全裁剪

正文按以下顺序处理：

1. 规范化换行并限制前 200 行。
2. 按 Unicode code point 寻找满足 UTF-8 byte 上限的最长前缀。
3. 同时满足当前剩余 token 预算。
4. 同时满足当前 task session compact epoch 的剩余 byte 预算。

不会在 UTF-16 surrogate pair 中间切断 emoji，也不会把中文字符按单字节误算。每行记录：

- `source_chars/bytes/lines/tokens`。
- `delivered_chars/bytes/lines/tokens`。
- `truncated`。
- `truncation_reasons`。

### 4. 60KB scope 累计账本

召回 scope 已包含：

- target project。
- task Agent session `tas_*`。
- compact epoch。

召回账本升级为 version 2，只累计胶囊中实际投递的 relPath、bytes 和 tokens。预算跳过的候选不会被误标为 surfaced，也不能生成正向消费回执。

同 scope 累计达到 61440 bytes 后停止继续预取。compact boundary 改变后 scope 中的 `cmp_*` 改变，新 scope 从 0 开始，因此无需修改或清空历史账本即可恢复额度。

### 5. Capsule v2 完整性

胶囊 schema 保持：

```text
ccm-child-typed-memory-delivery-capsule-v1
```

版本升级为 2，checksum 新增覆盖：

- 完整预算配置和模型窗口。
- 候选、考虑、投递、跳过数量。
- 总 chars/bytes/lines/tokens。
- session 投递前后容量。
- 每行 source/delivered 统计。
- 截断原因和 budget exhausted 状态。

身份字段仍由 Phase 245 的 expected binding 独立校验。

### 6. Runtime Kernel 独立复算

Runtime Kernel 不信任胶囊声明，重新计算：

- 每行 content checksum。
- UTF-8 bytes。
- 行数。
- token 估算。
- Unicode surrogate 完整性。
- 总投递统计。
- 2% 模型窗口公式。
- 单文件、单轮和单 scope 上限。
- session 投递前后、剩余额度和 exhausted 状态。

即使攻击者修改统计后重新生成一个有效 aggregate checksum，实际统计不一致仍会失败。最终 Worker prompt 只显示 `INVALID delivery capsule`，不输出胶囊正文。

## 稳定边界

- 群聊记忆只使用 `groupId--gcs_*`。
- 每个项目子 Agent 任务先创建 `tas_*`，再构建记忆胶囊。
- 同一 `tas_* + compact epoch` 最多累计 60KB；compact 后自然重置。
- 只有胶囊真正送达的 relPath 才能进入 surfaced、消费反馈和召回账本。
- 用户可调小 attachment 限制，不能突破平台硬上限。
- Runtime Kernel 必须独立复算，checksum 正确不等于预算可信。
- ignore memory 继续拥有最高优先级，不创建投递胶囊。
- Global Agent 只使用全局记忆和群聊路由元数据，不接收群聊正文。
- legacy/default/废弃旧群聊会话直接删除，不迁移。

## 验证

- Phase 246 model-aware attachment budget：42/42。
- 大量中文：实际 4095 bytes，不超过 4096 bytes。
- 300 行文档：只投递前 200 行。
- emoji/surrogate：不切坏 Unicode，Runtime 校验通过。
- 32K 模型：投递预算自动降到 1000 token。
- 516K/1M 模型：不超过用户 5000 token 默认上限。
- 同 scope 三轮：累计 61440 bytes。
- 第四轮：停止投递，`budget_exhausted=true`。
- compact epoch 变化：新 scope 恢复投递。
- 伪造 byte 统计并重算 aggregate checksum：Runtime 仍拒绝，正文不进入最终提示词。
- ignore memory：不生成胶囊。
- Global Agent 边界：未引入群聊子 Agent memory bundle。
- Phase 245 identity fencing：69/69。
- Phase 244 delivery capsule：21/21。
- Phase 243 task-session recall：15/15。
- Phase 241 recall freshness/trust：14/14。
- 后端 TypeScript 构建：通过。
- `npm run check`：通过。
- 前端生产构建：通过。
- 记忆中心生产界面：五项容量控件值正确、布局无重叠、浏览器控制台错误 0。
- Phase 246/244/245/243 测试残留：0。

## 生产状态

- 服务：`http://localhost:3081`。
- PID：`27584`。
- `/api/orchestrator/config`：HTTP 200。
- 生产配置：5 文件、4096 bytes/文件、200 行/文件、61440 bytes/scope、5000 token。
- `ccm-server.err.log`：0 bytes。
- `gmps7ha15`：活动会话 `gcs_mriu5m33_ahy0yo`，sessions 1，legacy 0。
- `gmqbz18hj`：活动会话 `gcs_mriu5m6i_2vpxc9`，sessions 1，legacy 0。
- `gmr02wpbv`：活动会话 `gcs_mriu5m94_sfq6ix`，sessions 1，legacy 0。
- 旧 `phase235-semantic-*` 测试 session manifest 已删除 4 个，剩余 0。

## 长期目标状态

Phase 246 完成后，“CCM 记忆系统持续对齐 Claude Code”长期目标继续保持 active。下一阶段继续审计 Claude Code 的 attachment surfaced 生命周期、compact 后重取和跨模型容量变化处理，不把长期目标提前标记完成。
