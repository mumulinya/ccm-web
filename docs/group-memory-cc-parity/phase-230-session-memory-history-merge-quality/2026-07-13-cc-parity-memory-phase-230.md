# Phase 230：Session Memory 冷启动恢复、合并质量与签名历史

日期：2026-07-13

## 目标

继续对照 Claude Code 的 Session Memory 工作方式，补齐四个生产缺口：后台提炼 executor 在服务冷启动后的恢复、增量摘要不能静默丢失关键事实、每条摘要证据必须能追到原始消息、每次提炼尝试都要进入可校验的追加历史。Memory Center 同时展示合并质量和 extraction 时间线。

## 实现

### 1. Executor 冷启动恢复

`group-session-memory-model-extraction.ts` 新增 pending scope 扫描和恢复调度：

- 服务启动时扫描 `group-memory-sessions`，只恢复合法的 `groupId::gcs_*` scope。
- `model_extraction_due`、失败待重试以及 executor 暂不可用的 scope 都会重新进入调度。
- executor 从未配置变为可用时主动触发恢复，不要求再追加一条群聊消息。
- executor 不可用不会丢任务，scheduler 按独立间隔重试。
- `default` scope 继续 fail closed，不扫描、不创建、不恢复。

### 2. 增量合并质量门禁

新增 `analyzeGroupSessionMemoryModelMergeQuality()`，在模型输出进入 staged commit 前检查：

- `Current State`、`Task specification`、`Worklog` 必须有实际内容。
- 从旧 notes 提取硬约束、未完成事项、反引号符号和文件路径作为 merge anchors。
- 计算 anchor retention、章节填充率和总质量分。
- 没有纠正信号时，任何硬约束丢失都拒绝提交；大量普通 anchor 丢失也拒绝提交。
- 新 transcript 明确包含纠正、取消、替换或 no-longer 语义时，允许新事实取代旧 anchor。
- 质量结果写入 success receipt、failure receipt 和 snapshot，Memory Center 可独立复验。

锚点和模型输出使用相同的格式归一化；下划线、反引号和 Markdown 强调不会再把 `PHASE230_HARD_CONSTRAINT` 一类真实符号误判为丢失。归一化只用于比较，不修改最终 Session Memory 文本。

### 3. 每条消息级 provenance

模型请求审计、section evidence、任务 Agent 会话绑定和 worker receipt 全链路新增 `sourceMessageIds`：

- 每个 Session Memory 章节保存所属原始消息 ID 集合。
- 项目子 Agent 收到 evidence ID、section checksum、transcript checksum 和消息 ID。
- `memoryFactCitations` 在 evidence 提供消息 ID 时必须至少引用一个允许的 ID。
- 引用另一个群聊会话的消息、伪造 ID 或提交空集合都会阻止验收。
- Global Agent 仍不接收群聊 Session Memory 正文或消息级证据。

### 4. 签名追加式 extraction 历史

每个群聊会话新增 `model-extraction-history.jsonl`，记录：

- `attempt_started`
- `committed`
- `failed`
- `deferred`

每个事件绑定 scope、execution、输入来源、消息范围、结果、merge quality、时间和 checksum。读取方逐条复算 checksum；任何损坏都会在 fleet 中计入 invalid，并使对应会话健康状态失败。历史不会被 latest success/latest failure 覆盖。

### 5. Memory Center

Session Memory Fleet 新增：

- merge quality 状态、分数和 anchor retention
- 历史文件、事件总数、有效性和最近状态
- 最近 extraction 时间线
- fleet 级质量通过/失败和历史有效/无效聚合

移动端历史行改为单列、正文允许换行。额外修复了记忆分类筛选和长质量提示把整个页面撑宽的问题：分类按钮只在自己的容器内横向滚动，长英文证据可在卡片内换行。

## Agent 边界

- 群聊主 Agent：只读取当前 `groupId::gcs_*` 会话的 transcript、Session Memory 和历史。
- 项目子 Agent：每次新建第三方 Agent 会话，只注入所属群聊会话的 snapshot 和消息级证据。
- Global Agent：只使用全局记忆、群聊路由和任务状态，不注入任何群聊 transcript 或 Session Memory 正文。
- 多个群聊、同一群聊多个会话、同一会话多个子 Agent 都按 scope/checksum/fencing 独立绑定。

## 验证

- Phase 230 cold recovery/history：8/8。
- 首次提炼的每个章节记录 30 个 `sourceMessageIds`。
- 静默丢失硬约束：拒绝并保留最近成功 snapshot。
- 保留硬约束的更新：提交，anchor retention 100%。
- 显式纠正：允许替换旧 anchor。
- merge scope 历史：3 started、2 committed、1 failed，共 6 条。
- cold scope 历史：1 started、1 committed，共 2 条。
- fleet 历史：8 条，invalid 0。
- Task Agent message citation：9/9，包含跨会话消息 ID 拒绝。
- Phase 229 model extraction：12/12。
- Phase 226 cadence：17/17。
- Phase 227 transaction：11/11。
- Phase 228 delivery/fencing：13/13，12 进程并发通过。
- budget/fleet：12/12。
- Memory Center session scope：5/5。
- boundary journal：14/14。
- resume integration：7/7。
- hot sidecar isolation：14/14。
- model capability cache/recovery/refresh race：全部通过。
- `npm run check`：通过。
- `npm run build`：前端、MCP Feishu、后端全部通过。

并发回归第一次与其他三组测试同时写共享任务会话存储，出现一次测试环境竞争；单独重跑后 13/13 通过，未修改生产并发逻辑。

## 界面验收

- 桌面端 `1280 x 720`：`document.scrollWidth = 1280`，fleet 无越界，控制台 0 warning、0 error。
- 移动端 `390 x 844`：`document.scrollWidth = 390`，Memory Center `scrollWidth = clientWidth = 367`。
- Session Memory Fleet 在移动端宽 346px，`scrollWidth = clientWidth = 346`。
- extraction history 行在 760px 以下单列显示，长 reason 和 checksum 不撑宽页面。

## 旧会话重置

用户明确允许删除旧会话，不做迁移。生产级联接口已删除三个旧空会话及 23 个消息记忆、边界和侧车文件，并自动创建三个新会话：

- `gmps7ha15::gcs_mriu5m33_ahy0yo`
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`

三个新会话均为 0 条消息，不继承旧群聊上下文。Phase 228/230 测试会话和快照残留已清理。

## 生产验收

- 服务：`http://localhost:3081`
- PID：`28340`
- 命令：`"D:\nodejs\node.exe" ccm-package/dist/server.js 3081`
- 群聊：3 个。
- 每个群聊：1 个全新 active `gcs_*` 会话。
- `legacyDefaultSessionCount = 0`
- `budgetExceededCount = 0`
- `modelReceiptInvalidCount = 0`
- `modelExtractionHistoryInvalidCount = 0`
- Phase 228/230 task/session residue：0。

Fleet 当前为 `empty` 是预期状态：旧会话已按用户要求删除，新会话还没有消息，因此不会提前创建摘要或伪造一次提炼。达到 Claude Code 的 10000-token 初始化阈值后才启动真实模型提炼，之后每增加 5000 tokens 并满足自然停顿或 3 次 tool call 条件才更新。

## 后续方向

长期目标保持 active。下一阶段继续对照 Claude Code，优先增强历史事件链的跨文件链式签名、模型提炼输入的 token 预算与降级策略、冲突事实的逐项 supersession 图，以及在 Memory Center 中对任意一次 extraction 做可重放审计。
