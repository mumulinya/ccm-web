# 项目文件夹与工作空间选择器

## 目标

当 CCM 管理大量项目时，项目选择不再使用一维原生下拉框。用户可以用文件夹组织多个项目，同时保留项目内部 ID、源码目录、会话、任务、记忆、飞书绑定和运行配置。

## 交互

- 搜索同时匹配项目显示名称和内部 ID。
- 文件夹可折叠展开，折叠状态保存在当前浏览器。
- 支持创建、重命名和删除文件夹。
- “整理项目”模式允许把每个项目移动到任意文件夹或“未分组”。
- 项目行展示开发 Agent与连接状态，点击后继续使用原有项目选择流程。
- 删除文件夹只清除归类关系，其中的项目回到“未分组”，不会归档或删除项目。

## 存储与边界

文件夹状态独立保存在 `~/.cc-connect/project-folders.json`：

- `folders` 保存稳定文件夹 ID、名称与顺序。
- `assignments` 只保存项目内部 ID到文件夹 ID的映射。
- 已归档或不存在项目的陈旧映射不会展示。
- 文件夹变化发布 `project.folder.changed`，已打开页面通过统一 Runtime SSE刷新。

该文件是用户本地界面数据，不进入 Git，也不成为 Agent上下文或长期记忆。

## 验证

- `node scripts/project-folder-selector-selftest.mjs`
- `npm run check`
- `npm run build:frontend`
- `npm run build:backend`
- `npm run docs:check`

测试不调用付费 Provider。
