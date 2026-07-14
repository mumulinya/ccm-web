# CCM Memory CC Parity Phase 237

## 阶段目标

把类型化记忆的 `verified` 从子 Agent 自报升级为平台可复算的当前源码证明，并隔离重复、冲突、伪造和跨会话反馈：

- 每个 `groupId::gcs_*` 继续使用独立记忆、召回和消费账本。
- `verified` 必须绑定项目目录内当前文件的完整 SHA-256。
- 缺失、伪造、失配或越界的当前源证明降级为 `used`，不能获得核验加权。
- 同一任务、会话、快照、文档观察最多影响排序一次。
- 同一观察的相反状态进入冲突隔离，不参与排序。
- Global Agent 只使用全局记忆与路由信息，不接收群聊会话正文。
- 旧群聊会话直接删除，不迁移。

## Claude Code 对照结论

Claude Code 在 `D:\claude-code\src\memdir\memoryTypes.ts:197-202` 明确要求：记忆会随时间漂移；在基于记忆回答或建立假设前，应读取当前文件或资源重新核验；记忆与当前状态冲突时，以当前观察为准，并更新或删除陈旧记忆。

Phase 236 已建立类型化记忆消费反馈，但允许项目子 Agent 用 `currentSourceVerified: true` 自报当前源核验。这个声明没有证明它真的读取了当前项目文件，也无法抵抗伪造 checksum、路径逃逸或同一观察重复加权。

Phase 237 将 Claude Code 的 recall-side drift caveat 落为服务端证据契约：模型可以声明它使用了什么，但只有平台读取当前项目文件并复算成功，才能判定为 `verified`。

## 实现内容

### 1. 当前源码证明契约

`typedMemoryUsage[].currentSourceEvidence` 支持：

```json
{
  "evidenceType": "file_read",
  "sourcePath": "path/inside/project",
  "sourceChecksum": "full-sha256"
}
```

服务端解析任务所属项目工作目录，拒绝目录穿越和符号链接逃逸，只读取项目目录内普通文件，单文件上限 16 MB，并重新计算完整 SHA-256。只有路径、文件和 checksum 全部匹配时，`verified` 才保留。

### 2. 证据分级与评分

消费反馈现在按证据置信度参与时间衰减评分：

| 证据层级 | 置信度 | 行为 |
| --- | ---: | --- |
| `system_current_source_file_proof` | 1.00 | `verified` 保留，基础调整 `+6` |
| `bound_structured_receipt` | 最高 0.75 | 结构化、完整绑定的使用回执 |
| `bound_text_receipt` | 最高 0.50 | 旧文本回执兼容 |
| surfaced only | 0.25 | 只证明记忆被下发，不能证明使用 |
| `legacy_unproven` | 降权 | v1 历史 verified 仅保留审计价值 |

Phase 236 的 `used +4` 在完整结构化绑定下变为 `+3`，这是 `4 * 0.75` 的预期结果。召回仍先应用时间衰减，再乘证据置信度；证据不会覆盖路径约束、ignore-memory、会话边界或当前任务相关性。

### 3. 降级与异常隔离

以下情况把 claimed `verified` 降为 effective `used`：

- 没有 `currentSourceEvidence`。
- 证明类型不是 `file_read`。
- 路径不在当前项目内，或经符号链接解析后逃逸。
- 文件不存在、不是普通文件或超过 16 MB。
- checksum 格式无效或与平台复算结果不一致。

消费账本 v2 同时保存 claimed/effective state、证据层级、置信度、证明元数据和 anomaly code。Memory Center 只显示聚合诊断，不显示源码路径、回执原因、查询文本或记忆正文。

### 4. 观察去重与冲突隔离

排序影响使用稳定 observation identity，绑定任务、任务子 Agent 会话、Memory Context Snapshot 和文档。结果为：

- 相同观察重复上报时只保留一次排序影响，即使 reason 或回执文本改变也不会重复加权。
- 同一观察先后上报相反状态时拒绝第二次写入并标记冲突。
- 跨群聊会话、错误快照、错误投递 checksum 或错误文档 checksum 继续 fail closed。
- v1 账本继续使用 v1 checksum 规则读取，升级后不会把历史账本误判为篡改。

### 5. Memory Center 可观测性

类型化记忆反馈面板新增：

- proof-backed verified 数量。
- downgraded verified 数量。
- anomaly 数量。
- 平均证据置信度。

生产群聊当前没有真实消费反馈样本，因此这些卡片按条件不渲染；Phase 237 隔离自测已覆盖有样本状态，生产页面未注入测试数据。

## 会话边界

生产会话状态：

- `gmps7ha15::gcs_mriu5m33_ahy0yo`
- `gmqbz18hj::gcs_mriu5m6i_2vpxc9`
- `gmr02wpbv::gcs_mriu5m94_sfq6ix`

三个群聊均只有一个当前 `gcs_*`，非当前会话 0，archived 会话 0，legacy/default 会话 0。没有迁移旧会话；两个尚无消息的群聊只有会话清单和空 transcript，尚未生成 Session Memory 文件，这是预期的懒初始化。

## 验证结果

- `npm run check`：通过。
- 完整前端、MCP、后端构建：通过。
- Phase 237 当前源证明自测：20/20。
- proof-backed verified：1；downgraded verified：1；anomaly：1。
- 重复观察抑制、相反状态隔离、跨会话拒绝：通过。
- Phase 236 消费反馈回归：18/18，`usedAdjustment=3`。
- Phase 235 自然语言语义召回：20/20。
- Memory Center 会话隔离：9/9。
- 当前任务会话、备份任务会话和上下文快照中的 Phase 237 测试记录：0。
- `phase237-source-proof-*` 运行时路径残留：0。
- 桌面 1440x900：文档宽度 1440，无页面级横向溢出，无越界元素。
- 移动 390x844：文档宽度 390，无页面级横向溢出；超出视口的类型按钮全部位于 320px 的显式横向滚动容器中。
- 桌面和移动截图未见文字或控件重叠；浏览器 warning/error：0。

## 生产状态

- 服务：`http://localhost:3081`
- PID：`28572`
- HTTP `/api/groups`：200。
- 服务错误日志：空。
- 三个生产群聊各保留一个当前会话。
- archived session：0。
- legacy/default session：0。

## 长期目标状态

长期目标继续保持 active，不在 Phase 237 结束时标记完成。

后续优先方向：继续对照 Claude Code 的记忆写入质量门槛，把当前文件、当前资源和工具读取证据扩展到更多第三方 Agent 能稳定提供的原生回执；进一步校准不同执行器和任务类型的证据置信度，同时保持群聊会话硬隔离、Global Agent 正文隔离和旧会话直接删除。
