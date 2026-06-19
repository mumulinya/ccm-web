# 日常开发 Agent 操作手册

这个控制台的目标是把业务需求交给主 Agent，由主 Agent 拆分给子项目 Agent 执行，再由主 Agent 根据回执和实际输出复盘验收。

## 推荐配置

1. 在“项目管理”里为每个代码仓库创建项目 Agent，例如后端、前端、管理端、移动端。
2. 在“群聊协作”里创建一个开发群，把相关项目 Agent 加入群聊。
3. 建议在“系统设置 -> 统一大模型配置”里配置主 Agent 使用的大模型 API；未配置或调用失败时，默认保留规则主 Agent 继续计划、派单和复盘。
4. 在同一页查看“日常开发闭环自检”和“自动开发状态”，确认主 Agent、开发群聊、子 Agent 工作目录、任务队列和定时派发入口没有阻塞项，并按面板给出的下一步动作补齐业务输入或执行通道。
5. 点击“启用定时接活”，系统会为具备可执行子 Agent 的开发群聊创建默认 `daily_dev` 定时任务。
6. 把业务说明、接口文档、PRD、验收标准上传到群聊共享文件，或直接写入任务描述。

`daily_dev` 业务开发任务要求开发群聊具备主 Agent 协调者和至少 1 个可派发的项目子 Agent。子 Agent 必须能解析到项目配置，并且工作目录可读写；否则创建业务开发任务或从需求池立即派发时会被系统拦截，避免只让主 Agent 空转。

如果多个子 Agent 可能并行写同一个仓库，可以启用类似 Claude Code Coordinator/Worker 的 worktree 隔离模式：

```powershell
$env:CCM_CHILD_AGENT_ISOLATION="worktree"
cc-web
```

启用后，子 Agent 会在目标 Git 仓库的 `.cc-connect/worktrees/` 下创建独立工作目录和 `ccm/<slug>` 分支，并在工作单里收到 worktree 路径、分支和原项目目录。系统默认保留这些 worktree，便于主 Agent 或用户检查、合并和清理；如果仓库不是 Git 仓库或 worktree 创建失败，任务日志会记录降级原因并回到共享目录执行。

自检也可以直接调用接口：

```bash
curl http://localhost:3080/api/orchestrator/diagnostics
```

返回 `readiness=ready` 表示可以按日常开发工作流接单；`partial` 表示可以接单但有建议完善项；`blocked` 表示需要先处理失败项。

如果自检里的“Agent CLI 进程能力”失败，说明当前 Node 服务无法启动项目子 Agent 的 CLI（例如 `spawn EPERM`）。这种情况下主 Agent 仍能理解和派发任务，但子 Agent 无法真正写代码；真实业务开发任务会失败并报告阻塞原因。

如果 Web 服务所在环境不能直接启动子进程，可以在另一个允许运行 CLI 的终端里启动外部执行器：

```bash
npm run agent-runner
```

如果当前 Node 环境本身被限制到无法 `spawn`，优先使用 PowerShell 执行器：

```powershell
powershell -ExecutionPolicy Bypass -File bin/agent-runner.ps1 -Watch
```

外部执行器会监听 `~/.cc-connect/agent-runner/requests`，执行主服务写入的 Agent 请求，并把结果写回 `~/.cc-connect/agent-runner/results`。自检显示外部 Agent Runner 在线后，即使主服务自身不能 `spawn`，子 Agent 仍可通过 Runner 执行。

如果自检显示外部 Runner 最近执行失败，例如 `API Error: Unable to connect to API (ConnectionRefused)`，说明 Runner 已经接到任务并成功启动 Agent CLI，但底层 Agent CLI 无法连接它的模型/API 服务。此时需要检查 Claude Code/Codex 等 CLI 的登录状态、代理、网络或 API 配置后再重试。

当前子 Agent runtime 会公开自己的执行能力：`externalRunner` 表示可通过外部执行器接任务，`worktreeIsolation` 表示支持隔离工作目录，`scratchpadContinuation` 表示返工时能通过 Worker ledger 续跑上下文。`claude --permission-mode acceptEdits -p`、`codex -q` 等命令式入口目前没有在本项目里声明原生 `sessionResume`；系统不会假装底层 CLI 已经能恢复同一个模型会话，而是把上一轮 `task-notification` 和 scratchpad 明确注入下一轮 Worker 工作单，形成可审计的逻辑续跑。

服务启动后会同时启动“执行通道恢复监控”。当系统里存在因为 Agent CLI/Runner/API 失败而未入队的自动任务，或存在明确的执行通道失败任务时，监控会按间隔自动运行轻量探针；探针通过后会自动把被执行通道挡住的 `pending` 任务重新入队，并批量重试可恢复的运行时失败任务。没有等待恢复的任务时不会空跑探针。自检接口里的 `agent-recovery-monitor` 会显示监控是否已启动、是否正在探针，以及当前等待恢复的任务数量。

设置页的“立即恢复自动任务”会调用同一套恢复监控流程，适合在修好 CLI 登录、代理或 API 连接后立刻触发一次探针和队列恢复。

设置页的“复检执行通道”会真实调用一个可执行子 Agent，让它只返回 `CCM_AGENT_PROBE_OK`。最近 30 分钟内探针通过时，系统会认为模型 CLI 连通性已有新鲜证据；最近 15 分钟内探针失败时，即使 Node 本身可以启动子进程，也会把 `Agent CLI 连通探针` 标为失败并阻止自动开发任务继续入队，避免 `ConnectionRefused`、登录失效或代理问题造成任务批量失败。失败窗口不会阻止再次点击“复检执行通道”；修好登录、代理或 API 后可以立即重跑探针。

探针结果会记录目标群聊、目标 Worker、Agent 类型、工作目录、执行路径、预期标记、输出预览和修复动作。如果底层返回 `Agent Runner 错误`、`Agent 错误`、超时或 API 连接失败，诊断不会只显示“缺少探针标记”，而会保留原始失败摘要，方便直接修 CLI、登录、代理或 Runner。

设置页的“运行一次自动开发”会立即执行一次无人值守流程：先扫描已有 `daily_dev` 任务的交付缺口并自动续跑，再导入群聊共享文档为 ready backlog，最后批量派发待认领需求给主 Agent。运行结果会显示续跑、导入、派发、入队和失败数量；如果任务已创建但执行通道阻塞，会直接给出恢复动作。这个入口适合在刚上传业务文档后立即接活，或在等待定时任务触发前手动跑一轮。

设置页的“启用定时接活”会自动为可执行开发群聊创建默认定时任务：每 30 分钟触发一次，先续跑交付缺口，再导入共享文档和认领最多 3 条 ready 需求。已有 `daily_dev` 定时任务的群聊不会重复创建；被禁用的同类任务会自动重新启用。

也可以直接调用接口：

```bash
curl -X POST http://localhost:3080/api/orchestrator/daily-dev-autopilot/ensure-cron \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "*/30 * * * *",
    "backlog_batch_limit": 3,
    "gap_continue_limit": 3
  }'
```

定时任务里的 `daily_dev` 工作流也会执行同样的续跑优先级：触发时默认先把未完成任务报告里的阻塞、缺失验证、失败验证和项目验证命令缺口交回主 Agent 返工，然后再认领新的 ready 需求。创建定时任务时可以关闭“触发时自动续跑未完成缺口”，或调整每次最多续跑的缺口任务数。

`daily_dev` 定时任务创建的任务会固定走群聊主 Agent 闭环：任务目标是 coordinator，`workflow_type=daily_dev`，并要求主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 复盘、实际变更和已执行验证。定时任务提示词、Cron 表达式和认领到的 backlog 文档会写入任务级业务/接口文档，因此主 Agent 首轮计划会把定时派来的业务要求当作文档依据处理。

`/api/orchestrator/diagnostics` 的 `agent-process.detail.externalRunner` 会给出可直接排查的信息：

- `active`：外部 Runner 是否仍在线。
- `pending_requests`：还有多少未被 Runner 处理的请求。已写入 result 的请求不会再计为 pending。
- `last_result.command`：最近一次实际执行的 CLI 命令，例如 `claude --permission-mode acceptEdits -p` 或 `codex -q`。
- `last_result.error`：最近一次失败原因。
- `last_result.hint`：系统根据错误生成的修复建议。
- `fix_actions`：系统根据 `spawn EPERM`、CLI 未安装、登录失败、`ConnectionRefused` 等错误生成的可执行恢复步骤；同一组动作也会写入探针状态和阻塞任务的执行通道提示。

只有当 `Agent CLI 进程能力` 通过，并且真实试运行任务能产生主 Agent 派发证据、目标 Worker 通知和实际文件变更时，才应认为这台机器具备“主 Agent 派发、子 Agent 写码、主 Agent 验收”的真实闭环能力。

`daily_dev` 任务的执行准入比普通任务更严格：Node 能启动子进程只代表底座可用，不代表子 Agent CLI/API 一定能连上模型。系统会要求 `Agent CLI 连通探针` 在近期真实成功后，才允许业务开发任务入队、续跑或自动驾驶派发；否则任务会停在待执行并提示先点击“复检执行通道”。自动驾驶在缺少执行准入时只会导入共享文档到需求池，不会认领 ready backlog 或创建执行任务，避免需求被提前消费。

系统设置页还可以点击“运行闭环演练”。演练不会创建真实任务，也不会修改业务仓库；它会用当前群聊和项目配置模拟一次业务开发闭环，验证任务模板、主 Agent 首轮计划、返工工作单、子 Agent 回执、`task-notification`、协作 scratchpad、主 Agent 复盘、实际文件变更门禁和交付摘要能否连起来。

也可以直接调用接口：

```bash
curl http://localhost:3080/api/orchestrator/daily-dev-rehearsal
```

如果要验证真实执行链路，可以在同一页点击“创建真实试运行任务”。这个入口会选择一个具备可写工作目录的开发子 Agent，创建一条 `daily_dev` 群聊任务并默认入队。任务会要求主 Agent 做计划并派发给该子 Agent，只新增或更新项目内的 `ccm-daily-dev-smoke.md`，并通过 Worker 通知、子 Agent 回执、主 Agent 复盘和系统实际文件变更捕获来完成验收。

也可以直接调用接口：

```bash
curl -X POST http://localhost:3080/api/orchestrator/daily-dev-smoke-task \
  -H "Content-Type: application/json" \
  -d '{
    "auto_execute": true,
    "smoke_file": "ccm-daily-dev-smoke.md"
  }'
```

试运行任务会真实修改目标子 Agent 项目里的 smoke 文件，因此适合在接入新开发群聊、新模型配置或新机器后做一次端到端验收。它不应手动标记完成；如果主 Agent 或子 Agent 没有给出足够证据，任务会停在继续推进状态。

创建后可以刷新“真实试运行状态”，系统会检查最近一次 smoke 任务是否满足端到端证据：任务已完成、目标 smoke 文件存在、主 Agent 派发给目标子 Agent 的 assignment evidence、目标子 Agent 的 `task-notification`、系统捕获实际文件变更、子 Agent `done` 回执、主 Agent 最终复盘、已执行验证记录和项目验证命令证据。也可以直接调用接口：

```bash
curl http://localhost:3080/api/orchestrator/daily-dev-smoke-status
```

查询指定任务：

```bash
curl "http://localhost:3080/api/orchestrator/daily-dev-smoke-status?task_id=任务 ID"
```

## 业务任务写法

推荐任务描述包含这些信息：

```text
业务目标：
实现订单退款审核功能。

范围：
- 后端新增退款审核接口
- 前端订单详情页增加审核入口
- 需要权限校验和操作日志

文档/验收：
- 接口路径、字段、状态流转按共享文件 refund-prd.md
- 自测后说明修改文件、验证命令和风险
```

在“任务派发”页优先使用“业务开发任务”入口，填写业务目标、开发范围、业务/接口文档、验收标准和约束。这个入口会自动生成主 Agent 工作单，并交给群聊协调者入队执行。默认勾选“写入群聊需求池”时，系统还会在目标群聊共享文件中生成一份 `backlog-*.md`，状态为 `ready`，后续主 Agent 和定时开发任务都能读取这份业务上下文。

任务进入群聊队列时，系统会把业务目标、验收标准、关联文档、代码变更门禁和验证门禁整理成统一的“主 Agent 业务开发工作单”。主 Agent 不能只按标题聊天式回复，必须按工作单拆分子 Agent 任务，并在最终复盘里覆盖实际变更和已执行验证。

主 Agent 的编排协议按 Claude Code Coordinator/Worker 思路设计：主 Agent 先自己完成需求理解和计划，不直接写代码、不读取项目文件、不运行命令；复杂、跨项目、文档型或实现型需求默认采用 `research_synthesis_implementation_verification` 策略，计划会显式包含“研究与综合”阶段，避免把理解责任转嫁给 Worker。它会把计划拆成自包含的 Worker 工作单，写明需求理解、文档依据、职责边界、交付物、验证要求、依赖关系和 `CCM_AGENT_RECEIPT` 回执要求。子 Agent 只负责各自项目里的研究、实现、验证和回执，主 Agent 再根据证据综合验收。

子 Agent 每次完成后，系统会把结果封装成类似 Claude Code 的 `<task-notification>` 通知再交给主 Agent 复盘：`task-id` 标明 Worker，`status` 标明 completed/failed/blocked/partial/missing_receipt，`receipt-status` 标明 `CCM_AGENT_RECEIPT` 的状态，`result` 保存 Worker 结果摘要。主 Agent 的验收会优先读取这个通知和结构化回执；缺回执、非 done 状态、缺验证证据或缺项目验证命令时，会自动生成返工工作单。

系统还会把 Worker 通知写入群聊协作 scratchpad。后续子 Agent 的任务记忆包会带上最近的“自己 Worker 通知”和“其他 Worker 通知”，包括状态、摘要、文件、验证和阻塞点；这样前置 Agent 已确认的接口契约、字段、失败原因和验证结果不会只停留在聊天记录里，主 Agent 也能基于这份 ledger 做综合和返工。

规则兜底主 Agent 也会从用户消息、群聊上下文和共享文件正文中提炼接口、字段、状态流转、业务规则和验收标准，并把这些“文档依据/验收关注”写入每个子 Agent 工作单。也就是说，即使主 Agent 大模型 API 暂时不可用，接口文档或 PRD 里的关键条目仍会进入子 Agent 的执行上下文，而不是只留下“按文档实现”这种空任务。

配置了 LLM 主 Agent 时，系统仍会保留同一套规则提炼作为保护层：如果模型返回的 JSON 漏掉 `documentFindings`，主 Agent 会把共享文档里的接口、字段和验收摘要合并回分析结果，再派发给子 Agent。

可以用下面的回归命令验证规则主 Agent 是否仍满足“需求 -> 计划 -> 自包含子任务”的基本协议：

```bash
npm run test:coordinator
```

这个回归会同时检查：主 Agent 首轮计划、结构化 assignments 执行入口、LLM 漏文档字段时的规则保护、`daily_dev` 定时任务协议、任务级业务/接口文档上下文，以及主 Agent 返工工作单协议。

`/api/orchestrator/diagnostics` 和“运行闭环演练”也会检查同一套 Coordinator 协议，确认主 Agent 能生成多阶段计划、派发子 Agent，并把首轮工作单和返工工作单都写成子 Agent 可独立执行的上下文。自检中的“Worker 通知与协作 scratchpad”会额外确认子 Agent 输出能封装成 `task-notification`、缺回执能触发返工、Worker ledger 能进入后续上下文。

即使没有配置 LLM 主 Agent，规则主 Agent 也会执行基础复盘：缺少 `CCM_AGENT_RECEIPT`、回执不是 `done`、缺少已执行验证、验证失败或没有覆盖项目验证命令时，会生成明确的返工追问任务，而不是只做自然语言总结。

返工任务也会按主 Agent 工作单格式派发：包含返工轮次、同 Worker 续跑语义、上一轮 Worker 通知摘要、原始需求、初始协调计划摘要、返工原因、本次补充任务、验证要求和必须再次提交的 `CCM_AGENT_RECEIPT`。返工 assignment 会带上 `continuationOf` 和 `continuationStrategy=same_worker_scratchpad`；系统派发时会把该 Worker 最近的 scratchpad 注入提示词，并明确要求承接上一轮结果补齐缺口，不要重复已完成且有证据的工作。这样子 Agent 在第二轮、第三轮返工时仍能看到完整上下文，不会只收到一句“补一下验证”。

交付摘要和任务报告会展示“返工证据”：包括主 Agent 第几轮验收后生成了返工工作单、派给哪个子 Agent、返工原因和任务摘要。这样用户能确认主 Agent 是否真的追着缺口继续协调，而不是只在内部状态里标记等待。

对接口文档、字段契约、前后端联调或 API 对接类需求，规则主 Agent 会自动选择 `backend_first`，先让后端/服务端 Agent 确认接口契约，再让前端/客户端 Agent 依赖该结论对接。依赖任务执行时，系统会把前置 Agent 输出作为“前置 Agent 输出”注入后续子 Agent 工作单，避免各端并行猜字段。

如果前置 Agent 返回 failed/blocked/partial/missing_receipt，或回执状态不是 `done`，系统不会继续执行依赖它的下游子 Agent。下游任务会生成一条 blocked `task-notification` 和 `CCM_AGENT_RECEIPT` 进入交付摘要与 scratchpad，提示主 Agent 先返工前置 Agent，再继续后续对接；这可以避免后端接口契约失败时前端继续猜字段。

即使用户只写“按这个文档做”这类短消息，规则主 Agent 也会读取任务级文档和共享文档里的接口、字段、页面和验收线索来决定路由与执行顺序；只要文档体现前后端接口契约，就会按 `backend_first` 组织子 Agent。

主 Agent 派发给子 Agent 的每一条队列子任务，都会自动附带原始业务目标、全局验收标准和关联文档摘要。这样即使主 Agent 的 @ 子任务写得较短，子 Agent 仍能看到完整业务背景，并按全局验收标准完成实现、验证和回执。

业务开发任务入口会做需求质量检查：业务目标、开发范围、业务/接口文档、验收标准会被评分。信息不足时系统会提示缺口，避免主 Agent 拿到过于空泛的需求后错误拆分；紧急小需求仍可确认后继续创建。

如果业务开发任务已经创建成功，对应的需求池文件会立刻绑定任务 ID 并进入 `queued` 状态，避免定时任务重复认领同一条需求。任务进入执行、完成或阻塞后，需求池状态会继续同步为 `in_progress`、`done` 或 `blocked`。

“任务派发”页的“需求池”按钮可以查看所有业务开发 backlog 的状态。对 `ready`、`blocked` 或 `failed` 的需求，可以直接点击“立即派发”，系统会把该需求转成一条 `daily_dev` 任务交给主 Agent；如果执行通道暂不可用，任务会保留为待执行状态，需求池会记录对应任务和阻塞原因。

如果你已经把 PRD、接口说明或业务描述上传到了群聊共享文件，可以在“需求池”里点击“导入共享文档”。系统会把未导入过的文本/Markdown 文档转换成标准 `backlog-*.md`，状态为 `ready`，随后可由定时任务自动认领，或点击“批量派发待认领”交给主 Agent。

通过业务开发任务表单直接粘贴的业务/接口文档，也会作为“任务级业务/接口文档”注入主 Agent 的文档上下文。主 Agent 首轮计划和空派发修复都会读取这部分内容，并把相关接口、字段、业务规则或验收要求写进子 Agent 工作单。

需求池也支持“批量派发待认领”：系统会按优先级和创建时间选择 `ready` 需求，批量创建 `daily_dev` 任务，并交给任务队列逐个执行。这个入口只会处理可执行开发群聊里的待认领需求，避免把没有子 Agent 工作目录的需求派发成空任务。

任务执行结束后，系统会把交付摘要写回对应开发群聊：完成时展示实际文件变更、验证记录和报告摘要；失败或等待补充时展示阻塞点和仍需补充的信息。即使没有配置飞书通知，也能在群聊记录里看到主 Agent 的交付反馈。

任务页的“报告”弹窗会展示“Agent 执行证据”：包括每个子 Agent 的 `task-notification`、结构化回执状态、动作、文件、验证记录、阻塞项，以及主 Agent 的最终复盘。日常接活时建议优先看这块，确认不是只有文本回答，而是已经形成可验收的代码变更证据。

报告还会展示主 Agent 的派发证据、依赖证据和续跑证据。派发证据说明主 Agent 实际给哪些子 Agent 下发了工作单；依赖证据说明哪些任务等待前置 Agent；续跑证据说明返工是否沿用 `same_worker_scratchpad` 回到同一个 Worker。这样用户可以直接检查主 Agent 是否真的在协调，而不是只输出自然语言总结。

报告里的“参与 Agent”会合并结构化回执、`task-notification` 和主 Agent 派发证据。即使某个 Worker 缺少 `CCM_AGENT_RECEIPT`，只要它产生了 Worker 通知或被主 Agent 派发过，也会出现在参与列表和缺口证据里。

如果报告里出现阻塞、待补充或未完成回执，可以点击“按阻塞项继续”。系统会把阻塞项、子 Agent 回执和主 Agent 复盘整理成继续执行草稿，用户只需要补充缺失业务信息或确认返工方向，再提交给主 Agent 继续派发。

任务日志会记录子 Agent 执行轨迹，包括主 Agent 派发给哪个子 Agent、工作单摘要、回执状态、文件/验证数量、缺失回执和执行失败原因，便于排查为什么任务没有完成。

主 Agent 在单次派发前也会重新校验目标子 Agent 的运行时：目标必须仍在当前开发群聊中，必须能解析到项目配置，工作目录必须存在且可读写。校验失败时不会进入“执行中”，系统会生成一条失败 `CCM_AGENT_RECEIPT`、写入群聊系统消息和任务日志，并把阻塞项放进报告，方便用户修好配置后点击“按阻塞项继续”。

也可以直接调用接口：

```bash
curl -X POST http://localhost:3080/api/tasks/create-daily-dev \
  -H "Content-Type: application/json" \
  -d '{
    "title": "订单退款审核功能",
    "group_id": "你的开发群聊 ID",
    "business_goal": "实现订单退款审核功能",
    "scope": "后端新增审核接口，前端订单详情页增加审核入口",
    "documents": "按共享文件 refund-prd.md 的字段和状态流转",
    "acceptance": "子 Agent 提供回执；主 Agent 输出最终报告",
    "persist_documents": true,
    "auto_execute": true
  }'
```

普通任务仍可选择“群聊”，并开启“创建后立即加入执行队列”。主 Agent 会先理解需求和共享文件，再生成子 Agent 工作单。

## 定时开发任务

在“定时任务”里选择目标为“群聊”，提示词可以写：

```text
请检查共享文档 backlog.md 中优先级最高、状态为 ready 的需求，按主 Agent 工作流拆给子 Agent 开发。
要求：不能跳过验收标准；完成后输出最终报告；阻塞时说明需要用户补充什么。
```

触发后系统会自动创建任务并进入同一套任务队列。定时任务如果选择“业务开发任务”工作流，会自动写入 `workflow_type=daily_dev`，因此同样适用主 Agent 协调计划、派发证据、Worker 通知、子 Agent 回执、主 Agent 复盘和实际文件变更门禁。通过业务开发任务入口沉淀的 `backlog-*.md` 会作为群聊共享文件进入主 Agent 上下文，适合让定时任务按 `ready` 状态持续派发日常开发需求。

当目标群聊存在状态为 `ready` 的 `backlog-*.md` 时，定时任务会优先认领优先级最高、创建时间最早的需求，把它转成具体业务开发任务，并把共享文件状态改为 `queued`。业务开发定时任务默认会在认领前自动导入未处理过的群聊共享文档，把 PRD、接口说明或业务描述转换成 `ready` backlog；如果只想处理人工整理过的需求，可以在定时任务创建弹窗里关闭“触发时自动导入群聊共享文档”。默认每次触发认领 1 条；在定时任务创建弹窗里可以设置“每次认领需求数”，让一次触发批量创建多条 `daily_dev` 任务并交给队列逐个执行。任务进入执行中会回写 `in_progress`；完成后回写 `done`；失败或等待补充时回写 `blocked`，避免下次定时触发重复派发同一条需求。

定时任务列表会在“运行记录”里显示上次触发导入了多少共享文档、认领了多少需求，并把同样的摘要写入 `last_result`/`last_run_meta`，方便确认无人值守任务是否真正接到了业务输入。

如果目标群聊没有 `ready` 需求，`daily_dev` 定时任务会跳过本次触发，不创建空任务。这样无人值守时不会不断产生没有业务目标的泛任务。确实需要让定时任务在没有结构化需求池时仍执行提示词扫描，可以在定时任务配置中显式设置 `run_without_backlog=true` 或 `allow_empty_run=true`。

定时任务创建弹窗里也提供“套用日常开发模板”，会自动切到群聊协作目标、选择“业务开发任务”工作流、开启“完成时必须有实际代码变更”，并填入适合 backlog/共享文档轮询的提示词。

## 完成判定

子 Agent 必须在回复末尾提供 `CCM_AGENT_RECEIPT`。任务队列会优先使用回执和主 Agent 复盘状态，而不是只看自然语言里有没有“完成”。

系统派发给子 Agent 的工作单会附带“子 Agent 开发契约”：限定项目职责、完成条件、实际文件变更要求、验证记录规则、阻塞处理方式和回执字段。子 Agent 不应把未运行的测试、未修改的文件或建议事项写成已完成证据。

子 Agent 开发契约会尽量附带项目验证建议。系统会优先读取项目额外配置里的 `verification_commands`、`test_commands` 或 `check_commands`；没有显式配置时，会根据工作目录里的 `package.json`、`pom.xml`、Gradle、Python、Go、Rust 等项目文件推断常见验证命令。子 Agent 可以根据改动范围选择最小必要验证，但写入回执的 `verification` 必须是实际执行过的命令或人工核验结果。

在“项目管理 -> 项目工具配置”里可以为每个项目填写“项目验证命令”，每行一条，例如 `npm run check`、`npm test`、`npm run build`。这些命令会保存到项目配置的 `verification_commands`，并优先注入子 Agent 开发契约。

daily_dev 完成门禁会检查子 Agent 回执是否覆盖项目配置的验证命令。若项目配置了验证命令，done 回执必须在 `verification` 中写明实际运行过的命令和结果，或明确写出人工核验结果；只写“建议运行”不会通过验收。

“系统设置 -> 日常开发闭环自检”会展示“项目验证命令”检查项，并在“自动开发状态”里统计验证命令的手动配置、自动推断和缺失数量。缺失不一定阻止接单，但会降低自动验收可靠性；建议为核心项目显式配置验证命令。

如果自检显示存在“验证推断”，可以在“系统设置 -> 自动开发状态”点击“初始化验证命令”。系统会把可推断的命令写入尚未手动配置的项目，不覆盖已有配置。

当业务文档没有明确写前端、后端或具体项目时，LLM 主 Agent 和规则回退主 Agent 都会优先把实现类/PRD 类需求派给可执行项目 Agent 先按职责判断影响范围；缺失信息会作为风险和待确认项写进工作单，而不是直接让任务停在追问。

任务状态含义：

- `done`：主 Agent 或子 Agent 回执证明已完成，并写入最终报告。
- `in_progress`：已经执行但仍缺回执、验证、用户信息或返工结果。
- `failed`：Agent 调用失败、执行失败或明确返回失败回执。

对“业务开发任务”还有额外完成门禁：必须有主 Agent 协调计划、派发给目标项目子 Agent 的 assignment evidence、目标 Worker 的 `task-notification`、至少一个项目子 Agent 的 `CCM_AGENT_RECEIPT`、主 Agent 最终复盘，并且默认必须有系统实际捕获到的代码/配置/文档文件变更和已执行验证记录后，系统才允许判定为完成。只有主 Agent 给出建议、方案或自然语言总结时，任务会保持继续推进状态，避免把“说了”误判成“做完了”。

业务开发任务还会检查验证证据。子 Agent 的 `verification` 里必须至少有一条可采信的已执行验证记录，例如实际运行过的构建、类型检查、测试、lint、接口自测或人工核验结果。仅写“建议运行”“未运行”“待运行”的验证不会通过完成门禁；如果验证记录包含失败、报错或未通过，主 Agent 会继续返工追问相关子 Agent，而不是把任务报告为完成。

如果某个业务任务只是调研、方案评审或排查，不需要改代码，可以在“业务开发任务”弹窗里关闭“完成时必须有实际代码变更”。关闭后仍然要求子 Agent 回执和主 Agent 复盘，但不会用文件变更作为完成门禁。

在“任务派发”页可以查看：

- 报告：用户交付报告、交付摘要、完整执行输出、结构化回执、主 Agent 复盘。用户交付报告会汇总业务目标、需求来源、参与 Agent、实际文件变更、验证记录、缺失项和生成时间；任务完成后会写入群聊交付消息，并用于飞书完成通知摘要。
- 日志：队列入队、Agent 调用、状态变更和错误信息。
- 恢复队列：服务重启或任务卡住后，恢复可继续执行的自动任务。
- 任务看门狗：持续检测自动任务是否卡在待入队或执行中断状态，并可手动恢复。

交付摘要会从子 Agent 回执和主 Agent 复盘中归纳：

- 交付状态：已完成、仍需继续、执行失败。
- 参与 Agent：实际参与开发或验收的项目 Agent。
- 文件变更：子 Agent 回执声明的变更文件，并合并系统从工作区实际捕获到的变更路径。
- 实际文件变更：队列和手动执行会记录 Agent 执行前后的 git 工作区变化；群聊任务会按 `task_id` 只汇总本任务的子 Agent 变更。
- 验证记录：已运行或建议运行的验证命令/检查。
- 已执行验证：系统会从回执中区分已执行验证、建议/未执行验证和失败验证；业务开发任务必须有已执行验证才能完成。
- 阻塞/待补充：仍需用户、其他 Agent 或外部系统提供的信息。

## 补充信息后继续执行

当任务状态停在 `in_progress`、`failed` 或报告里提示“需要用户补充”时，不需要重新创建任务。可以在“任务派发”页点击任务卡片上的“补充”，写入接口字段、业务规则、验收确认或返工方向。系统会把补充说明追加到同一个任务上下文里，清空旧的临时报告，并重新交给主 Agent 入队继续执行。

也可以在任务报告弹窗里点击“按缺口自动继续”。系统会由后端根据当前交付摘要自动整理主 Agent 协调计划缺口、派发证据缺口、Worker 通知缺口、阻塞点、缺失验证、失败验证、项目验证命令缺口和上一轮 Worker 通知，作为补充说明交回主 Agent 并重新入队；这个能力也暴露为接口，方便自动驾驶或定时流程复用。若交付摘要里存在 failed/blocked/partial/missing_receipt 的 `task-notification`，系统会把它识别为可续跑缺口，并在 continuation 草稿里写明同 Worker 续跑目标和 `continuationStrategy=same_worker_scratchpad`，让主 Agent 优先把返工派回相关子 Agent。

也可以直接调用接口：

```bash
curl -X POST http://localhost:3080/api/tasks/continue \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "任务 ID",
    "message": "补充：退款审核通过后需要写入操作日志，并通知前端刷新订单状态。",
    "auto_execute": true
  }'
```

按报告缺口自动生成返工说明并继续：

```bash
curl -X POST http://localhost:3080/api/tasks/continue-from-gaps \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "任务 ID",
    "auto_execute": true
  }'
```

## 队列看门狗

服务启动后会自动启动任务看门狗。它只处理 `auto_execute=true` 且没有暂停的任务：

- `pending` 但没有进入内存队列的任务，会重新入队。
- `in_progress` 但当前进程没有运行记录的任务，会恢复为 `pending` 并重新入队。
- `daily_dev` 任务如果已经产生交付摘要，但卡在阻塞、缺失验证、失败验证或项目验证命令缺口上，看门狗会在执行通道可用、近期 Agent CLI 探针真实成功且冷却时间到达后，自动生成缺口续跑说明并重新入队。
- 正在执行且仍在当前进程里的任务不会被打断，只会在看门狗状态里显示为长时间运行。

缺口续跑有次数保护，默认单个任务最多自动续跑 3 次；执行通道不可用时只会在状态里显示候选任务，不会清空已有交付摘要或强行入队。

查看状态：

```bash
curl http://localhost:3080/api/tasks/watchdog
```

手动触发恢复：

```bash
curl -X POST http://localhost:3080/api/tasks/watchdog/resume
```



