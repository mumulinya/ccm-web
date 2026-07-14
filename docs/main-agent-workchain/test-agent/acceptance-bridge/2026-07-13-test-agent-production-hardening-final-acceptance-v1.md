# TestAgent 生产运行加固最终验收 v1

## 目标结论

本目标已完成实现和最终回归。主 Agent 与 TestAgent 的生产责任链固定为：

`全局 Agent -> 群聊主 Agent -> 项目子 Agent -> 群聊主 Agent 验收 -> TestAgent -> 返工/复验/总结 -> 全局 Agent 转发`

全局 Agent 不直接调用 TestAgent。全局 Agent 只负责跨项目分派、状态聚合和最终结果转发；群聊主 Agent 继续拥有计划、项目子 Agent 调度、验收、TestAgent 工作单、返工与最终总结的所有权。

## 已完成能力

### 异步生产 Runner

- TestAgent 从阻塞式调用改为异步、可取消、可恢复的持久化运行。
- 运行记录支持幂等复用、后端重启恢复、运行状态查询和任务级清除。
- 运行绑定源码指纹；源码漂移后旧证据不能直接复用。
- 缓存证据再次校验文件存在性、大小和 SHA-256，篡改后拒绝验收。
- Windows 取消会终止进程树；运行中永久清除使用 tombstone，防止异步 close 回调重新写回已删除记录。

### 契约与完成门禁

- CLI 统一输出 `ccm-test-agent-invocation-result-v1`。
- 群聊主 Agent 强制校验 `status`、`outputValidation`、`artifactVerification`、`verdict` 和 `canAccept`。
- TestAgent 失败、证据缺失、证据矛盾、覆盖不完整或产物校验失败时，任务不能宣告完成。
- 群聊主 Agent 在 TestAgent 通过后执行完成前抽查；抽查不匹配会进入重新复验。
- 仅有 `acceptance_gate_passed: true` 的口头标记不能关闭会话，必须存在实际校验、独立复核或执行证据。
- 全局父任务和群聊代码子任务默认持久化 `requires_independent_review=true`。

### 安全边界

- 命令使用结构化分词和危险命令拦截，不把描述性验证文字直接当 Shell 执行。
- 子进程环境隔离模型和服务密钥；日志、报告和错误输出执行敏感值脱敏。
- 工作目录必须落在授权项目根目录；生产写操作需要明确授权。
- HTTP 验证逐跳检查重定向地址，禁止跳往回环、私网、链路本地和云元数据地址。
- Playwright 通过 CDP `Fetch.requestPaused` 在请求发出前拦截主文档重定向和敏感子资源地址。
- 证据按 TTL、容量和任务维度清理，避免长期无限增长。

### 用户展示

- 普通问话保持普通文本，不展示 Todo、交付卡、处理总结或内部协议。
- 真实任务展示计划和实时状态；协调阶段文案不会误生成用户 Todo。
- 技术详情默认折叠，原始命令、路径、Trace、协议和证据清单留在技术详情。
- 用户主文本保留换行，展示友好的完成内容、验证结论、风险和下一步。
- 子 Agent 摘要可展开，普通全局回复和普通群聊回复均保持安静展示。

## 真实链与故障注入

### 群聊正常链

- 群聊主 Agent 创建计划并派发真实第三方写代码 Agent。
- 项目子 Agent 完成修改并返回回执。
- TestAgent 独立复核通过。
- 群聊主 Agent 完成前抽查和用户总结均持久化，任务最终为 `done`。

### 全局返工链

- 全局 Agent 将任务分派给群聊主 Agent，没有直接调用 TestAgent。
- 首次 TestAgent 失败触发实现返工。
- 返工复用原 Claude Code native session，避免丢失实现上下文。
- 同一失败轮次只生成一次返工消息；重复请求复用原运行。
- 修复后 TestAgent 复验和群聊主 Agent 抽查均通过，最终状态为 `done`。

最终故障注入结果：

```json
{
  "pass": true,
  "surface": "global",
  "status": "done",
  "externalAgent": "claudecode",
  "injectedTestAgentFailureRepaired": true,
  "sameNativeSessionReused": true,
  "duplicateReworkFollowupsSuppressed": true
}
```

## 最终回归

- `npm run check`：通过。
- `npm run build`：前端、飞书 MCP、后端全部通过。
- TestAgent 生产加固专项：21/21 通过。
- TestAgent 所有权守卫：10/10 通过。
- TestAgent invocation、CLI、工作单、handoff、artifact、命令规划隔离矩阵：9/9 通过。
- `npm run test:post-review-spot-check`：通过。
- `npm run test:coordinator`：通过。
- UI 静态守卫：通过。
- Runtime E2E：通过，覆盖普通问话无 Todo、无交付卡、换行保留和主文本无协议泄漏。
- Playwright 真实渲染回归：38/38 通过，关键折叠和展开截图已人工检查。
- 真实群聊正常链：通过。
- 真实全局失败、返工、复验链：通过。
- `git diff --check`：通过，仅有工作区既有 LF/CRLF 提示。

## 验收中补充修复

- 更新 `ccm-package/scripts/coordinator-smoke.js` 的 23 组旧构建路径，使回归入口适配后端按业务目录拆分后的产物位置。
- 等待已经异步化的 ToolManager 自测，避免 Promise 被误当成同步结果。
- 更新生命周期成功样本为带实质证据的验收，并增加“只有通过布尔值不能终止任务”的回归断言。

## 运行边界

- 第三方写代码 Agent、浏览器和外部模型仍依赖本机有效配置、登录状态及网络；不可用时主 Agent 会保守报告阻塞，不伪造完成。
- 私网或特殊重定向目标默认会被安全策略阻止，需要在明确可信的项目配置中授权。
- 证据受保留期限和容量约束；过期运行需要重新执行验证，不能永久复用历史结论。
- 工作区存在用户和并行 Agent 的大量修改，本轮没有清理、回退或创建 Git commit。

