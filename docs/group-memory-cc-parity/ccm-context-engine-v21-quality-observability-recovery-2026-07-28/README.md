# CCM Context Engine V2.1：质量、观测与恢复

## 目标

本轮在 Context Engine V2 的不可变上下文块、Provider缓存适配和正式模型压缩之上，补齐五项运行保障：模型级 Token预检、摘要质量门禁、历史趋势告警、精确会话恢复点，以及默认关闭的第二模型抽样复核。

原始 transcript、隐藏执行账本、正式摘要和经过准入的长期记忆仍是唯一事实来源。新增状态只保存 checksum、Token、质量分、能力证据和恢复副本，不把 Prompt正文写入状态、趋势或能力注册表。

## 模型级 Token预检

- OpenAI GPT-5、GPT-4o、GPT-4.1和 o 系列使用本地 `o200k_base` tokenizer；较旧 OpenAI模型使用 `cl100k_base`。
- Anthropic、Gemini及兼容模型使用保守的模型族估算，并根据真实每请求 input usage做 EWMA校准。
- 校准身份绑定脱敏端点指纹、协议、模型和推理后端，不保存 API Key或输入正文。
- ContextPlan的最终门禁使用安全调整后的模型级估算；超限只能先执行正式模型压缩，字符截断仍被禁止。

## 摘要质量门禁

全局、群聊、项目和音乐四条正式压缩链在推进 compact boundary前验证：

1. source message边界与精确会话一致。
2. 授权、约束、决定、引用、偏好和未完成事项等持久锚点被保留。
3. 上一轮正式摘要中的仍有效锚点保持连续。
4. 摘要与来源和保存参考有足够的可核验关联。
5. 存在阻塞或失败时，不允许摘要声称全部完成。

回执只保存分数、计数、问题代码和缺失锚点checksum。校验失败会拒绝正式摘要，不推进边界。

## 第二模型抽检

- 默认关闭，默认抽样比例为10%。
- 用户可独立配置 OpenAI、Anthropic或Gemini兼容复核接口、模型、超时和抽样比例。
- 抽样由精确 scope、session、generation和摘要checksum确定，同一摘要结果稳定。
- 命中后只调用一次，不自动重试；配置缺失、发现遗漏或幻觉时 fail closed。
- 复核 API Key使用本机凭据仓库加密，公共配置和回执不返回密钥。

## 趋势与告警

`context-engine-observability/events.jsonl`记录无正文事件：Provider输入与缓存usage、压缩前后Token、摘要质量分和压缩失败。账本限制单文件大小并轮转。

`GET /api/context-engine/trends`按精确scope/session返回：

- 平均压缩比例与压缩次数。
- 平均缓存命中率与最近投影Token。
- 上下文增长突增、连续压缩失败和低质量摘要告警。

记忆中心展示趋势摘要、真实质量回执和告警数量。

## 恢复点与演练

统一 `pre_compact` hook在正式压缩前为当前精确会话创建校验恢复点。恢复点最多保留10个并限制为30天。

- `GET /api/context-engine/recovery`列出精确会话恢复点。
- `POST /api/context-engine/recovery/drill`只校验副本大小与checksum，不修改canonical会话。
- `POST /api/context-engine/recovery/restore`仅管理员可用，要求`confirm=true`；覆盖前再次创建恢复前快照。
- 路径必须位于CCM数据目录，scope、scopeId、sessionId和recoveryId必须全部匹配。

## 验证

- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run build`：frontend、MCP、backend production build全部通过。
- `node scripts/context-engine-v2-selftest.mjs`：39项通过。
- `npm run test:memory -- --no-build`：12/12通过，其中CC压缩对齐51项通过。
- `npm run test:agents -- --no-build`：8/8通过。
- `npm run test:frontend -- --no-build`：21/21通过。
- `npm run docs:check`：1177条链接通过，0失败。
- 真实音乐单例恢复点创建并完成无写入演练，checksum和大小一致，canonical会话未修改。
- 第二模型复核使用mock；付费Provider调用为0。

## 边界

本轮不缓存模型最终答案，不在npm包内管理vLLM/SGLang进程，也不宣称兼容网关具备原生缓存能力。Provider不能证明缓存命中时继续使用CCM受控投影；即使关闭所有Provider缓存，正式摘要、MicroCompact、长期记忆和MCP hydration仍然可用。
