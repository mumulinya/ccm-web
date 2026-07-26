# 项目 Web 与飞书会话分组和绑定

Date: 2026-07-24

Status: Implemented

## 业务边界

项目管理页面中的会话按来源分为：

- `web`：用户在项目页面创建并使用的项目会话。
- `feishu`：由该项目 cc-connect 飞书通道创建或在项目页面显式创建的飞书会话。

两类会话仍使用项目现有的权威会话存储和项目记忆压缩，不创建第二套 transcript。`source` 只负责来源和路由隔离，不改变项目主 Agent、开发 Agent、TestAgent、任务回放和长期记忆流程。

## 来源识别

CCM 读取当前项目 cc-connect 会话文件中的：

- `active_session`：飞书目标当前绑定的精确项目会话。
- `user_sessions`：飞书目标历史使用过的项目会话。
- `user_meta`：真实群聊名称或用户名称。

只有当前项目文件中真实出现的 `feishu:*` 或 `lark:*` 平台键才成为可绑定目标。会话 ID 出现在该项目映射中时归为飞书会话；没有映射且没有显式 `source=feishu` 的会话归为 Web。系统不通过名称、消息文字或正则猜用户意图。

新建会话 ID 会同时扫描会话正文、当前活动绑定和历史飞书绑定，避免旧飞书会话暂时没有正文时被新 Web 会话复用。新格式会话的显式 `source` 优先于历史映射，保证用户创建的 Web 会话不会被陈旧引用错误归类。

## 绑定流程

```text
项目页面新建飞书会话
-> 保存 source=feishu 的项目会话
-> 读取当前项目已发现的飞书目标
-> 用户选择目标
-> 校验目标属于当前项目且会话来源为 feishu
-> 更新该项目 active_session
-> 后续飞书消息进入绑定的精确项目会话
```

解绑只清除当前活动绑定，历史会话关系仍用于来源核验。删除飞书会话会同时清理 `active_session` 和 `user_sessions` 中对该会话的引用。

Web 会话不能绑定飞书目标。项目 A 不能读取或绑定项目 B 的飞书目标。全局助手飞书绑定、群聊绑定和项目绑定彼此独立。

## 页面

- 项目会话栏分为“网页会话”和“飞书会话”。
- Web 会话显示“仅网页”。
- 飞书会话显示“未绑定飞书目标”或当前群聊/用户名称。
- 顶部提供新建网页会话、新建飞书会话和刷新按钮。
- 飞书会话提供绑定管理、重命名和删除操作。
- 移动端继续使用独立会话抽屉，不扩大项目聊天页面宽度。
- 移动端项目会话抽屉不再继承旧的 `160px` 列表限高，Web 与飞书分组使用抽屉完整高度并在列表内部滚动。
- 用户快速切换项目或会话时，异步响应必须同时匹配当前项目和当前会话，否则丢弃，避免旧页面数据覆盖新页面。

## 接口

- `GET /api/sessions/feishu-targets?project=<id>`
- `POST /api/sessions/feishu-bind`
- `POST /api/sessions/create` 增加兼容字段 `source=web|feishu`
- 项目会话列表和详情增加 `source`、`feishu_bindings`

绑定变化发布 `project.feishu_session_binding_changed`，只刷新精确项目的会话与目标。

## 验证

- `npm run check`
- `npm run build`
- `node scripts/project-feishu-session-binding-selftest.mjs`
- `npm run test:integrations -- --no-build`
- `npm run test:quick -- --no-build`
- `npm run docs:check`

专项回归通过 `18` 项，集成域通过 `8/8`，快速域通过 `16/16`。覆盖真实平台键解析、活动会话、历史飞书会话、未绑定 Web 会话、项目隔离、绑定门禁、删除清理、会话 ID 防碰撞、异步响应隔离、页面分组和运行事件。

真实浏览器验收覆盖桌面和 `390x844` 移动视口：桌面绑定弹窗能区分同群聊的不同话题，移动端抽屉完整展示 Web/飞书两组和操作入口，页面无横向溢出。验收创建的临时会话已删除，原有 `active_session`、`user_sessions` 和 `user_meta` 保持不变。付费 Provider 调用为 `0`。
