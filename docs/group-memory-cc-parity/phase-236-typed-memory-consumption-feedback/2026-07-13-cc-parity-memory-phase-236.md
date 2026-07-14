# CCM Memory CC Parity Phase 236

## 阶段目标

让群聊会话的类型化记忆不只按文本相关性召回，还能使用项目子 Agent 的真实消费证据持续校准排序，同时保持严格的会话隔离：

- 每个 `groupId::gcs_*` 使用独立消费账本。
- 只接受与当前任务、群聊会话、快照、投递回执和文档校验和一致的证据。
- 支持 `used`、`verified`、`ignored` 三种消费状态。
- 文档变化、证据篡改、跨会话复用和过期记录均 fail closed。
- 项目子 Agent 只接收所属群聊当前会话记忆。
- Global Agent 只使用全局记忆与路由状态，不接收群聊会话正文。
- 旧群聊会话直接删除，不迁移。

## Claude Code 对照结论

Claude Code 的记忆使用不是把全部历史原样塞进上下文，而是先维持稳定入口，再根据当前任务加载相关内容。CCM Phase 235 已具备自然语言语义召回，但仍缺少一条闭环：子 Agent 实际采用、核验或明确忽略某条记忆后，下一次召回没有可信反馈。

Phase 236 增加带来源绑定和校验和的消费反馈层。它只调整相关记忆候选的软排序，不覆盖路径条件、强制召回、ignore-memory、会话边界、压力策略或当前来源核验。

## 实现内容

### 1. 会话独立消费账本

每个类型化记忆会话目录新增：

```text
.typed-memory-consumption-ledger.json
```

账本绑定 `groupId--gcs_*` 类型化范围并保存整体校验和。读取时逐条校验，返回可信、无效、过期和文档已变化记录数量；账本损坏时不参与召回评分。

### 2. 可信消费证据

项目子 Agent 回执支持 `typedMemoryUsage`，每条记录包含文档相对路径、消费状态和当前来源核验状态。系统只有在以下证据全部一致时才写入账本：

- 当前任务与项目子 Agent 会话。
- 当前群聊 `groupId::gcs_*`。
- Memory Context Snapshot ID 与 checksum。
- 投递回执 checksum。
- WorkerContextPacket 与 Session Memory binding。
- 本轮实际下发文档 checksum。

篡改快照、错误会话、错误文档或缺失投递证据不会产生排名反馈。

### 3. 衰减和评分

消费记录使用 30 天半衰期，90 天后视为 stale 并停止评分：

- `verified`: `+6`
- `used`: `+4`
- `ignored`: `-5`
- 单文档调整范围：`+8/-10`

同一文档同时存在正向和负向证据时标记 `conflict=true`，本轮调整归零，要求根据当前任务重新判断，不能用历史多数票替代模型判断。

文档 checksum 变化后，旧消费记录仍保留用于审计，但不再作用于新版本文档。

### 4. 子 Agent 投递闭环

任务回执解析器把 `typedMemoryUsage` 转为标准消费行，并写入当前群聊会话账本。投递摘要同时记录消费状态、证据校验结果和账本元数据，便于后续审计与故障定位。

### 5. Memory Center 可观测性

群聊会话的“压缩边界”页新增“类型化记忆消费反馈”：

- 账本 trusted/invalid 状态。
- 可信、无效、stale、文档已变化记录数量。
- used、verified、ignored 总量。
- 加权、降权和冲突文档数量。
- 最近消费记录和相关诊断。

界面不展示记忆正文、查询正文或回执原因，只暴露会话范围内的诊断元数据。

### 6. 删除不可恢复

`purgeTaskAgentSessions` 现在删除当前任务子 Agent 会话和快照后，会同步刷新 `task-agent-sessions.json.bak`。已删除会话不能在主存储损坏时从旧备份复活。

Phase 236 自测也会删除自身的任务会话、快照、群聊消息、Session Memory、压缩边界、reload 和全局仲裁运行时目录，避免回归测试污染 Memory Center。

## 会话边界

生产会话状态：

- `gmps7ha15::gcs_mriu5m33_ahy0yo`
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`

三个群聊均只有一个当前 `gcs_*`，非当前会话 0，legacy/default 会话 0。没有执行旧会话迁移。

当前生产类型化范围为：

```text
gmps7ha15--gcs_mriu5m33_ahy0yo
```

其消费账本 checksum 有效，可信记录 0，无效记录 0。

## 验证结果

- Phase 236 消费反馈自测：18/18。
- Memory Center 会话隔离自测：9/9。
- Phase 235 自然语言语义召回：20/20。
- Phase 234 投递证据绑定：14/14。
- 类型化记忆上下文、压力修复上下文和全局语义仲裁回归：通过。
- `npm run check`：通过。
- 完整前端、MCP、后端构建：通过。
- 桌面 1440x900：反馈面板 `764x210`，无文档级横向溢出，控制台 0 warning/error。
- 移动 390x844：反馈面板 `298x359`，两列卡片各 `136px`，无重叠和横向溢出，控制台 0 warning/error。
- 回归后当前任务会话残留：0。
- 回归后备份任务会话残留：0。
- 回归后子 Agent 记忆快照残留：0。
- Phase 236 命名运行时路径残留：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`15836`
- HTTP 首页：200。
- 三个生产群聊各保留一个当前会话。
- archived session：0。
- legacy/default session：0。
- Phase 236 测试数据已从当前存储、备份、快照、会话和仲裁目录删除。

## 长期目标状态

长期目标继续保持 active，不在 Phase 236 结束时标记完成。

后续优先方向：将消费反馈接入更多真实第三方 Agent 回执，按 Agent 类型和任务类型校准置信度；继续增强当前来源重新核验、反馈异常检测和可恢复的消费历史压缩，同时保持每群聊、每会话独立及 Global Agent 不读取群聊正文的硬边界。
