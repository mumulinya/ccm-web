# Provider 中立上下文缓存与编辑计划

## 目标

CCM 在全局、群聊和项目主 Agent 的直接模型请求链中统一管理活跃上下文，同时严格区分 Provider 原生能力与 CCM 受控内容投影。

```text
权威 transcript / 正式摘要 / 执行账本
-> 统一会话上下文投影
-> 不可变内容块与编辑计划
-> Provider 适配器
   -> Anthropic 直连且能力成立：原生 context_management
   -> OpenAI-compatible 或普通本地 API：CCM 受控投影与稳定前缀
   -> 外部 CLI：MCP / Prompt hydration，不声明原生缓存
-> Provider usage 与校验回执
```

## 数据边界

- 缓存状态只保存块 ID、类型、Token 估算、checksum、编辑动作和 Provider 回执，不保存 Prompt 正文。
- 原始 transcript、正式模型摘要和隐藏执行账本仍是唯一事实来源。
- `keep / insert / replace / delete` 只描述下一次请求如何复用或物化上下文，不修改 canonical memory。
- 每份计划绑定 scope、精确 session、generation、compact boundary、Provider、模型和 checksum。
- Provider 未证明原生能力时，`providerNative` 必须为 `false`，不能用 CCM 投影冒充原生 KV cache 或原生计费优惠。

## Provider 模式

| 模式 | 行为 |
| --- | --- |
| 自动选择 | Anthropic 官方直连且存在可验证编辑计划时使用原生能力，否则使用 CCM 受控投影。 |
| 优先原生 | 请求原生能力；能力或编辑条件不成立时降级为 CCM 受控投影并记录原因。 |
| CCM 受控投影 | 始终由 CCM 物化已经过会话压缩、MicroCompact 与恢复门禁的完整消息。 |
| 关闭 | 不生成 Provider 上下文缓存计划；会话压缩与 canonical memory 仍正常工作。 |

Anthropic 原生路径沿用已有 `context-management-2025-06-27` 请求补丁、apply plan 校验和请求遥测。普通 API 只获得等价的内容管理语义，不宣称获得 Provider 内部 KV cache。

## Adapter V2

统一缓存协议之下新增独立 Provider Adapter：

- Anthropic：支持 `context_management`；用户显式开启后，按 CC 的位置约束给缓存边界前的 `tool_result` 添加 `cache_reference`，把去重后的 `cache_edits` 固定到后续用户消息，并统计 cache read/create/delete 及 5 分钟、1 小时创建桶。
- OpenAI：官方端点使用精确会话与 compact boundary 派生的稳定 `prompt_cache_key`；用户可选择 Provider 默认保留或 `24h` extended retention；从官方 usage 的 cached token 字段拆分直接输入和缓存读取。
- Gemini：增加 Generate Content 原生请求与流式响应适配，保持稳定前缀并读取 `cachedContentTokenCount`，将其标记为 Provider 隐式缓存而不是 CCM 模拟缓存。
- 自定义兼容网关：默认不发送专用字段；只有用户显式声明支持原生缓存并选择 OpenAI、Anthropic 或 Gemini 协议族后，才启用对应 Adapter。

连接测试返回实际选中的 Adapter、能力来源和允许发送的字段。Provider 请求失败仍由统一五次重试和任务级熔断处理，缓存 Adapter 不单独绕过失败策略。

## 运行链路

- 群聊主 Agent 通过 `promptCacheTracking` 自动绑定当前 `gcs_*` 会话。
- 项目主 Agent 绑定当前项目 ID、项目会话和 compact boundary generation。
- 全局 Agent 绑定当前全局会话，计划轮次与正式回复轮次均记录回执。
- 重试请求复用相同内容地址；内容变化会形成 replace/insert/delete 动作。
- 最新状态在记忆中心展示不可变块、复用块、变化块、投影 Token、Provider 实测输入与原生缓存读取 Token。
- 同一精确会话和内容 checksum在进程内优先命中短期物化热缓存；并发请求通过Singleflight只执行一次消息物化与Token预检，但不合并模型回答。
- 稳定前缀根据块类型与连续复用率自适应排列，调整范围只限前置system块，不改变用户、assistant或工具调用顺序。
- usage回执持续计算投影耗时、Provider耗时、缓存命中和可核验成本，并生成无需额外模型调用的配置建议。
- 会话删除、generation/boundary变化和定期维护会清理对应状态；多进程通过文件锁和可回收租约共享元数据与能力证据，Prompt正文不跨进程落盘共享。

## 安全与失败策略

- 缓存层不截断字符、不生成本地摘要，也不放宽正式 Token 容量门禁。
- 受控投影复用统一会话投影器的完整轮次、时间型 MicroCompact 和可恢复工具结果替换。
- 原生请求补丁必须通过 checksum 与能力检查；不支持该能力的中转 API 默认不发送 beta 请求。
- Provider 请求失败会写失败回执，原始会话和正式记忆不受影响。

## 验证

- `npm run check`
- `npm run build:frontend`
- `npm run test:provider-context-cache`
- `npm run build`
- Provider 调用全部使用 mock，付费调用为 `0`。

协议核对依据为 [OpenAI Prompt Cache 参数](https://platform.openai.com/docs/api-reference/chat/create)、[Gemini Context Caching](https://ai.google.dev/gemini-api/docs/caching) 以及本地 CC `services/api/claude.ts` 的缓存块放置规则。
