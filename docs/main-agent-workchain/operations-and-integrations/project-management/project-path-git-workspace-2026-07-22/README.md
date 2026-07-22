# 项目目录与 Git 办公工作台

## 完成范围

本次将项目创建时的目录选择和“代码协作”页的远端仓库操作补成一个连续工作流：

```text
新建/编辑项目
  -> 浏览本机目录
  -> 可在当前位置新建文件夹
  -> 选择为项目代码目录或 GitHub 克隆目标
  -> 项目进入代码协作页
  -> 查看工作区、暂存区、分支和远端同步状态
  -> 拉取远端引用 / 更新本地分支 / 推送本地提交
```

## 目录选择器

- 使用与 CCM 明暗主题一致的文件管理器布局，移除旧版硬编码暗色、Emoji 和终端风格装饰。
- 提供用户目录、系统磁盘、地址栏、上级目录、刷新、文件夹优先列表和空目录状态。
- 支持在当前目录新建一个文件夹，创建成功后自动进入新目录，用户可以立即将它设为项目路径。
- 创建本地项目和 GitHub 克隆项目共用同一选择器；GitHub 克隆仍要求目标不存在或为空。
- 文件夹名称拒绝路径分隔符、控制字符、Windows 保留名、尾随点/空格、跨目录写入和重复名称。
- 文件系统创建 API 不接受空的父目录，不会回退到服务进程目录创建文件夹。

## Git 远端工作流

代码协作页新增独立远端同步栏，展示：

- 当前分支和 upstream；
- `origin` 是否存在；
- 本地领先、远端领先和未提交文件数；
- 拉取远端、更新本地和推送提交三个操作。

三个操作的准确语义：

| 页面操作 | Git 行为 | 文件影响 |
| --- | --- | --- |
| 拉取远端 | `git fetch --prune origin` | 只更新远端引用，不修改工作区 |
| 更新本地 | `git pull --ff-only` | 只允许快进更新，不产生自动 merge commit |
| 推送提交 | `git push`；无 upstream 时使用 `--set-upstream origin <branch>` | 推送已提交内容，不自动提交工作区文件 |

## 安全门禁

- Git 命令全部通过参数数组执行，不通过 shell 拼接。
- 禁用交互式凭据提示，避免服务请求无限等待；凭据继续使用用户本机 Git 配置。
- 更新本地和推送必须由用户在页面明确确认。
- 工作区存在未提交文件时阻止更新本地；冲突由现有状态栏继续显示和阻断提交。
- 缺少 `origin`、处于 detached HEAD、操作不在 allowlist 或未确认时 fail closed。
- 更新本地固定使用 `--ff-only`，不会静默创建合并提交，也不提供 force push。
- 返回浏览器的远端 URL 和 Git 错误会清除 URL 中的账号、Token 或密码。

## 响应式体验

- 桌面端将远端状态和操作组织成独立的横向工作栏，不挤占 Diff 工具。
- 移动端远端操作为三等分按钮，并验证三个按钮均在 `390px` 视口内可见、互不重叠。
- 目录选择器在桌面使用侧栏和主目录区，移动端切换为全屏并将快捷位置改为横向列表。

## 验证

- `npm run test:project-path-git-workspace`：本地裸仓库端到端通过，覆盖目录创建、非法名称、真实 ahead/behind、fetch、fast-forward pull、push 和脏工作区阻断。
- `npm run test:project-github-management`：`21` 项通过，付费调用和网络 Git 操作为 `0`。
- `npm run test:project-management`：`6` 条生产生命周期检查通过。
- `npm run test:code-changes`：`20` 项代码变更工作链检查通过。
- `scripts/project-management-render-regression.mjs`：桌面/移动端 `10` 项通过，包含目录选择器创建流程截图。
- `scripts/code-changes-render-regression.mjs`：桌面/移动端 `4` 项通过，包含远端工作栏和三按钮边界检查。
- frontend、backend 和飞书 MCP production build 通过。

所有 Git 远端测试均使用本机临时裸仓库，没有连接 GitHub、没有读取用户凭据、付费 Provider 调用为 `0`。
