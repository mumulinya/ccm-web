# 宠物生成 Provider 524 流式修复

## 现象

修复 CCM 本地 120 秒超时后，宠物任务不再被本地 AbortController 提前取消，但 Provider 最终返回 Cloudflare `HTTP 524` HTML 页面。任务在第一版候选返回前失败，目录中只有 `reference.jpg`，没有 SVG。

## 根因

当前 Provider 为 `api.ciyuan.fast`，模型为 `gpt-5.6-sol`，全局推理强度为 `high`。旧宠物调用采用非流式 Chat Completions：代理必须等待完整的结构化 JSON 和 SVG 输出完成后才把响应交给 CCM。长时间没有响应数据时，上游 Cloudflare 代理先终止连接并返回 524。

之前能够生成 SVG，是因为旧请求在代理等待上限前完成；这不能保证更长的 Skill、身份约束和高推理请求仍能在同一时间内完成。

## 修复

- OpenAI-compatible LLM 客户端支持 `stream: true`，能够重组 SSE `delta.content` 为原始完整文本。
- 宠物 SVG 请求改为流式响应，让代理在生成过程中持续传输数据，不再等待完整 SVG 后一次性返回。
- 宠物生成和视觉复审单独使用 `medium` 推理强度，避免继承全局 `high` 导致不必要的超长首 token 等待。
- 该覆盖仅属于宠物调用；普通全局 Agent 对话继续使用用户配置的 `high`。
- HTTP 524 的 Cloudflare HTML 不再直接显示到页面，统一为简洁中文错误。
- 不对 524 自动重试，避免上游可能仍在计算时重复产生费用。

## 验证

- SSE 多段 `delta.content` 能重组为完整 SVG 文本。
- 宠物调用源码门禁确认启用 streaming 和 medium reasoning。
- 后端 production build 与全仓 TypeScript check：通过。
- SVG 宠物 mock self-test：通过。
- 测试 Provider 调用为 `0`。

现有 524 失败记录不会自动再次执行。服务加载新版本后，由用户主动点击重试。
