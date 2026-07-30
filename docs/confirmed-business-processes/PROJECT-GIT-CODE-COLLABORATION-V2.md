# 项目 Git 与代码协作完整链路 V2

## 业务目标

项目页面、代码协作页面、全局 Agent 和项目 Agent 共用同一套 Git 工作区身份、快照、写入门禁和操作回执。用户看到的文件、Diff、提交范围和 TestAgent 验收状态都必须能够由当前仓库内容证明。

```text
项目 ID与源码目录
→ 规范化仓库身份
→ 不可变工作区快照
→ 分页文件树与按需Diff
→ 精确文件预检
→ 仓库级写入租约
→ 快照漂移复核
→ 提交、拉取、推送或Patch
→ 操作回执与最新快照
→ 任务回放和验收证据
```

## 仓库身份与读取边界

- `GitRepositoryIdentityV2`绑定项目ID、工作目录、真实仓库根目录、Git common directory、HEAD、分支和脱敏远端指纹。
- 文件路径按每一级执行`lstat`与`realpath`校验。目录符号链接、Windows Junction和任何真实路径越界都会被拒绝。
- 叶子符号链接只展示Git链接身份和差异，不读取链接目标。
- 删除、重命名和Patch中的所有路径使用相同门禁；仓库外文件不能通过`/api/git/file`、Diff或Patch读取。
- 文件预览仅允许普通文本文件并受大小限制；二进制和超大文件只展示安全元数据。

## 工作区快照与分页

- `GitWorkspaceSnapshotV2`同时签名仓库身份、porcelain状态、索引文件和实际变更文件内容。
- 即使文件路径和Git状态文本没有变化，只要内容变化，快照checksum也会变化。
- 状态接口每页最多500项，返回`total`、`next_cursor`、`truncated`和稳定快照checksum。
- 文件树逐页加载；任务归因和TestAgent信息由独立接口按需读取，不阻塞基础状态。
- Diff必须绑定项目、文件、暂存模式和工作区快照；旧快照返回`state_drift`，要求用户刷新。
- 前端切换项目、文件或暂存模式时取消旧请求并推进请求generation。只有身份仍一致的响应可以更新页面。

## 写入事务与提交范围

- 提交、Fetch、Pull、Push、索引清理、回滚、Patch、初始化和远端配置进入仓库级写入事务。
- 锁键基于Git common directory；同一仓库严格串行，不同仓库可以并行。
- 仓库被占用时返回`423 repository_busy`，页面展示当前操作，不竞争`.git/index`。
- 写入前重新生成快照。HEAD、分支、索引、状态或文件内容变化时返回`409 state_drift`。
- 页面、全局 Agent和项目 Agent提交都必须给出非空精确文件清单。空清单绝不解释为“全部提交”。
- “提交全部”只接受管理员在页面显式提交`all_files=true + confirmed=true`，并生成高风险范围审计。
- 只提交所选文件时，不会带入用户在其他文件上已有的暂存内容。
- 丢弃改动必须由服务端收到`confirmed=true`；未跟踪文件不会被自动删除。
- 提交并推送采用部分成功语义：本地提交成功后即保留commit；推送失败返回可重试回执，不撤销本地提交。

## 操作回执与TestAgent归因

- 每次写操作返回`GitMutationReceiptV2`，记录操作、操作者、前后快照、文件证据、结果和checksum。
- 提交回执保存实际进入提交的文件、完整commit hash和Blob ID。
- 开发Agent、TestAgent和主Agent验收使用同一份文件证据：项目、任务、仓库、HEAD和文件checksum全部一致时才显示“当前内容已验收”。
- 只有路径重合、旧记录缺少内容证据、分支变化或文件后来被修改时，页面只显示“历史任务曾修改，当前内容未经该次验收”。
- 任务回放保留操作回执、提交范围、TestAgent证据和部分成功状态，不从路径名称或自由文本猜测验收通过。

## GitHub克隆与恢复

- 新项目先克隆到目标目录同级的CCM专属临时目录，使用非交互凭据环境和完整进程取消信号。
- 临时仓库通过分支、origin和HEAD校验后才原子重命名到目标目录。
- 目标原本为空时，提交前再次核验目录身份和空状态；克隆期间目录被替换或写入会停止切换。
- 页面显示克隆阶段，支持停止克隆。停止、超时和失败只清理带当前CCM回执的临时目录。
- 项目元数据写入失败时，只有能够证明最终目录由本次克隆创建、HEAD未变且工作区干净时才自动回滚。
- 不能安全回滚时状态为`recovery_required`，源码目录保留，用户可按回执继续注册。
- 服务启动清理过期CCM临时目录和租约，不删除用户已有目录。

## 接口与用户状态

- `GET /api/git/status`：分页工作区快照。
- `GET /api/git/context`：按需读取任务与验收归因。
- `GET /api/git/diff`：读取绑定快照的精确Diff。
- `POST /api/git/commit`：预检后提交精确文件，可选继续推送。
- `POST /api/git/remote-operation`：执行Fetch、fast-forward Pull或Push。
- `POST /api/git/rollback`、`POST /api/git/apply-patch`：执行受确认和快照约束的修改。
- `GET /api/projects/clone/status`、`POST /api/projects/clone/cancel`：查询和取消原子克隆。

用户可见错误统一为：仓库忙、工作区已变化、认证失败、远端领先、连接超时、冲突、部分成功或需要恢复。Git凭据、含密钥URL和原始敏感stderr不进入页面、回放或日志。

## 上线验证

- `project-path-git-workspace-selftest.mjs`：20项真实仓库接口回归，覆盖选择提交、部分成功、fast-forward Pull、路径逃逸、分页、漂移与确认。
- `git-collaboration-production-v2-selftest.mjs`：24项V2门禁，覆盖真实内容快照、跨进程租约、Junction、Agent精确文件、克隆取消UI和TestAgent证据。
- `project-github-management-selftest.mjs`：21项项目仓库配置回归，网络Git调用为0。
- `agent-code-change-visualization-selftest.mjs`：30项代码展示与归因回归。
- TypeScript、前端生产构建和后端生产构建通过；Provider调用为0。

## 实现入口

- 统一Git运行时：`backend/modules/tools/git-workspace-runtime.ts`
- Git API：`backend/modules/tools/git.ts`
- 项目仓库与克隆：`backend/modules/projects/project-git.ts`
- TestAgent证据：`backend/modules/collaboration/test-agent-runner.ts`
- 代码协作页面：`frontend/src/components/tools/CodeChanges.vue`
- 项目创建与克隆状态：`frontend/src/components/projects/ProjectFormModal.vue`

