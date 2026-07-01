# 群聊协作与任务治理 10.0

## 定位

把 CCM 从“展示多 Agent 内部协议与诊断文字”升级为普通用户能理解、能控制、能验收的多 Agent 开发工作台。

当前 24 小时稳定性验收完成后，本目标作为下一轮正式开发目标启动。

## 当前核心问题

1. 群聊主 Agent 会反复输出“任务补充说明”，但没有稳定收敛到真实执行和交付。
2. `CCM_AGENT_RECEIPT`、scratchpad、assignment 等内部协议直接进入用户消息流，信息密度高且重复。
3. 任务、任务派发和定时任务缺少完整的编辑、暂停、取消、删除、归档与批量清理能力。
4. 群聊消息、任务、定时触发、子 Agent 会话、Trace 和最终报告之间的状态没有形成一个清晰实体链路。
5. 用户看不出当前是谁在工作、为什么停住、下一步是什么，也不知道可以执行哪些操作。

## 目标一：真实交付闭环

建立统一状态机：

`理解需求 → 制定计划 → 派发 → 执行 → 等待依赖/返工 → 主 Agent 验收 → 完成交付`

- 只有同时具备真实文件变更、已执行验证、Worker 结构化回执和主 Agent 验收证据，任务才能进入 `completed`。
- 缺少证据时自动生成针对具体缺口的续跑任务，优先交回原 Agent 和原生会话。
- 无法继续时只提出一个明确、可回答的用户决策，不再重复发送整段协议说明。
- 相同缺口、相同状态和相同提示必须去重，设置重试上限和升级策略。

## 目标二：完整任务治理

统一管理普通任务、任务派发和定时任务：

- 查看、编辑、复制、暂停、恢复、立即运行、取消、删除、归档。
- 支持多选批量取消、删除已完成任务、归档历史任务。
- 运行中任务删除前先安全取消执行，释放租约、幂等记录、等待队列、临时会话和 worktree。
- 定时任务删除后不得再次触发；编辑 Cron 或提示词后展示下一次运行时间。
- 所有管理操作写入审计记录，并能从任务页追溯操作者、时间和影响对象。
- 删除采用“软删除 + 可恢复”的默认策略；真正清除提供二次确认。

## 目标三：用户可理解的群聊展示

每个开发请求默认只展示一张持续更新的任务卡，而不是连续堆叠内部消息。

任务卡固定包含：

- 用户目标
- 当前阶段与总体进度
- 正在工作的 Agent
- 已完成事项
- 当前阻塞及原因
- 下一步动作
- 最终文件变更、验证结果和风险

展示规则：

- assignment、scratchpad、receipt、Trace、原始提示词放入折叠的“技术详情”。
- 同一任务后续状态原位更新任务卡，关键里程碑才追加简短消息。
- Agent 依赖关系使用阶段时间线或紧凑依赖图展示。
- 提供暂停、继续、重试、换执行器、取消和查看详情等上下文操作。
- 面向用户的文字由主 Agent 翻译，不直接暴露内部协议名。

## 目标四：统一实体链路

建立并强制以下关联：

`群聊请求 → Task → Dispatch/定时触发 → Agent Execution → Native Session → Trace → Receipt → Acceptance → Delivery Report`

- 一个用户请求只能对应一个活动主任务，重复消息复用已有任务卡。
- 所有子任务、返工和执行器切换保留父任务与 Trace。
- 后端状态是唯一事实源，群聊卡片、任务页和定时任务页不得各自维护冲突状态。
- 服务重启后能够恢复活动任务卡、执行会话和操作入口。

## 实施顺序

1. 先修任务状态机、完成门禁和重复补充说明循环。
2. 再补任务/派发/定时任务的 CRUD、取消清理和归档。
3. 建立统一任务视图模型与状态事件流。
4. 重做群聊任务卡、时间线和操作入口。
5. 用真实小型全栈项目执行端到端验收。

## 验收标准

- 用户发出一次完整开发需求后，系统能够真正执行并以文件变更和验证证据完成。
- 相同任务不会重复生成“任务补充说明”或重复任务卡。
- 用户无需理解 `CCM_AGENT_RECEIPT`、scratchpad、assignment 等术语，也能判断当前进展和阻塞原因。
- 普通任务、派发任务和定时任务均可编辑、暂停/恢复、取消、删除和归档。
- 取消或删除运行中任务后，不残留租约、幂等占用、队列项、会话或 worktree。
- Agent 失败后可从原会话恢复或切换执行器，状态和证据链不中断。
- 最终报告固定包含目标、Agent 工作记录、文件变更、实际验证、风险和未完成项。
- 用一个真实小型全栈项目完成 E2E，覆盖成功、返工、失败恢复、取消和删除场景。

## 实施记录

### 2026-07-01：第一阶段——收敛循环、用户任务卡与生命周期治理

已确认并修复截图中“任务补充说明”重复出现的三个根因：

1. 自动返工曾把内部缺口草稿追加成新的群聊 `role=user` 消息，导致用户直接看到主 Agent 协议。
2. 每次继续任务都会清空 `delivery_summary`、回执和复盘，上一轮计划、派发与 Worker 证据因此丢失，下一轮必然再次报告相同缺口。
3. 自动返工的幂等键包含递增轮次，同一个缺口每轮都会被当成新操作。

当前实现：

- 缺口由规范化条目和稳定 SHA-256 指纹标识。
- 同一缺口最多自动返工一次；仍无新证据时进入 `needs_user`，要求用户补充、改方案或人工重试。
- 自动返工只写 `internal_continuations` 和任务日志，不再新增群聊消息。
- 继续执行保留上一轮 `delivery_summary`、回执和复盘证据。
- 新证据改变缺口指纹后，才允许新一轮有针对性的自动返工。
- 协调器回归新增：首次自动返工、相同缺口不循环、新缺口可续跑、耗尽后请求用户决策、内部续跑不外显、用户卡不暴露协议术语。

新增统一 `taskCard` 用户视图模型：

- 字段固定为目标、阶段、进度、活动 Agent、已完成事项、阻塞、下一步、交付和操作。
- Trace、Execution ID、Session ID、缺口指纹进入折叠“技术详情”。
- 群聊加载历史消息时，从当前 Task/Execution/Session 事实动态生成任务卡。
- 每个 Task 默认只显示首张持续更新的任务卡；Agent 工作单、原始回执、自动补充、task-notification 和执行事件不再进入默认消息流。
- 卡片支持暂停、继续、补充、重新规划、重派、按缺口返工、查看报告和取消。

新增任务治理能力：

- 普通任务支持编辑、暂停、恢复、取消、软删除、归档恢复、永久清除和批量操作。
- 默认删除会从队列移除任务，发出进程树取消，关闭原生会话，释放租约，结算幂等操作，清理 worktree，并保存结构化清理报告。
- 活动任务接口默认不返回归档任务；归档页可恢复或永久清除。
- 永久清除会移除取消标记，避免留下不可见运行债务。

新增定时任务治理能力：

- 定时任务支持完整编辑、启用/禁用、软删除、归档恢复、永久清除和批量操作。
- 归档任务立即禁用且 `next_run=null`，调度器和手动运行均拒绝执行归档任务。

验证证据：

- `npm run check`：通过。
- `npm run test:coordinator`：通过。
- `npm run build:frontend`：通过。
- 单对象 API E2E：任务与 Cron 的编辑、归档、活动列表隐藏、归档列表、恢复、永久清除全部通过。
- 批量 API E2E：任务暂停/归档/恢复/永久清除与 Cron 禁用/归档/恢复/永久清除共 12 项全部通过。
- 清理后可靠性债务：失效幂等 0、失效租约 0、孤儿任务 0、失效飞书锁 0。
- 浏览器实际页面：群聊可见任务卡 4 张；旧内部自动补充可见数 0；`CCM_AGENT_RECEIPT`、`ccm_receipt`、`task-notification` 可见数 0；任务页存在编辑/删除/归档/多选入口；定时任务页存在编辑/删除/归档入口。

后续仍需完成：

- 将 Dispatch、Execution、Session、Trace、Receipt、Acceptance、Delivery Report 固化为统一可查询实体链路，而不只是任务卡聚合。
- 增加换执行器操作和执行恢复的 UI/E2E。
- 构建真实小型全栈项目，完成成功、返工、失败恢复、取消和删除无残留的最终验收。

### 2026-07-01：第二阶段——统一证据链、执行器恢复与真实全栈 E2E

本阶段使用真实项目 `C:\Users\admin\.cc-connect\agent-collab-lab` 和群聊“Agent 协作 E2E 实验室”验收，不使用模拟文件代替交付。

核心修复：

- 新增任务卡“换执行器”操作，支持 Claude Code、Codex、Cursor，并可按整个任务或单个项目设置 runtime override；执行路径和 CLI 探针均以任务级选择为事实源。
- 自动执行器恢复保留原 Task、Trace、工作区、回执和验收标准。真实任务中依次覆盖 Codex 超时、Claude 超时、Cursor 网络断连及备用执行器续跑。
- retry 不再删除上一轮证据；旧交付进入 `delivery_history`，当前回执、复盘、文件差异和验证保留供续跑。
- Execution 实体现在持久化最新 Worker receipt、fileChanges、runnerVerification 和有界输出预览；最终汇总直接读取实体链，不再依赖主 Agent 长文本是否完整复述回执。
- 同 Agent 历史 blocked/missing 回执不能覆盖最新 done 回执；建议人工浏览 UI 等 advisory need 不再被当成完成阻塞。
- 群聊协调复盘最多自动返工一次。最终复盘轮强制 `followUps=[]`，不允许 LLM 在达到上限后再启动一轮 Worker。
- daily_dev 单次执行窗口与任务包预算统一为 300 秒；普通轻任务仍为 120 秒。任务多轮补充信息可压缩成短执行简报，原始需求、Trace、历史回执和需求池仍保留。
- 群聊级和项目级准入先读取任务级 runtime override；备用执行器已通过时，不再被静态首选执行器的旧失败短路。
- 完成/取消任务卡不再展示历史 readiness、缺口指纹或旧阻塞，终态只展示最终交付或取消结果。

统一实体链：

- 新增 `/api/tasks/entity-chain?id=<taskId>`，统一返回 Message、Task、Dispatch、Execution、Native Session、Trace、Receipt、Acceptance、Delivery Report 和一致性检查。
- Execution/Session/Receipt/Acceptance 均使用 Task ID 与 Trace 关联；执行器切换和返工不创建旁路主任务。
- 群聊默认只显示一张持续更新的用户卡；导航历史和消息流均过滤 assignment、返工工作单、task-notification、receipt 与协调诊断协议。

生命周期与永久清理：

- 运行中取消会先终止进程树，再将 Execution 从 `cancel_requested` 收敛到 `cancelled`；已结束 Execution 不再被倒退成取消中。
- 任务进入取消终态后清除活动取消标记；队列、租约、会话和 worktree 同步释放。
- 软删除保留审计和恢复能力；永久清除额外删除该 Task 的 Execution、Checkpoint、有界大输出和任务级 Session 记录。Trace、任务日志和已释放租约作为只读审计证据保留，但不会被调度。

真实成功 / 返工 / 恢复 E2E：

- Task：`mr0yv5lptagp`；Trace：`daily-dev_mr0yv5hx_6c57cfab0372`。
- 业务交付：工单 owner 后端合同、创建校验、owner 查询筛选、前端输入/展示/筛选及旧数据兼容。
- 实际变更 7 个文件：`backend/server.mjs`、`backend/store.mjs`、`shared/api-contract.json`、`tests/api.test.mjs`、`frontend/app.js`、`frontend/index.html`、`frontend/styles.css`。
- 独立运行 `npm test`：18/18 通过；`npm run check`：通过。
- 两个 Worker 最新回执均为 done；两个 Execution 的 Runner 状态均为 passed；交付汇总收集 9 条已执行验证。
- 最终 Task 状态 done，Acceptance Gate 通过，两个 Execution 状态 succeeded。
- 真实返工中曾因共享仓库增量归因和历史 blocked 回执触发补证；修复后同 Task 续跑完成，没有创建第二个主任务。

真实取消 E2E：

- Task：`mr1e6rxyv0jc`。
- 入队并进入 in_progress 后取消；最终 Task=cancelled、Execution=cancelled、开放 Session=0、队列残留=0、worktree=0。

真实删除无残留 E2E：

- Task：`mr1ea1vspui5`。
- 运行中软删除终止 1 个进程并释放租约；随后永久清除。
- purge 删除 Execution 1 条、Checkpoint 1 条；最终 Task=0、Execution=0、Session=0、Queue=0。
- 可靠性债务接口：stale idempotency=0、stale task lease=0、orphaned task=0、stale Feishu lock=0。

回归验证：

- `npm run check`：通过。
- `npm run test:coordinator`：通过，包含 Execution 证据持久化、取消终态、运行时恢复、会话续跑、冲突串行、缺口指纹收敛等自测。
- `npm run build:frontend`：通过。
- 浏览器实测：用户任务卡显示最终阶段、100% 进度、文件和验证数；默认消息流不显示 `CCM_AGENT_RECEIPT`、scratchpad、task-notification 或主 Agent 返工工作单。

后续方向：

- 长时间运行中继续统计各执行器首包耗时，按任务类型自适应 300 秒窗口，而不是继续增加固定超时。
- 对同一任务的并发编辑/换执行器请求增加存储层 CAS/version，避免两个同时写请求出现 last-write-wins。
- 将保留的 Trace/日志审计增加独立保留期和一键隐私清理策略，区分“运行态无残留”和“合规审计保留”。
