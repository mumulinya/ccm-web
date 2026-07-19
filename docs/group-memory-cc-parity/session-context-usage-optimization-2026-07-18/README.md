# 会话上下文用量五项优化

## 完成范围

本轮在全局 Agent、群聊主 Agent、项目 Agent 已有常驻上下文读数上完成五项收口，不改变记忆压缩摘要、边界或 transcript。

### 移动端详情

- 点击 Gauge 读数可展开或关闭 Token 明细。
- 点击组件外关闭，`Esc` 关闭。
- 保留桌面 hover/focus 行为。
- `aria-expanded` 暴露展开状态。
- 全局会话侧栏在进入手机断点或选择会话后自动收起，避免遮挡 composer 点击。

### 真实压缩状态

- 群聊读取既有精确会话 `group-compaction-activity` ledger。
- 全局读取 `globalModelCompactions` 中当前精确会话的真实 Promise。
- 项目读取 `compactions` 中当前精确项目会话的真实 Promise。
- Memory Center scope summary 增加 `compacting` 与 `compactionActivity`。
- 普通消息发送不会被标记为正在压缩。

### 隐藏页面轮询

- 全局、群聊、项目都由 `App.currentTab` 控制 `active`。
- 隐藏标签调用 refresh 时会在发起网络请求前退出。
- 活跃 Agent 请求期间临时每 2 秒读取一次真实 activity；请求结束恢复 15 秒低频校准。

### 事件驱动刷新

- 手动 `/compact` 开始和结束按精确 scope/session 发出事件。
- 群聊、项目和全局 SSE 完成、Provider usage 更新后立即刷新。
- 事件只匹配同一 `scope + scopeId`，兄弟会话不受影响。

### 来源与时间

- tooltip 显示 Provider 实测、完整上下文采样、模型可见 payload 估算或压缩后门禁记录等计量来源。
- tooltip 显示 `tokenUpdatedAt`；没有可信时间时明确显示“尚未记录”。

## 验证

- `npm run check`：backend 与 MCP TypeScript 检查通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过。
- `npm run test:session-context-usage-ui`：20/20。
- `node scripts/memory-center-live-token-display-selftest.mjs`：23/23。
- `npm run test:session-context-usage-ui:browser`：桌面和手机三 scope 检查，无按钮重叠、无横向溢出、无页面异常。
- 服务重启后的真实全局 `auto_model` 事务由 API 返回 `compacting=true/status=running`，验证 activity 不是前端模拟。
- 本轮测试没有主动发送消息、执行 `/compact` 或调用付费 Provider。
