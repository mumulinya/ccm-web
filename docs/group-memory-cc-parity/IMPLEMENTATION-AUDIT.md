# CCM 记忆系统实施与文档审计

Date: 2026-07-18

## 审计结论

这次工作不是只有文档，也不是所有 Token 都白费。核心记忆压缩、会话隔离、上下文重注入和子 Agent 投递已经形成真实生产代码和回归测试。

但是实施过程明显过度阶段化。一些本应合并为一次改动的校验、回执、修复工作单和 UI 诊断，被拆成连续 Phase。Phase 数量放大了工作感，却降低了可理解性，并推动 Memory Center 变成调试面板。这部分确实消耗了不必要的 Token 和维护成本。

## 最终对齐结论

2026-07-18 完成全局、群聊、项目和 `tas_*` 四条链路的共享 V2 对齐后，以下旧结论不再成立：

- 正式压缩不再接受本地结构化摘要；本地逻辑只做 token 估算和保真校验。
- worker 不再通过字符投影把超限 prompt 变成可调用状态；它会 fail closed，并要求新原生 generation 回注父会话正式上下文。
- 项目 Agent 不是“每个消息都创建互不连续的会话”；CCM 项目会话保持稳定，原生 generation 只在切换 Provider、清空会话或成功 compact 后轮换。
- 全局 Agent 不是只有一份共享 compact 状态；每个全局会话拥有独立摘要、usage、Session Memory、边界和熔断器。
- 近期原文不再是固定 10 条或 24 条，而是保持完整轮次的 `10K-40K token` 动态窗口。

当前实现和证据以 [CURRENT-STATE.md](./CURRENT-STATE.md) 与 [全会话 CC 风格压缩对齐](./all-session-cc-compaction-alignment-2026-07-18/README.md) 为准。

2026-07-18 的最终源码差异收口补齐了完整 model-visible payload、fixed-context usage checksum、项目真实 Provider 容量、迭代 API 闭包、异步 Session Memory 和恢复附件预算。证据见 [CC 源码级记忆压缩差异收口](./cc-source-parity-closure-2026-07-18/README.md)。

## 清理前盘点

整理前目录状态：

- Markdown：`386` 份；
- 实际 Phase 记录：`384` 份；
- Phase 文件夹：`347` 个，Phase 1-37 仍在根目录；
- Phase 编号：1-399，其中 158-172 没有对应文档；
- 总体积：约 `2.0 MB`；
- 带明确 `Verification` 章节：`213` 份；
- 直接提到 backend 路径：`192` 份；
- 直接提到 scripts 或测试命令：`175` 份；
- 没有明显代码/测试引用且没有 Verification 标题：`63` 份。

代码引用反查：

- 抽取到 `140` 个唯一代码路径；
- `136` 个路径当前真实存在；
- 其余 4 个是 `backend-owned` 等普通文本被正则误识别，不是失效文件引用。

测试命令反查：

- 抽取到 `87` 个唯一 npm script 引用；
- `83` 个当前存在；
- 3 个是带尾部标点的命令片段误识别；
- 1 个真实缺失项是已经撤回的 Phase 398 orphan recovery 测试。

因此文档大多能对应真实文件，但“有文件”不等于“每个 Phase 都值得单独存在”。

## 阶段范围地图与处理

| 范围 | 主要内容 | 当前判断 |
| --- | --- | --- |
| 1-37 | 初版压缩、召回、质量指标、重注入 | 原型与基础，历史价值高，组织方式过旧 |
| 38-80 | replay、hook、file reference、global/group 仲裁、快照 | 部分生产支撑，诊断链开始膨胀 |
| 81-157 | microcompact proof、pressure provenance、Provider override | 有容量保护价值，但修复/回执链拆分过细 |
| 158-172 | 无对应 Phase 文档 | 编号空洞，不应解释为已完成工作 |
| 173-211 | repair completion、conflict resolution、cold archive、maintenance notification、cleanup WAL | 对应诊断实现和 39 份 Phase 文档已删除 |
| 212-246 | 模型容量、群聊会话、Session Memory、typed memory、召回与投递预算 | 当前产品核心，价值最高 |
| 247-267 | 投递 lease、WAL、CLI spool、continuation、compact epoch、session tombstone | 可靠性能力，部分必要，部分可继续简化 |
| 268-291 | Global Agent global-only、增量蒸馏、模型抽取、topic/selector、诊断导出 | 核心边界与高价值记忆使用，后段 telemetry 较重 |
| 292-347 | exact-session compact、provider compact、final gate 前置、Session Memory compact 语义和用户定制 | Claude Code 对齐的核心完成区间 |
| 348-375 | Provider 工具/记忆证明、receipt recovery、live soak、approval、version transition | live 治理实现和 28 份 Phase 文档已删除；核心 usage gate 留在最终派发链 |
| 376-397 | memory delta sync、最终派发、模型真实上下文、Provider usage feedback | 高价值收尾，但曾继续向更多状态扩张 |
| 398 | orphan receipt 自动恢复 | 实现、测试和文档均已删除 |
| 399 | 复杂度清理与 Memory Center 收敛 | 已保留，用于纠正前述扩张 |

## 真正交付的成果

可以直接归纳为十项，而不是 399 项：

1. 多群聊、多 `gcs_*`、多 `tas_*` 的严格记忆隔离。
2. 每个群聊会话独立 transcript、Session Memory 和 compact lineage。
3. 模型自动/手动压缩、Session Memory 优先、PTL 恢复和容量设置。
4. 压缩后恢复窗口、任务状态、文件、计划、工具和记忆重注入。
5. 模型抽取的长期记忆、`MEMORY.md` 索引、语义召回和事实生命周期。
6. 稳定项目会话、第三方 Agent 原生 generation、服务端 usage 和成功 compact 后轮换。
7. `tas_*` 使用父会话正式连续性快照，最终 payload 超限时 fail closed。
8. Provider 实测上下文参与下一轮 preflight，并按精确身份和锚点失效。
9. Global Agent 只读全局长期记忆和当前全局会话连续性，群聊与项目内容不会串入。
10. Memory Center 展示四类精确会话的 token、阈值、摘要、近期窗口、Session Memory 和熔断状态。

2026-07-19 继续核对真实派发代码后，发现第 7 项此前仍有一个实现差异：父群聊尚未正式压缩时，`tas_*` 实际拿到的是固定 15 条消息、最后 5 条较完整正文和一份本地旧消息摘要，并非当前会话完整原文。现已删除该派发入口，改为压缩前完整精确 transcript；最终 prompt 达到子模型容量线时执行正式模型压缩，提交后重建全部派发证据，失败则不调用 Provider。详见 [项目子 Agent 父会话 CC 风格完整上下文](./child-parent-session-cc-full-context-2026-07-19/README.md)。

2026-07-20 再次沿真实 Provider 调用链核对，发现群聊主 Agent 本身仍使用固定 20/12 条投影，直接成员使用固定 10 条投影，PTL 还保留 48K 字符首尾裁切。现已将所有生产模型入口改为精确 `gcs_*` 完整 transcript，中央入口每轮执行 usage-aware 自动预检；正式压缩提交后同轮重建，失败则阻止调用。详见 [群聊主 Agent 未压缩完整上下文对齐](./group-main-uncompacted-full-context-2026-07-20/README.md)。

2026-07-20 核对独立项目 Agent 后，发现其原生 generation 恢复仍无条件使用动态近期窗口，并通过 `slice(0, -1)` 假设当前请求已预存。这会在未压缩会话的新 generation 丢掉较早原文，也可能在直接 API 路径误删最后一条 Agent 回复。现已改为压缩前完整 transcript、压缩后正式摘要加动态近期原文，并按当前请求角色与内容精确去重。详见 [项目会话压缩前完整上下文回注](./project-session-precompact-full-context-2026-07-20/README.md)。

2026-07-20 在此基础上继续核对第三方 Provider 边界，确认此前记忆正文仍主要通过长 Prompt 重复发送，现有 `ccm__knowledge_context` 只能检索知识库并确认加载。现已增加只读派生快照、项目会话 V2 签名绑定、会话分页、CCM 长期记忆检索、使用候选报告和必读回执；支持 MCP 的独立项目与群聊子 Agent改为 MCP 优先，Provider 不支持时保留完整 Prompt。候选不直接写正式记忆，仍受项目成功回执或群聊主 Agent验收控制。详见 [第三方 Agent 记忆 MCP 与受控写回](./third-party-agent-memory-mcp-hydration-2026-07-20/README.md)。

该链路已通过群聊协调业务端到端回归：协作依赖在隔离 worktree 中执行，主 Agent 验收后合并并恢复源 Agent；并行既有任务不被打断，重启后的依赖关系仍可恢复。测试也已改用当前 SQLite 任务存储 API，不再依赖迁移后会被归档的旧 `tasks.json`。

2026-07-22 新增本地登录与注册入口：首次启动自动创建管理员账户，注册默认关闭，浏览器业务 API 需要同源有效会话，普通用户和管理员权限分离，密码与会话令牌均不以明文保存。完整流程由 `npm run test:local-auth` 在临时用户目录中验证，未触碰现有用户数据。详细边界见 [本地登录与注册](../main-agent-workchain/security/local-login-registration-2026-07-22/README.md)。

Memory Center 的最终投影不再是扁平 scope 清单：现在以全局 Agent、群聊和项目为父节点，再展示各自的精确会话。群聊会话以真实 manifest 为准，不再因尚未生成压缩文件而漏掉。详见 [记忆中心项目与群聊会话层级](./memory-center-scope-session-hierarchy-2026-07-18/README.md)。

后续核对发现记忆中心曾把 intent gateway 判断、普通回复流水和本地 deterministic fallback 冒充会话记忆。这些字段已从会话页与模型上下文移除，只保留审计/故障恢复价值。详见 [会话记忆真实投影与流水状态清理](./canonical-session-memory-presentation-2026-07-18/README.md)。

用户可见会话标题也已从三套不一致的过渡实现收口为统一模型命名服务：全局不再客户端截断，群聊新增自动命名，项目删除 shell `claude -p` 特例。详见 [全会话模型自动命名](./session-model-auto-title-all-scopes-2026-07-18/README.md)。

详细现状见 [CURRENT-STATE.md](./CURRENT-STATE.md)。

## 按日期的真实价值审计

没有哪一天是 100% 空白，但有三段投入明显不划算：

| 日期 | 原始 Phase 文档 | 代码证据 | Verification 标题 | 低证据文档 | 判断 |
| --- | ---: | ---: | ---: | ---: | --- |
| 2026-07-09 | 49 | 22 | 0 | 27 | 最接近“多数白做”；主要扩张 pressure provenance、repair completion 和 conflict maintenance 链 |
| 2026-07-13 | 24 | 11 | 3 | 13 | 阶段拆分过多；但同日形成 Session Memory/typed memory 基础，不能算整天浪费 |
| 2026-07-16 | 39 | 20 | 28 | 7 | 有真实代码和测试，但大量是 live Provider soak、审批、留存和版本治理，产品边际价值低 |

相对高价值的是 2026-07-11、07-12、07-14、07-17 和 07-18：核心会话、压缩、最终派发和隔离证据更集中。无法从仓库精确还原每天消耗的模型 Token，因此这里只按可验证产物评价，不编造 Token 数字。

## 明确存在的浪费

### 1. Phase 拆分过细

大量连续阶段只增加一个 schema、checksum 字段、repair receipt 或 Memory Center 卡片。它们通常有测试，但边际用户价值很低，完全可以按一个功能批次完成和记录。

### 2. 诊断能力进入主产品

WAL、lease、fencing token、replay gate、repair work item、Provider transition 和蒸馏事务曾被直接展示在 Memory Center。本轮没有继续折叠，而是删除对应产品 UI、API 和报告链。

### 3. 为极小故障窗口建立新状态机

Phase 398 为“receipt 已写入但 session 尚未保存时进程退出”建立自动扫描与恢复证明。它让读取 API 产生写副作用，已删除。

### 4. 测试数字累加造成错误激励

历史文档反复记录累计 `x/x`，容易把新增断言数量误当成功能价值。今后只保留当前核心 smoke suite 和与改动直接相关的回归结果。

### 5. 文档本身成为上下文负担

384 个阶段文档不适合作为 Agent 默认上下文。它们只能作为历史检索源，当前开发应先读取 README 和 CURRENT-STATE，再按需打开单个 Phase。

## 没有白费的部分

- 多会话隔离、Global Agent 边界和当前快照单调性发现并修复了真实串线风险。
- Session Memory、typed memory、compact projection 和最终派发 gate 是实际运行路径。
- 重启、并发、篡改和移动端验收覆盖了普通单元测试难以发现的问题。
- Provider usage 反馈修正了纯字符估算无法反映 cache token 的偏差。
- Phase 399 的减法没有破坏核心回归，说明可以继续清理而不牺牲功能。

## 以后如何控制 Token 和复杂度

1. 一个用户功能只建立一个阶段文档，内部修复不连续升 Phase。
2. 没有生产决策消费者，不新增持久化字段。
3. 没有观察到真实数据丢失，不新增自动 recovery worker。
4. 测试证据留在测试和 CI，主界面只展示用户需要的状态。
5. 每次升级必须同时说明新增代码、删除代码和不做什么。
6. 当前功能已完成，默认进入修复与简化模式，不再主动扩展治理链。
7. 会话压缩与 typed memory 蒸馏保持职责分离，蒸馏结果不能成为 canonical session summary。
8. 群聊用户入口固定为主 Agent；直接成员和广播 Provider 路径已删除，不能作为兼容功能重新引入。
9. 全局 Agent 的容量门禁以每次 Provider 调用的真实消息为准；会话启动时的预检不能替代循环内预检。

## 实际删除结果

- 删除 live Provider endurance/soak/approval/cost/version transition 的生产模块、调度、API、前端和脚本。
- 删除 Memory Center replay/repair/maintenance diagnostics 的 `114` 个后端拆分文件，约 `4.61 MB`。
- 删除 `118` 个过渡、失效或报告耦合脚本，并同步移除失效 npm 命令。
- 删除 `369` 个已失效编译产物，约 `8.64 MB`，避免打包目录继续暴露已删除模块。
- 删除 `68` 份过度设计 Phase 文档，约 `402 KB`。
- Memory Center 前端 chunk 从清理前 `414.85 KB` 降到 `20.73 KB`，减少约 `95%`。
- 当前文档剩余 `321` 份 Markdown，其中 `316` 份历史 Phase；仍然偏多，但默认入口已收敛为三个文件。

详细文件与验收记录见 [cleanup-2026-07-18-overdesign-removal](./cleanup-2026-07-18-overdesign-removal/README.md)。

## 文档整理结果

- README 改为当前入口，不再鼓励顺序阅读 Phase。
- 新增 CURRENT-STATE，作为唯一当前事实总览。
- 新增本审计，明确核心成果、低价值区间和已撤回实验。
- CATALOG 只索引保留的核心与支撑阶段，不再索引已删除的过渡治理阶段。
- 本次整理不创建 Phase 400，避免“为了记录文档整理而继续制造 Phase”。
