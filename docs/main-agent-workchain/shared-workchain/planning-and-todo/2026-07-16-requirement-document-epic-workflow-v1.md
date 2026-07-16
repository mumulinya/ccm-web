# 需求文档自动拆单与 Epic 开发链 v1

## 用户流程

Web 全局 Agent、群聊主 Agent 和飞书控制机器人共享同一条链路：

1. 用户上传 PDF、DOCX、PPTX、XLSX、文本、图片或发送公开链接，并表达开发意图。
2. `source-ingestion` 提取结构化需求，生成 `ccm-requirement-decomposition-v1`。
3. 任务卡展示 Epic 标题、子任务、目标项目、验收标准和依赖关系。
4. 用户只确认一次任务图。
5. 后端在一次 SQLite 事务中创建 Epic 父任务、所有子任务和依赖边。
6. 无前置依赖的子任务立即进入队列；后继节点只在前置任务通过真实交付验收后解锁。
7. 多任务计划自动追加 `epic-integration-acceptance` 集成验收节点，等待全部开发节点通过后执行。
8. 所有子任务和集成验收通过后，Epic 进入 `awaiting_change_review`。
9. 用户审阅整批改动，可以批准交付或按 `item_key` 退回单个子任务返工。

## 持久化模型

Epic 父任务使用 `workflow_type: requirement_epic`，继续复用现有任务表，不创建第二套任务系统。

父任务关键字段：

- `trace_id`：从解析、确认、建单、执行、验收到交付始终不变。
- `decomposition_plan`：已确认的任务图及版本。
- `requirement_content_hash`、`requirement_version`：需求版本标识。
- `child_task_ids`：当前版本的活动子任务。
- `mission_summary`：子任务验收汇总。
- `epic_review`：整批审阅结论。

子任务关键字段：

- `parent_task_id`、`requirement_epic_id`：所属 Epic。
- `requirement_item_key`：文档拆解中的稳定任务键。
- `mission_dependencies`：已解析成任务 ID 的前置依赖。
- `requirement_dependency_keys`：面向用户的原始 `item_key` 依赖。
- `acceptance_criteria`：该子任务自己的验收标准。

## 幂等与原子性

批次键格式：

`requirement-epic:{channel}:{conversation}:{client_message_id}:{content_hash}`

子任务键格式：

`{batch_key}:item:{item_key}`

服务会在写入前完成以下校验：

- `item_key` 唯一；
- 所有依赖只引用当前计划中的任务；
- 依赖图无环；
- 目标项目或群聊存在；
- 用户已确认任务图。

父任务和全部子任务通过一次 `saveTasks` SQLite 事务提交。任何记录失败时整批回滚；重复确认返回原 Epic 和原子任务，不创建第二批任务。

## 调度与恢复

- `mission_dependencies` 为空的子任务可立即排队。
- 依赖任务必须达到 `done`，且交付验收门有真实通过证据，后继节点才会解锁。
- 同仓可能重叠写入的任务继续受 shared worktree 串行和 merge owner 规则约束。
- 任务看门狗会推进已确认的 Requirement Epic，恢复根节点、依赖解锁和中断任务。
- 启动恢复不会绕过依赖，把尚未解锁的子任务直接入队。
- 单个子任务失败只阻塞其后继节点，不影响无依赖的其他分支。

## 需求版本变更

新文档版本使用稳定 `item_key` 计算差异：

- `unchanged`：保留任务状态和已完成证据；
- `added`：创建新子任务；
- `changed`：归档旧交付，重新打开受影响子任务；
- `removed`：取消尚未完成节点；已完成节点仅标记为历史范围，不删除证据。

版本更新沿用原 Epic `trace_id`，父任务保存最近十个计划版本和最后一次差异。

## 渠道行为

- Web 和群聊 multipart 上传直接进入统一解析器。
- 全局 Agent 有只读 `decompose_requirement_epic` 和写入 `create_requirement_epic` 工具。
- 飞书文件、媒体和图片事件通过消息资源 API 下载到受控上传目录，限制 25 MB，再进入同一解析与拆单链。
- 飞书确认仍使用持久 Global Agent 运行的确认门；服务重启后可继续同一个 run、mission 和 trace。

## API

- `POST /api/usability/intake/preview`：解析文档并创建待确认 Epic 卡。
- `POST /api/usability/intake/confirm`：确认后原子创建全部子任务。
- `POST /api/tasks/requirement-epic/version`：应用已确认的新需求版本。
- `POST /api/tasks/requirement-epic/review`：`approve` 或按 `item_key` 执行 `rework`。
- `GET /api/tasks/requirement-epic/metrics`：查看 Epic 状态、依赖等待、返工和完成时长。
- `GET /api/tasks/requirement-epic/self-test`：运行 schema、DAG、版本差异和 SQLite 原子事务自测。

## 验收门

Epic 只有在以下条件全部满足时才能批准：

1. 每个活动子任务状态为完成；
2. 每个子任务通过真实交付验收门；
3. 需要代码变更时存在实际文件变更；
4. 需要验证时存在已执行的验证证据；
5. worktree 交付已完成合并；
6. 用户完成整批变更审阅。

最终报告由统一 `buildTaskDeliveryReport` 生成，并保存逐 `item_key` 的验收标准、来源证据、文件变化数量和验证数量。

## 验证矩阵

- Schema 与稳定键：自测覆盖标准化、重复键和多任务集成验收节点。
- DAG：自测覆盖环检测；任务卡显示可继续分支、等待链和失败阻塞链。
- 原子批次：内存 SQLite 自测覆盖故障回滚与父子记录一次提交。
- 服务重启：文件 SQLite 自测关闭并重新打开数据库，校验同一 Epic 父子记录恢复。
- 重复确认：批次键和子任务幂等键命中时重放原父子任务。
- 部分失败与依赖解锁：Mission supervisor 只放行通过强验收门的前置节点；失败只阻塞后继。
- 文档版本：自测覆盖新增、修改、未变项，运行时保留未受影响的已完成任务。
- Web/飞书生产链：两种渠道都进入 `ingestRequirementSources` 和同一 `createRequirementEpicWithChildren`；真实附件验收需要对应飞书租户凭据和项目执行器。

本地隔离 E2E 已验证 Web self-test/metrics 路由、无目标项目时的安全阻断，以及带 Verification Token 的飞书事件回调握手。飞书附件资源下载的生产验收仍以真实租户凭据运行，测试环境不得伪造成功。
