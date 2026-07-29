# 项目代码工作区与 Git 协作

## 项目与仓库

- 项目创建或编辑时可以绑定本地目录、GitHub仓库和分支；项目内部 ID 与显示名称分离。
- 支持克隆仓库、初始化 Git、配置 `origin` 和读取远端状态。
- 项目分组只影响选择和展示，不改变项目 ID、目录、会话、任务或记忆作用域。

## 代码协作页面

1. 读取 Git porcelain 状态、暂存区、工作区、未跟踪文件和真实增删行统计。
2. `.gitignore` 排除且从未跟踪的文件不出现在可提交列表；已被 Git 跟踪的历史文件仍按 Git 规则展示。
3. 文件树按目录聚合，支持完整文件、diff、二进制/大文件状态和提交历史。
4. 提交前执行所选文件预检，冲突、索引残留或选择不完整时阻止提交。
5. 支持本地提交、提交并推送、Fetch、Pull、Push和提交历史。

## 部分成功与回滚

- “提交并推送”先创建本地提交；推送失败时返回 `partialSuccess` 和本地 commit hash，不能谎报全部失败或全部成功。
- Pull、Push、提交、清理索引残留和丢弃改动要求明确确认。
- 未跟踪文件不会被回滚接口自动删除。
- Patch先验证路径在项目目录内，再执行 `git apply --check`，通过后才应用。
- Git凭据由系统 Git/凭据管理器处理，不写入项目元数据或日志。

## 实现入口

- 仓库配置：`backend/modules/projects/project-git.ts`
- Git工作区：`backend/modules/tools/git.ts`
- 页面：`frontend/src/components/tools/CodeChanges.vue`及`code-changes/*`
- 回归：`project-path-git-workspace-selftest.mjs`、`code-changes-render-regression.mjs`、`git-local-data-ignore-selftest.mjs`。
