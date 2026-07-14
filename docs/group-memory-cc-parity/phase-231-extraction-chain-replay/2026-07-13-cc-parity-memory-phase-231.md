# Phase 231：Session Memory 提取链、精确重放与输入预算审计

日期：2026-07-13

## 目标

继续对齐 Claude Code 的 Session Memory 可靠性：每次模型提炼不仅要有单条 checksum，还要能证明事件没有被删除、乱序或截尾；模型实际收到的请求和返回结果必须可精确重放；输入超出预算时必须保留最新证据、记录降级过程并在无法满足预算时拒绝调用模型。Memory Center 要允许用户重放任意一次成功或失败的提炼。

用户已明确允许不迁移旧会话。系统只接受 `groupId::gcs_*` 独立会话，`default` 继续 fail closed。

## 实现

### 1. 防篡改 extraction 历史链

`group-session-memory-model-extraction.ts` 将历史升级为 v2：

- 每条事件包含严格递增的 `sequence` 和 `previousChecksum`。
- `attempt_started`、`committed`、`failed`、`deferred` 共同进入同一条追加链。
- 独立的 `model-extraction-history-head.json` 绑定事件总数、末事件 ID 和末 checksum，并带自身 checksum。
- `.model-extraction-history.lock` 提供跨进程互斥、死进程和超时锁恢复。
- 已有链或签名头不合法时拒绝继续追加，避免在损坏证据上生成看似正常的新历史。
- 空历史且无签名头仍为合法空状态。

这使逐条 checksum 都合法但删除中间行、交换行顺序或截断尾部的情况都能被发现。

### 2. 精确请求与结果制品

每个 execution 新增两个原子写入的 gzip 制品：

- `model-extraction-artifacts/<execution>.request.json.gz`
- `model-extraction-artifacts/<execution>.result.json.gz`

请求制品保存模型实际看到的 current notes、有界 transcript、请求审计和 lease/fencing 绑定；结果制品保存原始输出、重新验证结果、merge quality 和签名回执。历史终态绑定两个制品和回执的 checksum。

`replayGroupSessionMemoryModelExtraction()` 会重新构造 prompt、验证请求和终态绑定、重新解析模型输出、复算模板/预算/markdown checksum/merge quality，并验证 success 或 failure receipt。损坏任一 gzip 或历史证据都会 fail closed。

合并质量判定改为只读取模型实际收到的有界 transcript，不再参考模型没有看见的旧消息，因此线上判定和离线重放完全一致。

### 3. 大模型输入预算降级

输入预算审计新增：

- 原始消息数和原始 transcript tokens
- 保留消息数、遗漏消息数和被截断的消息 ID
- fixed input、估算总输入、最大输入和利用率
- `full_fidelity`、`degraded_bounded`、`over_budget`

有界算法从最新消息向前保留，最后一条消息过大时只裁剪它的内容，并明确记录裁剪。即使这样仍超预算时，写入 deferred 历史和请求制品，但不调用模型。生产默认提炼输入上限仍为 120000 tokens，Session Memory 输出上限仍为 12000 tokens；不会因为原始群聊达到数百万 tokens 就把全部文本直接发送给模型。

Fleet 同时展示最新一次输入状态和历史 extraction 级 degraded/over-budget 计数，避免后续 full-fidelity 提炼覆盖过去发生过的降级事实。

### 4. Memory Center 重放

`MemoryCenter.vue` 新增：

- fleet 级 history chain、replay verified、input bounded 卡片
- 会话行中的 chain/head、最新 replay、输入 tokens、遗漏和裁剪状态
- committed/failed 历史事件的“重放”按钮
- 重放结果面板，逐项展示历史链、请求/结果制品、prompt 重建、输出、回执和 merge quality 校验

API：

`GET /api/memory-center/session-memory-extraction-replay?scope_id=...&execution_id=...`

接口只接受当前 fleet 中存在的非 `default` 群聊会话 scope。公开响应只包含状态、checks、checksums、压缩大小和预算摘要，不返回记忆正文、transcript、模型原始输出、内部事件对象或绝对文件路径。路径穿越和未知 scope 返回 404。

## Agent 边界

- 群聊主 Agent：每个 `groupId::gcs_*` 会话拥有独立 transcript、Session Memory、typed memory、sidecars、提取链和制品。
- 项目子 Agent：每次第三方 Agent 新会话只注入所属群聊会话的 snapshot 和证据，不读取其他会话。
- Global Agent：只接收全局记忆和路由/任务状态，不接收群聊 transcript、Session Memory 正文或提取制品。
- 多群聊和同群聊多会话继续按 scope、checksum、lease 和 fencing 隔离。

## 自测

新增 `scripts/group-session-memory-chain-replay-selftest.mjs`，12/12：

- 有界输入保留最新消息并记录 omitted/clipped。
- committed 和 failed extraction 都可精确重放。
- 四个 request/result gzip 制品均通过 checksum 和 scope 绑定。
- 删除 JSONL 行、交换行顺序和截断尾部均被发现。
- 损坏 result gzip 后重放立即失败，恢复文件后重新通过。
- 不可能满足的预算不会调用 executor。
- Fleet 正确聚合链、重放和预算事件。
- `default` scope 始终不存在。

Phase 230 自测扩展为 9/9，新增链头完整性和最新终态重放断言。

## 回归

- Phase 229 model extraction：12/12。
- Phase 230 cold recovery/history：9/9。
- Phase 226 cadence：17/17。
- Phase 227 transaction：11/11。
- Phase 228 delivery/fencing：通过，12 进程并发通过。
- budget/fleet：12/12。
- Memory Center session scope：5/5。
- boundary journal：14/14。
- resume integration：7/7。
- hot sidecar isolation：14/14。
- model capability cache：27 项及 unit/native receipt 全部通过。
- model capability recovery：13/13。
- model capability refresh race：6/6。
- `npm run check`：通过。
- `npm run build`：前端、MCP Feishu、后端全部通过。

## 界面验收

- 临时 QA 会话产生真实 committed extraction，Memory Center 显示 chain verified、replay verified、input full_fidelity。
- 点击“重放”后 15 项检查全部通过，请求 1.1 KB、结果 2.2 KB。
- `390 x 844`：页面无横向溢出，fleet、历史行和重放面板全部单列，面板宽 325.6px，内部无文本溢出或重叠。
- `1440 x 900`：document 无横向溢出，历史和重放面板保持在内容区域内；长会话摘要使用预期的 ellipsis。
- 浏览器控制台：0 error。
- 临时 QA 会话和 11 个关联制品在验收后全部删除。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`18980`
- 命令：`"D:\nodejs\node.exe" ccm-package/dist/server.js 3081`
- 群聊：3 个。
- 每个群聊：1 个全新、空的 active `gcs_*` 会话。
- 旧会话：0；不迁移、不兼容 `default`。
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`
- `modelExtractionHistoryInvalidCount = 0`
- `modelExtractionHistoryChainInvalidCount = 0`
- `modelExtractionReplayInvalidCount = 0`
- Phase 229/230/231 测试文件和空目录残留：0。

当前 fleet 为 `empty` 是预期状态：三个真实新会话尚无消息，不会为了制造健康数据提前创建摘要。达到 10000-token 初始化阈值后才启动真实模型提炼。

## 后续方向

长期目标保持 active。下一阶段优先补齐冲突事实的逐项 supersession 图、链和制品的保留/归档策略、跨版本 replay schema 迁移，以及将重放证据纳入子 Agent 记忆使用回执和故障恢复决策。
