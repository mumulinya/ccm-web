# 项目代码工作区与 Git 协作

## 项目与仓库

- 项目创建或编辑时可以绑定本地目录、GitHub仓库和分支；项目内部 ID 与显示名称分离。
- 支持克隆仓库、初始化 Git、配置 `origin` 和读取远端状态。
- 项目分组只影响选择和展示，不改变项目 ID、目录、会话、任务或记忆作用域。
- 仓库身份绑定真实仓库根目录、Git common directory、HEAD、分支和脱敏远端指纹；页面与Agent不能用项目目录字符串代替仓库身份。
- GitHub仓库先克隆到CCM专属临时目录，校验后原子切换；页面支持查看进度和停止克隆，无法安全回滚时保留源码并生成恢复回执。

## 代码协作页面

1. 异步读取 Git porcelain 状态、暂存区、工作区、未跟踪文件和真实增删行统计，并以最多500项分页返回。
2. `.gitignore` 排除且从未跟踪的文件不出现在可提交列表；已被 Git 跟踪的历史文件仍按 Git 规则展示。
3. 文件树按目录聚合，支持完整文件、diff、二进制/大文件状态和提交历史。
4. 提交前执行所选文件预检，冲突、索引残留或选择不完整时阻止提交。
5. 支持本地提交、提交并推送、Fetch、Pull、Push和提交历史。
6. 项目或文件切换会取消旧请求；状态、Diff和提交预检均绑定工作区快照checksum，旧响应不能覆盖新项目页面。

## 安全与并发

- 文件路径逐段核验`lstat/realpath`，禁止通过符号链接或Windows Junction读取仓库外内容；叶子链接不跟随目标。
- 快照包含状态、索引和变更文件内容checksum，预检后的内容、HEAD或分支漂移均返回`409 state_drift`。
- 同一Git common directory的写操作由跨进程租约串行；占用时返回`423 repository_busy`。
- Agent提交必须提供非空精确文件清单；全量提交只允许管理员显式确认，空文件列表不会隐式提交全部。
- 写入回执保存前后快照、文件checksum、commit和Blob ID，供任务回放与TestAgent核验。

## 部分成功与回滚

- “提交并推送”先创建本地提交；推送失败时返回 `partialSuccess` 和本地 commit hash，不能谎报全部失败或全部成功。
- Pull、Push、提交、清理索引残留和丢弃改动要求明确确认。
- 未跟踪文件不会被回滚接口自动删除。
- Patch先验证新增、删除和重命名路径的真实路径边界，再执行 `git apply --check`，通过后才应用。
- Git凭据由系统 Git/凭据管理器处理，不写入项目元数据或日志。

## 实现入口

- 仓库配置：`backend/modules/projects/project-git.ts`
- Git工作区：`backend/modules/tools/git.ts`
- 页面：`frontend/src/components/tools/CodeChanges.vue`及`code-changes/*`
- 完整流程：[项目Git与代码协作完整链路V2](../confirmed-business-processes/PROJECT-GIT-CODE-COLLABORATION-V2.md)
- 回归：`project-path-git-workspace-selftest.mjs`、`git-collaboration-production-v2-selftest.mjs`、`project-github-management-selftest.mjs`、`agent-code-change-visualization-selftest.mjs`。
