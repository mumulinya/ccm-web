# 项目会话普通问答安静展示 v1

## 问题

项目管理会话此前会把所有消息都包装成项目执行任务。用户发送“你是什么模型”这类普通问话时，也会看到“项目 Agent 正在处理”“项目执行任务”“正在修改”和完整任务卡，与群聊主 Agent 的普通问答体验不一致。

## 本次实现

- 后端新增项目会话意图判定，区分 `conversation`、`project_analysis` 和 `task`。
- 普通问答与只读项目询问继续交给当前项目配置的第三方 Agent 回答，但使用只读会话简报，明确禁止修改文件、创建 Todo 或输出内部执行协议。
- SSE 在输出前发送 `presentation` 事件。只有明确修改、运行、测试、部署或交付请求才进入 `task` 展示模式。
- 项目页普通问答只显示“正在回复”占位和最终回答，不展示任务卡、执行事件或技术详情。
- 明确任务保持原有实时任务卡、改动明细、验证结果和技术详情。
- 旧会话兼容：历史上被误包装成任务的普通问答会根据原始请求重新过滤，刷新后不再显示任务卡。
- 安全兜底：如果普通问答实际产生文件改动，仍会展示任务卡，避免把意外修改隐藏起来。

## 验证

- `npx tsc -p backend/tsconfig.json --noEmit`：通过。
- `npm run build`（frontend）：通过。
- `node scripts/project-chat-presentation-selftest.mjs`：通过。
- `node scripts/project-management-render-regression.mjs`：通过。

Playwright 真实交互覆盖：

1. 发送“你是什么模型”，只显示友好回答，不出现任务卡或内部“正在修改”。
2. 发送“修改登录页并运行测试”，正常显示项目执行任务卡、文件改动和验证结果。
3. 技术详情默认折叠。
4. 桌面与手机项目页面无横向溢出，会话抽屉可用。

## 截图证据

- `scratch/project-management-render-regression/desktop-ordinary-conversation.png`
- `scratch/project-management-render-regression/desktop-explicit-task.png`
- `scratch/project-management-render-regression/mobile-project-workspace.png`
- `scratch/project-management-render-regression/mobile-session-drawer.png`

完整断言结果见 `scratch/project-management-render-regression/report.json`。
