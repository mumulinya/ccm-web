# Project Module Splitting Audit V1

## Purpose

这是一份长期更新的模块拆分审计清单。它不要求把所有大文件拆小，而是记录哪些文件已经出现多个业务职责、何时值得拆、拆前必须具备什么验证。

审计默认排除：

- `backend/modules/knowledge/` 和知识库页面，本阶段明确不拆。
- `ccm-package/dist`、`ccm-package/public`、`scratch` 和其他生成产物。
- 单纯因为测试场景丰富而较长、但仍属于一个测试域的文件。

## Decision Rules

候选模块至少满足两项才进入“可推进”：

1. 存在可以命名的独立业务职责或生命周期。
2. 有稳定输入输出契约，迁出后不需要反向导入原入口。
3. 可以通过原入口自测、API 回归或真实页面截图验证。
4. 新增功能经常只修改该职责，却被迫进入一个大型入口文件。
5. 迁出后能减少共享可变状态，而不是把共享状态改成几十个参数。

## Current Audit

| Priority | Area | Current assessment | Trigger for next split |
| --- | --- | --- | --- |
| Keep | `backend/modules/global/global-agent.ts` | 已拆历史、状态、TestAgent 转发、直接派发、飞书动作/通道、Agentic runtime 与 API；入口保留意图分类、展示投影、桥接存储和模型调用 | 只有剩余职责形成稳定独立生命周期并有原入口回归时再拆，不再以行数继续切割 |
| P1 | `frontend/src/components/global/GlobalAgent.vue` | Mission 跟踪与实时回合归并已拆；消息模板、管理动作、输入区和 scoped CSS 仍耦合 | 先形成稳定的消息 view-model 或公共聊天消息样式，再提取消息渲染；不要创建几十个 props 的万能组件 |
| P1 | `backend/modules/collaboration/collaboration.ts` | 仍是大型协调入口，但任务 intake/runtime/acceptance/TestAgent/global mission 已有业务模块 | 只有新增职责无法归入现有模块，或可把一段共享状态收敛为明确 service contract 时继续拆 |
| P1 | `backend/modules/collaboration/group-memory-index.ts`、`memory.ts`、`group-memory-compaction.ts` | 运行时记忆事务、索引和压缩高度耦合，已有 maintenance/distillation/loading 子模块 | 先补事务边界与恢复测试；按事务所有权拆，不按函数数量拆 |
| P2 | `frontend/src/components/collaboration/GroupChat.vue` | 群聊消息、输入、任务卡和运行事件仍集中，但已有公共任务体验组件 | 当群聊消息 view-model 稳定后，优先拆消息列表和输入运行控制，不复制全局 Agent 组件 |
| P2 | `frontend/src/components/music/MusicPlayer.vue` | 播放器、音乐 Agent 对话、库管理和下载状态同页 | 下次扩展下载或播放队列时，按 player runtime、library、agent chat 三个职责评估 |
| P2 | `frontend/src/components/tools/ToolsConfig.vue` | 内置/外部 Skill、MCP、商城和配置管理集中 | 当任一目录再次增加独立 CRUD 流程时，提取对应业务面板，共享目录查询 composable |
| P2 | `backend/server.ts` | 顶层服务启动和路由汇总较长，但它应保留 composition root 属性 | 只迁出成组路由注册或服务生命周期；不要把启动顺序分散到多个隐式副作用模块 |
| Observe | TestAgent 浏览器断言、流程与 Playwright provider | 文件较长，但已经按 browser assertions、flows、CLI/provider 测试域分组 | 仅在单个文件内部再次出现两个独立 provider contract 时拆分 |
| Keep | `global-agent-status.ts` | 超过千行但完整负责状态与验收投影 | 状态来源新增到需要独立存储或独立 API 前保持单模块 |
| Keep | `frontend/src/utils/globalAgentExecutionStream.js` | 完整负责全局运行事件到用户可见状态的纯投影 | 只有出现群聊与全局可共享的稳定协议时再提公共层 |

## Review Cadence

- 每次新增大型功能或某源码文件单次增长超过约 300 行时更新本表。
- 每次拆分必须记录：职责、兼容入口、共享状态归属、验证命令和真实页面证据。
- 完成拆分后继续从原入口运行验证，不能只直接测试新模块。
- 审计状态使用 `P1`、`P2`、`Observe`、`Keep`，不以“行数超过阈值即必须拆分”为规则。

## Definition Of Done For Future Splits

- 原 API、原导出和用户可见行为保持兼容。
- 类型检查与完整构建通过。
- 受影响的原入口自测通过。
- 涉及 UI 时有 Playwright 真实渲染截图，并检查控制台错误、文本重叠和普通对话状态。
- 文档目录已更新，临时迁移脚本和一次性调试文件已移除。
