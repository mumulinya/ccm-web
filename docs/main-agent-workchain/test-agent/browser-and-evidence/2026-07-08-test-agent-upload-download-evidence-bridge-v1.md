# TestAgent Upload/Download Evidence Bridge V1

日期：2026-07-08

## 背景

TestAgent 最新文档已经支持真实浏览器里的文件上传、下载和多文件上传验证。主 Agent 之前已经能展示“浏览器交互”和“浏览器网络”摘要，但上传/下载这类用户更容易理解的验收证据还没有被单独翻译出来。

## 本次升级

- 群聊主 Agent 的 TestAgent receipt 连接层新增上传证据摘要：
  - “文件上传：已验证 2 个上传文件（notes.txt、meta.json）”
- 群聊主 Agent 的 TestAgent receipt 连接层新增下载证据摘要：
  - “文件下载：已验证 1 个下载文件（tasks.csv）”
- 摘要只来自 TestAgent 已产出的浏览器步骤和下载 artifact，不修改 `backend/test-agent` 业务逻辑。
- 用户主视图只显示文件名和复核结论，不展示本地 artifact 路径、下载保存目录、report/verdict JSON 路径。
- TestAgent 计划摘要里的 `download` / `upload_file` artifact 类型会显示成“文件下载证据 / 文件上传证据”。
- 群聊任务卡和全局流式任务卡都会渲染上传/下载证据。

## 边界

- TestAgent 继续负责 work order、真实 Playwright 执行、上传/下载校验、report、verdict 和 artifact。
- 主 Agent 只负责消费 TestAgent 产物，并把它翻译成用户能看懂的验收证据。
- 技术路径和原始 artifact 元数据仍只进入技术详情。

## 验证

- 后端自测覆盖上传/下载摘要进入 TestAgent receipt 和可见输出，并断言不泄露 `browser-artifacts` / 本地路径。
- 静态自测覆盖上传/下载桥接函数、中文 artifact 标签和渲染断言。
- Playwright 渲染回归覆盖：
  - 群聊任务卡显示文件上传/文件下载证据。
  - 全局流式任务卡显示文件上传/文件下载证据。
  - TestAgent 计划卡显示“文件下载证据 / 文件上传证据”。
  - 用户主视图不显示 `browser-artifacts` 等技术路径。
