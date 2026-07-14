# 代码变更工作台生产化升级 v1

日期：2026-07-14

## 目标

代码变更页既要保留完整 Git 与逐行 Diff 技术能力，也要先让用户看懂本次改动的范围、风险、任务来源和验证状态。所有写操作必须在用户明确选择范围后执行，不能把未选择的暂存内容悄悄带入提交。

## 用户体验

- 顶部总览展示文件数、新增/删除行、暂存/工作区数量、冲突、影响目录和风险。
- 文件列表按冲突、暂存与工作区同时改动、已暂存、工作区、未跟踪分组，支持搜索与状态筛选。
- 统一 Diff 与左右 Diff 都保留行号、词级差异、搜索和 Hunk 操作。
- 支持仅看变更行、上一个/下一个 Hunk、复制文件路径和下载 Patch。
- 回滚文件或丢弃 Hunk 前显示具体文件与不可恢复风险，结果通过统一 Toast 返回。
- 提交前必须明确勾选文件，并查看提交预览、未选暂存文件、冲突、未跟踪/删除风险和验证状态。
- 手机端使用统一 Diff，文件列表和提交入口保持可达，不产生页面横向溢出。

## 提交安全语义

1. 页面没有“空选择等于提交全部”的隐式行为；用户必须选择文件。
2. `/api/git/commit-preview` 在提交前重新读取 Git 状态。
3. 所选文件存在冲突、消失或状态发生偏差时阻止提交。
4. 后端先对所选路径执行 `git add -A -- <files>`，再通过 `git commit --only ... -- <files>` 只提交选择范围。
5. 暂存区中未选择的文件会保留，不进入本次提交。
6. 用户需要如实选择“已运行相关验证”或“尚未运行验证”，并勾选范围核对确认。

## Git 接口加固

- 所有读取、回滚、提交和 Patch 路径统一通过项目根目录边界检查。
- 拒绝绝对路径、空路径、NUL 和 `..` 目录穿越。
- Patch 限制为 2 MB，并校验 `---` / `+++` 文件路径。
- Hunk 操作先执行 `git apply --check`，通过后才真正应用。
- 未跟踪文件不会被“回滚”接口直接删除，避免把新文件当成普通工作区修改丢弃。
- 提交信息限制为 300 个字符，历史数量限制在 1 到 100。
- 状态接口返回 staged/unstaged/conflict/untracked、文本统计、二进制、大文件、影响目录和风险汇总。

## 任务与 TestAgent 关联

状态接口读取任务记录、项目对话运行和 TestAgent 运行记录，返回三种归因等级：

- `exact`：任务交付文件记录与当前变更文件匹配，可以展示任务来源和对应验证。
- `project_recent`：只有项目维度的最近任务，页面明确标为“未确认归因”，不能当成本次变更来源或验收结果。
- `none`：没有可验证的 Agent 任务记录，说明可能来自人工或第三方工具。

精确任务提供“查看任务回放”入口，并把 `task_id`、`trace_id` 传给现有任务回放页。TestAgent 只有在精确任务关联成立时才显示为本次改动已验证。

## 代码组织

- `CodeChanges.vue`：页面数据和 Git 操作编排。
- `CodeChangeSummary.vue`：用户可理解的总览、来源和验收信息。
- `CodeChangeFileList.vue`：文件分组、搜索、筛选和范围选择。
- `CodeDiffViewer.vue`：统一/左右 Diff 与 Hunk 导航。
- `CodeCommitPanel.vue`：提交预检和安全确认。
- `CodeCommitHistoryDrawer.vue`：提交历史。
- `codeDiff.js`：受控复杂度的 Diff 展示算法；长行 Token 矩阵超过阈值时退化为整行高亮，避免页面卡死。

## 验证

```powershell
npm run test:code-changes
npm run test:code-changes:production
npm run test:code-changes:render
npm run build:frontend
```

验证覆盖：

- 状态解析、文本/二进制统计、目录穿越和恶意 Patch 拒绝。
- 真实 `cc-connect-test` Git 仓库状态、Diff、提交预览和安全拒绝接口。
- 桌面变更总览、精确任务/TestAgent、左右 Diff 和提交预览。
- 390 x 844 手机布局、统一 Diff 和页面溢出检查。

截图证据：

- `scratch/code-changes-render-regression/desktop-change-overview.png`
- `scratch/code-changes-render-regression/desktop-split-diff.png`
- `scratch/code-changes-render-regression/desktop-commit-preview.png`
- `scratch/code-changes-render-regression/mobile-change-workbench.png`
- `scratch/code-changes-render-regression/report.json`

## 已知外部阻塞

本轮前端构建和 Git 模块独立类型检查通过。整个后端 `tsc` 仍被并行任务中的以下既有类型错误阻塞，和代码变更工作台无关，本轮没有修改这些文件：

- `backend/modules/collaboration/group-memory-index.ts`
- `backend/modules/collaboration/group-session-memory-model-extraction.ts`

为保证当前运行服务加载新接口，本轮单独编译了 `backend/modules/tools/git.ts` 到现有分发目录并重启 `3082` 服务；没有创建 Git 提交。
