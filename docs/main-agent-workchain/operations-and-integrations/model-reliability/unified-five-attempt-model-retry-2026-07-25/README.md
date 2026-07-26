# 统一模型五次尝试与快速失败

## 目标

网页会话与飞书会话不再各自维护模型失败策略。全局 Agent、群聊主 Agent、项目主 Agent、音乐 Agent、TestAgent 规划和会话压缩统一经过共享模型调用层。

## 运行规则

- 一次用户请求最多执行 5 次模型尝试，包含首次请求。
- 单次模型尝试最长 30 秒，完整重试预算最长 180 秒。
- 重试间隔为 500ms、1s、2s、4s。
- HTTP 408、409、425、429、5xx，网络断开、DNS 临时失败、连接拒绝、连接重置、超时、Provider overload/unavailable、空响应和模型无效 JSON 可以重试。
- HTTP 400、401、403、404、405、410、413、415、422，以及缺少 API URL、Key、模型、上下文超过安全上限和用户主动取消立即失败。
- 最终错误包含实际尝试次数、总耗时和脱敏后的最后错误。

`backend/system/model-call-retry.ts` 是唯一重试策略实现。OpenAI-compatible 与 Anthropic-compatible 文本/JSON 客户端在此基础上执行。JSON 解析失败会重新调用模型，但失败轮次的 usage 不会提交到会话计量。

群聊会话压缩原先使用独立 `fetch`，现在同样接入共享五次策略。压缩外部取消和活动回调失败不会重试，避免取消操作被重新启动。

## 飞书边界

全局飞书 ACP 请求等待上限为 190 秒，cc-connect 生成配置使用：

```toml
idle_timeout_mins = 4
max_turn_time_mins = 5
reset_on_idle_mins = 30
```

这个窗口能够容纳五次模型尝试，同时仍会在几分钟内结束异常回合。项目飞书的开发任务允许更长的任务运行时间，但其主 Agent 模型调用仍使用相同的五次和 180 秒边界。

## 验证

`scripts/unified-model-retry-selftest.mjs` 全部使用 mock Provider，验证：

- 前四次 HTTP 503、第五次成功。
- HTTP 401 只请求一次。
- 空响应和无效 JSON 第五次恢复。
- 连续网络拒绝与持续 503 精确执行五次并报告尝试次数。
- 会话压缩使用相同的五次策略。
- 全局、群聊、项目和音乐入口依赖同一共享客户端。

真实付费 Provider 调用为 0。
