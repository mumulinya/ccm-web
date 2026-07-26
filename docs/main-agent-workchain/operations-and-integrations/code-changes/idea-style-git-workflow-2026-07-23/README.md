# IDEA 风格 Git 提交与同步工作流

日期：2026-07-23

## 问题

旧页面虽然分别存在 Commit、Fetch、Pull 和 Push 能力，但中文命名把“获取远端”和“拉取代码”混在一起，提交弹窗也只有本地提交，没有 IDEA 常用的“提交并推送”。用户无法在一次确认中完成所选文件的 Commit + Push，远端失败反馈也偏底层。

## 当前操作

| 页面操作 | Git 命令 | 结果 |
| --- | --- | --- |
| 获取远端 | `git fetch --prune origin` | 更新远端引用，不修改本地文件 |
| 拉取代码 | `git pull --ff-only` | 快进更新当前本地分支，不自动创建 merge commit |
| 提交代码 | `git add -A -- <files>` + `git commit --only ... -- <files>` | 只创建本地 Commit |
| 推送代码 | `git push`，首次使用 `--set-upstream origin <branch>` | 只推送已经存在的本地 Commit |
| 提交并推送 | 先执行所选文件提交，再执行推送 | 分别返回 Commit 与 Push 结果 |

## 提交并推送状态

- Commit 和 Push 都成功：返回 `committed_and_pushed`。
- Commit 成功但 Push 失败：返回 `committed_push_failed`，本地 Commit 保留，页面提示用户修复远端问题后单独点击“推送代码”。
- 缺少 origin 或处于 detached HEAD：提交前阻断，不创建半成品事务。
- 空文件列表不再隐式提交整个工作区；只有受控的 `/commit` 或主 Agent 高风险路径显式传入 `allFiles + confirmed` 时才允许全量提交。

## 错误反馈

后端把常见 Git 错误归类为稳定错误码：

- `authentication_required`：HTTPS 凭据或 SSH Key 未配置。
- `repository_unavailable`：仓库不存在或无访问权限。
- `remote_ahead`：远端包含本地没有的提交，Push 被拒绝。
- `upstream_missing`：当前分支未关联远端分支。
- `remote_timeout`：服务器网络、代理或远端连接超时。

错误内容继续清除远端 URL 中的账号、Token 和密码，并附带可执行的下一步建议。

## 页面

- 顶部提交入口改为“提交代码”。
- 远端栏统一为“获取远端 / 拉取代码 / 推送代码”。
- 提交弹窗同时提供“提交代码”和“提交并推送”。
- 弹窗显示实际推送目标，例如 `origin/feature/code-workbench`。
- 未配置 origin 时仍可本地提交，但“提交并推送”不可用。

## 验证

- `npm run check`：通过。
- frontend、backend production build：通过。
- `node scripts/project-path-git-workspace-selftest.mjs`：12 项真实本地裸仓库测试通过。
- `node scripts/agent-code-change-visualization-selftest.mjs`：代码工作台、安全边界与三态结果检查通过。
- `node scripts/code-changes-render-regression.mjs`：桌面与 390px 移动端 6 项通过。
- Git 测试只使用临时本地裸仓库，没有连接用户 GitHub，没有付费 Provider 调用。

## 视觉证据

- [桌面代码协作](evidence/desktop-git-workbench.png)
- [提交与提交并推送](evidence/desktop-commit-actions.png)
- [移动端代码协作](evidence/mobile-git-workbench.png)
