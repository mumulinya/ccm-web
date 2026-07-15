# Agent 代码变更可视化 15.0

## 目标

让群聊主 Agent、项目 Agent、全局 Agent 的代码改动展示更接近 Codex / Cursor 的体验：用户不需要读内部协议和执行日志，也能直接知道“改了哪些文件、每个文件怎么改、当前完整文件内容是什么”。

## 本轮实现

### 统一代码改动抽屉

新增 `frontend/src/components/AgentCodeChangeDrawer.vue`，作为三类聊天入口的统一代码改动查看器。

能力：

- 展示本轮修改文件列表。
- 显示文件状态、增删行数。
- 支持单栏 unified diff。
- 支持左右 split diff。
- 支持按关键字搜索 diff / 文件内容。
- 支持读取当前完整文件内容。
- 大文件、二进制文件、缺少项目上下文时显示明确提示。

### 三个聊天入口已接入

- 群聊：`GroupChat.vue`
  - 任务卡点击“查看改动”时，优先打开代码改动抽屉。
  - 如果老任务没有 `fileChanges`，才回退到协作流 Pipeline。
  - 子 Agent 消息里的单文件按钮也进入同一个抽屉。

- 项目会话：`ProjectManager.vue`
  - 项目任务卡“查看改动”打开整轮代码改动。
  - 单文件变更按钮打开同一个抽屉并定位到该文件。

- 全局 Agent：`GlobalAgent.vue`
  - 全局任务卡“查看改动”不再直接跳页面，而是先打开代码改动抽屉。
  - 如果能推断出唯一项目，就支持继续拉取 diff 和完整文件。
  - 如果是跨项目且缺少明确项目上下文，则展示文件清单并提示无法读取项目 diff。

### 后端完整文件预览接口

新增：

```text
GET /api/git/file?project=<项目名>&file=<相对路径>
```

安全策略：

- 只允许项目内相对路径。
- 拒绝绝对路径。
- 拒绝 `..` 路径逃逸。
- 解析后的路径必须仍在项目工作目录内。
- 二进制文件不返回文本内容。
- 大文件按现有快照上限截断。

### 跨项目文件定位

补充约定：全局任务和跨项目任务的文件变更应尽量保留结构化对象，而不是只保留字符串路径。

推荐结构：

```json
{
  "project": "web",
  "path": "src/App.vue",
  "status": "修改",
  "additions": 2,
  "deletions": 1
}
```

当前实现已经支持：

- 全局父任务 `delivery_summary.actual_file_changes` 聚合子任务的结构化文件项。
- 全局任务卡保留 `{ project, path }`，不会再压成纯字符串。
- 代码改动抽屉按单个文件自己的 `project` 拉取 `/api/git/diff` 和 `/api/git/file`。
- 同名路径不会串文件，例如 `web/src/App.vue` 和 `admin/src/App.vue` 会作为两个不同文件处理。

## 用户体验约定

普通用户默认看到：

1. 任务卡总结。
2. “查看改动”按钮。
3. 代码改动抽屉。
4. 文件列表 + diff + 完整文件。

技术细节仍折叠在任务卡里，不作为主要阅读路径。

## 验证命令

```bash
npm run test:code-changes
npm run check
npm run build:backend
npm --prefix frontend run build
```

## 后续可增强

- 抽屉左侧可以进一步增加项目分组标题，让跨项目大任务更像 Cursor 的 Changes 面板。
- 支持按 Agent / 子任务过滤文件。
- 支持每个 hunk 的“接受 / 撤销”。
- 抽屉内增加“复制 diff”和“复制文件路径”。
- 真实浏览器 E2E 验证三类聊天入口的打开、切换、搜索、完整文件预览。
