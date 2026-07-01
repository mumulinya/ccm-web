# CCM 执行可靠性与权限一致性 12.0

完成日期：2026-07-01

## 目标与结果

本轮把“CCM 声明可以执行”改为“底层 Agent 实际证明可以执行”。开发任务准入会验证真实 CLI、项目内写入和 native session 续跑；权限漂移、认证失败或执行器超时时保留任务现场、重建会话并尝试备用执行器。普通聊天、知识问答、项目介绍和分析请求不会再创建开发任务。

## 主要实现

### 1. 权限握手与恢复

- `backend/modules/collaboration.ts`
  - Agent 探针创建唯一 `.ccm-permission-probe-*.tmp`，要求底层 Agent 写入随机 token，宿主核验后自动清理。
  - 探针状态持久化 `capabilities.write`、filesystem 和 native session 两轮结果，避免“实时通过、落盘后丢权限证据”。
  - 项目默认执行器失败时，可使用同项目近期通过真实写入探针的备用执行器完成准入。
  - 增加 `/api/tasks/reconcile-delivery`，使用持久化回执、文件变更和验证证据重新验收旧任务，无需重复执行实现工作。
- `backend/task-agent-sessions.ts`
  - 权限漂移会废弃污染的 native session ID，保留历史并创建新会话；最终验收或明确取消前不关闭会话。
- `backend/collaboration-resilience.ts`
  - 401/403、Invalid API Key、provider、timeout、sandbox read-only 会进入执行器恢复判定。
- `backend/agent-runtime.ts`
  - Codex 显式使用 `--sandbox workspace-write`，不依赖 `--full-auto` 的宿主默认解释。

### 2. 意图与任务边界

- `backend/modules/group-orchestrator.ts`
  - 只有明确的修改、实现、创建、运行、派发等动作请求允许进入开发调度。
  - 普通问答、项目介绍、架构说明和原因分析强制 `direct_answer`，assignment 数量为 0。
  - 主 Agent API 失效时，信息咨询安全降级为直接项目概览，不暴露 API 错误、共享文档注入文本或内部协议，也不凭关键词制造 README 修改任务。

### 3. 任务和会话治理

- 创建任务时对同群、同项目、同工作流和相同业务目标做时间窗去重。
- `backend/modules/usability.ts` 每 6 小时治理一次：
  - 30 天终态任务自动归档；
  - 24 小时未确认的执行卡自动归档；
  - 终态、孤立和长期不活跃的 Agent 会话自动关闭；
  - 操作写入 `task-governance-audit.jsonl`。
- 历史误建任务 `mr0qr5jn26i3` 已实际取消，运行进程和会话被终止，新任务随后自动接棒。

### 4. 用户视图

- 群聊和任务页默认只展示状态、交付、验证、风险和下一步。
- coordination plan、Trace、session、receipt、reasoning、scratchpad 和执行器原始回执收进“技术详情”。
- 普通用户回复不再输出意图置信度、授权依据和内部验收协议。

### 5. 凭据保护

- 新增 `backend/credential-store.ts`，使用本机 AES-256-GCM 私有存储和 `ccm-secret://` 引用。
- 项目 TOML、控制机器人 TOML、全局飞书 JSON 及其备份均只保留引用；启动子进程时临时物化私有配置并自动删除。
- `/api/security/credentials/status` 与 `/api/security/credentials/migrate` 提供状态和迁移入口。
- 实测：6 个项目配置、控制机器人配置、全局飞书配置及备份的明文凭据计数为 0；加密存储共 7 条凭据。
- 已迁移过的历史密钥仍建议在对应服务端轮换一次。

### 6. Claude / Codex / Cursor 权限矩阵

| Runtime | CLI/读取 | 项目写入 | native session | 当前结果 | 系统处理 |
|---|---:|---:|---:|---|---|
| Cursor | 通过 | 通过 | 两轮续跑通过 | 可执行 | 作为 E2E 实际执行器 |
| Codex | CLI 可启动 | 当前失败 | 未进入有效续跑 | 统一网关返回 401，旧配置曾报告 read-only | 记录真实失败并自动切换 Cursor；命令已显式 workspace-write |
| Claude | 可捕获 session ID | 当前超时未写入 | 首轮未完成 | 不误报成功 | 超时分类并切换备用执行器 |

负向结果是矩阵的一部分：系统不会再把能启动 CLI 等同于能修改项目。任务只需同项目存在一个已通过写入握手的安全执行器即可继续，失败执行器仍保留诊断状态。

### 7. 前端按需加载

- `frontend/src/App.vue` 使用 `defineAsyncComponent` 动态加载 ProjectManager、GroupChat、TaskManager、GlobalAgent、MemoryCenter 等重页面。
- Vite 最终产物拆分为独立页面 chunk；主入口约 104 KB（gzip 约 40 KB），不再首次加载全部页面实现。

## 真实 E2E 证据

测试群：`Agent 协作 E2E 实验室`

任务：`mr1qxtgza745`（可靠性12.0真实执行闭环验收）

- 群组执行准入：2/2 项目可执行；`collab-lab-api` 通过 Cursor fallback，`collab-lab-web` 直接使用 Cursor。
- 主 Agent 派发 `collab-lab-web`，底层 Agent 实际创建 `ccm-reliability-12-smoke.md`。
- 捕获真实文件变更、Worker notification、done receipt 和主 Agent complete review。
- Agent 与独立 Runner 均执行 `npm test`、`npm run check`；任务记录 5 条以上验证证据。
- 持久化交付复核结果：`status=done`，acceptance gate 0 项失败。
- Cursor native session ID 在 4 轮返工中保持一致，最终验收后状态为 `closed`。
- 明确取消旧任务的进程树已终止；权限握手临时文件残留数为 0。
- 返工阶段产生的重复 frontend smoke 文件已清理，保留任务原始目标文件作为 E2E 交付物。

## 最终验证

- `npm run check`：通过。
- `npm run build:backend`：通过。
- `npm run build:frontend`：通过，68 modules transformed，页面 chunk 已拆分。
- `npm run test:coordinator`：通过，输出 `ok: true`。
- `/api/orchestrator/resilience`：self-test pass。
- `/api/reliability/self-test`：pass。
- 信息咨询测试：`dispatchPolicy.action=direct_answer`，delegated=0，assignments=0。
- 凭据扫描：plaintext config secrets=0。
- 权限探针现场：residual probe files=0。

## 运维提示

- Codex 的 CCM 统一网关 Key 当前已失效，应在设置页更新或轮换；在更新前任务会自动使用已通过探针的 Cursor，不要求用户手工补写文件。
- Claude 当前通道曾出现 180 秒超时，应以新的真实写入探针结果决定是否恢复为首选执行器。
- 技术详情保留用于诊断，但默认用户视图不应展开或直接发送到群聊。
