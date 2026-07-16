# SQLite WAL 任务数据存储 v1

## 目标

将持续增长的 `tasks.json`、`task-logs.json` 和 `group-logs.json` 迁移到单文件 SQLite 数据库，避免每次更新完整读取和覆盖数 MB JSON，同时保留现有主 Agent、群聊、任务回放和 TestAgent 调用接口。

## SQLite WAL 是什么

SQLite 是嵌入式关系数据库，不需要单独部署数据库服务。CCM 的数据库文件位于 `~/.cc-connect/ccm.db`。

WAL（Write-Ahead Logging，预写日志）模式会先把变更写入 `ccm.db-wal`，再由 SQLite 自动检查点合并到主数据库。它带来的主要收益是：

- 读取不会被普通写入长时间阻塞。
- 每次只更新变化的任务行，不再覆盖完整 JSON 文件。
- 事务提交要么全部成功，要么全部回滚。
- 进程异常退出后可由数据库和 WAL 自动恢复。

`ccm.db-wal` 和 `ccm.db-shm` 是数据库运行时文件，不应手动删除；正常关闭或执行检查点后 WAL 会被收敛。

## 数据模型

### tasks

保留完整 `payload_json` 兼容现有任意任务字段，同时将下列字段提升为索引列：

- `id`
- `status`
- `group_id`
- `target_project`
- `workflow_type`
- `created_at`
- `updated_at`
- `archived`

保存时比较 `payload_hash`，只对新增或变化的任务执行 upsert，并在同一个事务中处理删除。

### task_logs

任务日志改为单行追加，每个任务保留最近 100 条。`getTaskLogs()` 和 `clearTaskLogs()` 的业务接口保持不变。

### group_logs

群聊日志改为单行追加，每个群聊保留最近 500 条。原有加载、替换和清理流程继续兼容。

## 首次自动迁移

首次访问任务数据时执行：

1. 创建 `ccm.db` 和表、索引。
2. 开启 `journal_mode=WAL`、`synchronous=NORMAL`、外键和 10 秒 busy timeout。
3. 在事务内导入三个旧 JSON 文件。
4. 记录迁移来源、数量和时间到 `app_meta`。
5. 成功后把旧文件移动到 `~/.cc-connect/legacy-json-backups`。
6. 运行完整性检查和 WAL checkpoint。

迁移完成后不会继续双写 JSON，避免 SQLite 与旧文件形成两个事实来源。

## 运维命令

```bash
npm run storage:status
npm run storage:verify
npm run storage:backup
npm run storage:export
```

指定导出或备份路径：

```bash
node scripts/task-store-sqlite.mjs backup D:\backup\ccm.db
node scripts/task-store-sqlite.mjs export D:\backup\ccm-json
```

恢复操作必须显式确认，并会先保存当前数据库：

```bash
node scripts/task-store-sqlite.mjs restore D:\backup\ccm.db --confirm
```

数据库备份默认进入 `~/.cc-connect/database-backups`，JSON 导出默认进入 `~/.cc-connect/exports`。

## 发布与兼容边界

- 使用 `better-sqlite3` 作为同步事务驱动。
- 根项目和 npm 发布包都声明直接依赖，不能依靠开发机全局安装。
- 最低 Node.js 版本提升到 20。
- 现有 `loadTasks()`、`saveTasks()`、任务日志和群聊日志 API 保持兼容。
- 测试可通过 `CCM_TASK_STORE_DIR` 使用隔离数据库，禁止污染用户真实数据。
- 主服务启动时获取数据目录单实例锁；同一个 `~/.cc-connect` 默认只允许一个 CCM 服务写入，避免不同端口的完整任务快照相互覆盖。
- 只有显式设置 `CCM_ALLOW_SHARED_DATA_DIR=1` 才能绕过该锁，该选项仅用于已自行隔离写入的高级测试。

## 验证

`npm run test:sqlite-task-store` 覆盖：

- 旧 JSON 自动迁移和原文件归档。
- WAL 模式与数据库完整性检查。
- 任务新增、更新、删除差异写入。
- 四个独立 Node 进程并发追加日志。
- 每任务 100 条日志保留策略。
- SQLite 在线备份、变更后恢复和恢复后复核。
- 任务、任务日志和群聊日志 JSON 导出。
- npm 发布包在干净临时目录真实安装，确认不依赖源码父目录，并由包内 `better-sqlite3` 创建 WAL 数据库、写入和读回三类数据。
