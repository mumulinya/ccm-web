# 统一会话回合控制 v1

日期：2026-07-14  
状态：已实现并完成整体验收

## 目标

让全局 Agent、群聊主 Agent、项目 Agent 和飞书会话在 Agent 正在工作时保持可交流，并采用一致、用户可理解的控制方式：

- `引导当前`：把补充要求交给当前工作链，在安全节点继续处理。
- `排队下一条`：不打断当前工作，当前回合结束后按顺序自动发送。
- `停止`：明确终止当前工作，不把普通新消息误当成停止命令。
- 空闲普通问话不显示控制条，不增加无关的任务感和技术信息。

## 用户链路

### Web 会话

全局 Agent、群聊主 Agent 和项目 Agent 共用同一套会话控件。Agent 忙碌时输入框仍可编辑，用户可以选择引导或排队；队列会展示位置、发送中、失败、取消和重试状态。当前工作自然完成后，下一条排队消息会自动领取并发送。

### 飞书会话

飞书支持以下显式命令：

- `引导：补充要求`
- `排队：后续要求`
- `停止`

工作进行中收到的普通消息默认排队，避免静默中断当前工作。空闲时的普通消息仍按普通问答处理。服务重启后，后台恢复调度器会继续处理尚未完成的飞书队列。

## 实现边界

- 持久化内核：`backend/agents/conversation-turn-control.ts`
- 共享前端控件：`frontend/src/components/common/ConversationTurnControls.vue`
- 前端队列状态：`frontend/src/composables/useConversationTurnControl.js`
- 输入框忙碌可编辑能力：`frontend/src/components/common/ChatComposer.vue`
- 接入页面：全局 Agent、群聊主 Agent、项目管理
- 飞书接入：控制机器人 ACP 与全局 Agent 飞书入口

持久化文件为 `~/.cc-connect/conversation-turn-control.json`，采用原子替换写入。记录包含作用域、会话标识、模式、状态、队列位置、重试次数和结果摘要。终态记录保留 14 天，总量限制为 800 条。

## 可靠性规则

- `request_id` 保证重复请求不会生成两条队列记录。
- 同一会话采用 FIFO 领取，位置由服务端统一计算。
- 重启时将遗留的 `sending` 恢复为 `queued`，防止消息永久卡住。
- 失败消息可重新排队，已排队消息可取消。
- 全局 Agent 引导使用既有安全节点；群聊主 Agent 延续原任务；项目 Agent 延续 `parent_run_id`。
- 停止操作会调用各执行链真实取消接口，而不是只在前端隐藏加载状态。
- 浏览器 `File` 无法跨重启可靠保存，因此忙碌时携带附件的排队请求会给出友好提示，要求当前任务结束后再发送。

## API

- `GET /api/conversation-turns`
- `POST /api/conversation-turns/enqueue`
- `POST /api/conversation-turns/claim`
- `POST /api/conversation-turns/settle`
- `POST /api/conversation-turns/cancel`
- `POST /api/conversation-turns/retry`
- `POST /api/conversation-turns/stop`
- `GET /api/conversation-turns/self-test`

## 自动化验收

专项源码与 API 回归：

```powershell
npm run test:conversation-turn-control
```

覆盖持久化内核、飞书命令解析、请求幂等、FIFO、位置计算、完成、取消、失败重试，以及三个 Web 入口的接入契约。

真实渲染截图回归：

```powershell
npm run test:conversation-turn-control:render
```

覆盖桌面与 390px 移动端，断言工作中可见引导、排队和停止；空闲普通对话不显示控制条；输入框可编辑；控件无横向溢出；取消、重试和模式切换事件有效。截图输出到 `scratch/conversation-turn-control-render/`。

## 验收结论

以下检查已全部通过：

- `npm run check`
- `npm run build`
- `node scripts/conversation-turn-control-selftest.mjs`
- `node scripts/conversation-turn-control-render-regression.mjs`
- 运行中 `/api/conversation-turns/self-test`
- 运行中真实 `enqueue -> claim -> settle -> list`，持久化终态为 `completed`
- 飞书通道 `healthy=true`、`endpoint_current=true`、`turn_stalled=false`
- 相关源码空白错误检查

截图证据：`scratch/conversation-turn-control-render/desktop-working-queue.png` 与 `scratch/conversation-turn-control-render/mobile-working-queue.png`。
