# CCM Context Engine V2

## 目标

Context Engine V2 将会话投影、Token 门禁、正式压缩、MicroCompact、Provider 缓存适配、第三方 Agent hydration 和真实 usage 收敛为一条可核验链路：

```text
权威 transcript / 正式摘要 / 长期记忆 / 隐藏执行账本
-> 完整模型可见消息
-> ContextPlanV2 不可变块
-> 真实 Token 门禁
-> Provider 能力证据与适配器
-> 原生缓存或 CCM 受控投影
-> usage 回执与记忆中心
```

原始 transcript、正式模型摘要和经过 admission 的长期记忆仍是唯一事实来源。V2 状态只保存块类型、Token、checksum、不可变地址、编辑动作和 Provider usage，不保存 Prompt、API Key、工具结果正文或含密钥 URL。

## ContextPlanV2

每次绑定精确会话的统一模型请求都会惰性生成 `ccm-context-plan-v2`。身份包含：

- 脱敏 Provider 地址指纹、接口协议、模型和推理后端类型；
- `global | group | project | music` scope、scope ID 和精确 session；
- native generation、compact boundary generation 和上下文身份 checksum；
- System、Rules、Skill、MCP、长期记忆、会话消息、tool use/result 的不可变块；
- `keep | insert | replace | delete` 增量编辑计划和块变化清单。

未压缩会话继续由统一会话投影器提供全部完整轮次。若 ContextPlanV2 的完整 payload 超过真实输入容量，门禁抛出 `CONTEXT_PLAN_TOKEN_GATE_REQUIRES_FORMAL_COMPACTION`，必须先执行正式模型压缩并重新投影；字符截断被明确禁止。

MicroCompact仍只投影已经配对、足够旧且满足时间策略的工具结果。原始 transcript和隐藏执行账本不修改，最近工具结果不因长度自动清理。

## Provider 能力证据

`ProviderCacheCapabilityEvidenceV1` 按以下身份隔离：

```text
脱敏接口指纹 + 接口协议 + 缓存协议族 + 模型 + 推理后端类型
```

状态与有效期：

| 状态 | 含义 | 有效期 |
| --- | --- | --- |
| `confirmed` | 第二次稳定前缀请求返回真实缓存读取 Token | 7 天 |
| `unsupported` | Provider明确拒绝所选缓存字段 | 7 天 |
| `unproven` | 接口可用，但没有可核验缓存 Token | 7 天 |
| `degraded` | 超时、网络或 5xx 临时失败 | 15 分钟 |

一次临时 `degraded` 不会撤销仍有效的 `confirmed`，但会作为最近一次探测单独展示。`unsupported` 会阻止强制发送原生字段，直到管理员重新验证或清除证据。

“保存并测试连接”固定最多发起两次逻辑模型调用：第一轮同时验证连接，第二轮验证稳定前缀缓存。探测禁用模型重试；第一轮失败时不会发送第二轮。字段被接受、响应更快或后端指标存在，都不能代替每请求缓存 Token 回执。

## Provider 适配

- OpenAI：稳定 `prompt_cache_key`、可选 `prompt_cache_retention`，读取 cached input tokens。
- Anthropic：在能力成立且编辑计划通过校验时使用 `context_management`，可按用户配置使用 `cache_reference/cache_edits`。
- Gemini：使用 Generate Content传输和原生 cached content token usage。
- 普通中转站：按精确模型能力证据决定是否发送字段；未证明时使用稳定前缀与 CCM 受控投影。
- vLLM/SGLang：只连接用户已经运行的 OpenAI兼容服务。可读取同源 `/metrics` 证明 Prefix/Radix KV缓存状态，但只有每请求缓存 Token 才计入节省。

CCM 不安装或管理 Python、CUDA、模型文件、vLLM/SGLang进程和 GPU运行时。vLLM Automatic Prefix Caching见[官方文档](https://docs.vllm.ai/en/latest/design/prefix_caching/)，SGLang RadixAttention见[官方仓库](https://github.com/sgl-project/sglang)。

## MCP Hydration

第三方 Agent manifest已升级为 V2，并增加：

- `context_plan_checksum`；
- `block_changes`；
- `confirmation_cursor`和上一轮确认消息游标。

首次绑定、Provider切换、native generation变化或 compact boundary变化继续完整加载。同 generation且上一轮确认有效时只读取新增消息和变化记忆。Context plan、scope、snapshot checksum或确认游标不匹配时 acknowledgement失败，不能绕过为增量加载。

## CCM 自建缓存 V2.2

Provider 原生 KV缓存不可用或无法证明时，CCM仍通过六项本地能力减少重复上下文准备开销。这些能力不缓存模型最终回答，也不冒充 Provider原生 Token优惠。

1. **上下文物化热缓存**：进程内短期保存已构造的消息结构、不可变块和 Token预检结果。键绑定精确 scope、session、generation、boundary、模型配置和内容 checksum；默认5分钟、128项、32 MiB，任一身份变化即失效。Prompt正文不落盘。
2. **并发 Singleflight**：相同身份与内容 checksum的并发请求只有一个物化owner，其余请求等待并复用物化结果。每次 Provider调用、usage回执和模型回答仍保持独立。
3. **自适应稳定前缀**：只在连续的前置 system块内，根据真实连续复用率和块类型排列System、Rules、Skill、MCP及长期记忆；任务状态与会话消息留在后部。用户、assistant和工具调用顺序不改变。
4. **成本与延迟闭环**：记录CCM投影耗时、Provider耗时、直接输入、缓存创建、缓存读取，以及Provider回报或用户配置单价计算的成本。建议只基于真实usage滚动样本生成，不调用模型或自动探测。
5. **缓存状态清理**：删除会话时立即清除精确缓存；generation或boundary变化时清理旧热缓存epoch；定期清除长期未访问状态、过期回执归档和过期能力证据，损坏状态进入隔离目录。
6. **多实例共享**：会话状态、usage回执、能力证据和维护任务使用跨进程文件锁与可回收租约。多进程共享元数据和能力证据，但Prompt正文热缓存只存在于各自进程内。

运行状态通过 `GET /api/context-engine/cache/runtime` 读取；管理员可通过 `POST /api/context-engine/cache/maintenance` 执行预览或受控清理。记忆中心展示物化来源、稳定前缀、投影/Provider延迟、成本和建议，不返回Prompt或密钥。

## API 与页面

- `GET /api/orchestrator/cache-capability`
- `POST /api/orchestrator/cache-capability/probe`
- `POST /api/orchestrator/cache-capability/revoke`
- `GET /api/context-engine/status?scope=<scope>&scope_id=<id>&session_id=<session>`
- `GET /api/context-engine/cache/runtime`
- `POST /api/context-engine/cache/maintenance`

设置页支持推理后端类型、同源指标路径、能力状态、重新验证和管理员清除证据。“保存并测试连接”使用两轮能力探测；旧 `/api/orchestrator/connection-test` 保持单次连接测试兼容。

记忆中心按真实状态展示 Context Engine版本、适配器、能力状态、不可变块、复用/变化、直接输入、缓存创建、缓存读取和命中率。没有 Provider回执时明确显示未记录，不补造命中数据。

## 验证证据

- `npm run build:backend`
- `node scripts/context-engine-v2-selftest.mjs`：55项通过，覆盖热缓存、Singleflight、自适应前缀、成本建议、清理与多实例租约
- `node scripts/provider-neutral-context-cache-selftest.mjs`：Provider适配回归通过
- `node scripts/third-party-memory-mcp-hydration-selftest.mjs`：49项通过
- `npm run build:frontend`
- `CCM_BASE_URL=http://127.0.0.1:3080 node scripts/settings-render-regression.mjs`：桌面与移动端11项通过
- `npm run test:memory`：12个测试文件全部通过
- `npm run test:agents`：8个测试文件全部通过
- `CCM_BASE_URL=http://127.0.0.1:3080 npm run test:frontend`：21个测试文件全部通过
- 所有能力探测测试使用 mock，付费 Provider调用为 `0`

真实能力验收只能由管理员主动点击“保存并测试连接”触发；CI和普通后台任务不会自动产生探测费用。本轮未发布 npm。

命令行真实验收入口为 `CCM_LIVE_CACHE_PROBE=1 npm run test:provider-cache-live`。未设置该环境变量时脚本会在调用 Provider前直接退出。
