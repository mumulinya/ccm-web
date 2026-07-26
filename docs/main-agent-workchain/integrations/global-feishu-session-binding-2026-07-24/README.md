# 全局助手飞书会话分组与绑定

Date: 2026-07-24

Status: Implemented

## 目标

全局助手的网页会话和飞书会话在同一份权威历史中按 `source` 隔离展示。用户可以在 Web 页面创建飞书会话，将已发现的飞书群聊或私聊目标绑定到该会话，并清楚看到当前绑定状态。

## 会话边界

- Web 会话使用 `source=web`，只由 Web 历史同步接口更新。
- 飞书会话使用 `source=feishu`，由飞书入站链或飞书会话管理接口创建和保存。
- Web 历史 POST 会先过滤非 Web 会话，不能覆盖、重命名或删除飞书会话。
- “清空网页会话”仅重建默认 Web 会话，保留所有飞书会话及绑定。
- 原始 transcript 仍保存在全局历史文件中，不额外创建第二套会话数据库。

## 绑定流程

```text
飞书消息到达
-> 记录 chat_id/open_id 与平台会话 binding
-> 如果 binding 有 active_session_id，使用该精确飞书会话
-> 否则使用 chat_id + open_id 派生的独立 feishu:* 会话
-> 用户消息和 Agent 回复写入同一会话
```

Web 页面支持：

1. 点击飞书图标创建 `feishu:manual:*` 会话。
2. 从已发现的飞书目标中选择一个目标。
3. 后端校验目标存在，并校验目标会话的 `source=feishu`。
4. 写入 `active_session_id`，后续该目标的消息进入绑定会话。
5. 解除绑定后，下一条飞书消息重新回到该目标的自动独立会话。

删除飞书会话时，所有指向它的目标绑定会同步解除。网页会话不能绑定飞书目标，Web 来源回复不会自动发送到飞书。

## 接口

- `GET /api/global-agent/feishu-sessions`：读取飞书会话及目标绑定。
- `POST /api/global-agent/feishu-sessions/create`：创建服务端飞书会话，可选立即绑定目标。
- `POST /api/global-agent/feishu-sessions/bind`：绑定或解除精确飞书目标。
- `POST /api/global-agent/feishu-sessions/delete`：删除飞书会话并解除相关绑定。

绑定变化通过统一 Runtime SSE 发布 `feishu.session_binding_changed`，前端只刷新飞书会话与绑定快照。

## 页面

- 会话栏分成“网页会话”和“飞书会话”两个区段。
- 每条会话显示来源图标；飞书会话额外显示“未绑定”或目标名称与绑定数量。
- 绑定弹窗显示已发现目标、当前绑定和被其他飞书会话占用的状态。
- 没有目标时明确提示先在飞书向机器人发送一条消息，不伪造聊天目标。
- 桌面和移动端使用相同数据与交互，弹窗在移动端改为底部自适应布局。

## 验证

- `npm run check`
- `npm run build:frontend`
- `npm run build:backend`
- `node scripts/global-feishu-session-binding-selftest.mjs`

自测覆盖飞书会话创建、Web 同步隔离、删除、绑定路由、前端来源分组和绑定/解绑入口；付费 Provider 调用为 `0`。

页面已在桌面视口和 `390×844` 移动视口检查。移动端会话栏以独立抽屉展示，绑定弹窗自适应底部布局；检查期间控制台错误为 `0`。创建、绑定、解绑和删除均通过真实本地 API 验证，临时验证会话已清理。
