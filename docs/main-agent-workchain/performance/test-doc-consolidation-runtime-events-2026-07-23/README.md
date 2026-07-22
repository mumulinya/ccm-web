# 测试与文档收口、统一运行时事件通道

## 目标

本次升级完成优化项 4 和 5：收拢测试及文档入口，并用统一轻量 SSE 替代任务、权限、Agent 状态和飞书投递中的高频轮询。

## 运行时事件数据流

```text
任务 / 权限 / Agent / 飞书状态变化
  -> backend/system/runtime-events.ts
  -> GET /api/runtime/events
  -> frontend/src/utils/runtimeEventBus.js 单例连接
  -> 订阅页面执行防抖、定向 GET 刷新
  -> 断线或无事件时 60 秒兜底刷新
```

服务端保留最近 200 条事件，支持 topic 过滤和 `Last-Event-ID` 重放，每 15 秒发送 heartbeat。公开 payload 使用字段白名单，不发送聊天正文、附件、transcript、凭据或密钥。

已接入的发布方：

- 任务保存和状态变更。
- 权限请求创建、决定和消费。
- Agent 开始、完成和取消请求。
- 飞书入站和消息投递状态。

已接入的消费者：

- 会话权限审批卡片。
- 任务中心及任务状态。
- 工作台实时状态。
- 旧 `/api/usability/workbench/stream` 保持兼容，但改为事件触发重建，不再每 5 秒计算完整快照。

## 测试收口

- `package.json` 只保留 14 个稳定测试入口。
- 当前 197 个专项 selftest 文件继续保留；目录自检要求库存不得低于收口前的 191 个。
- 213 个旧 npm 测试命令迁移至 `scripts/legacy-test-aliases.json`，通过 `npm run test:legacy -- <旧命令>` 执行。
- `scripts/test-domains.json` 管理 9 个业务领域和快速套件。
- 构建按领域只运行一次，测试结果写入 `scratch/domain-test-report.json`。
- `domain-test-catalog-selftest.mjs` 防止入口膨胀、文件丢失或领域重复登记。

## 文档收口

- `docs/CURRENT.md` 记录当前产品事实。
- `docs/TESTING.md` 记录稳定测试入口和旧命令兼容。
- `docs/archive/README.md` 提供历史记录逻辑归档。
- 历史文件不批量移动或删除，现有链接和验收证据保持有效。

## 失败与降级

- SSE 断开时浏览器自动重连，页面保留 60 秒低频兜底，不回到 4 至 5 秒轮询。
- 事件仅作为刷新提示，最终 UI 数据仍由原有鉴权 GET API 返回。
- 旧工作台 SSE URL 暂时保留，避免外部客户端升级时中断。
- 领域测试任一文件缺失或失败时，runner 返回非零状态并在报告中列出失败项。

## 验证证据

- `runtime-event-bus-selftest.mjs`：topic、字段白名单、内部监听、浏览器单例、权限刷新、兜底与旧流兼容共 7 项。
- `test:quick`：认证、记忆、权限、MCP、飞书、事件通道、工作台、知识库和音乐播放回归。
- `npm run check`、`npm run build`：类型检查及 backend/frontend/MCP 生产构建。
- 测试 Provider 均为 mock，付费调用为 0。
