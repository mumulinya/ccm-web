# Main Agent Workchain 文档中心

这个目录统一管理全局 Agent、群聊主 Agent 以及它们与项目 Agent、TestAgent、任务系统和外部通道之间的完整工作链记录。

## 长期目标

1. 理解用户需求和影响范围。
2. 形成用户能看懂的计划。
3. 调度工具、群聊主 Agent 或项目 Agent 执行。
4. 由群聊主 Agent 验收执行结果，并与 TestAgent 完成独立复核。
5. 保存可回放的过程、证据和友好的最终总结。

## 业务分类

| 目录 | 内容 |
| --- | --- |
| [global-agent](./global-agent/README.md) | 全局 Agent 对话、计划、派发、监督、历史与 TestAgent 桥接 |
| [group-main-agent](./group-main-agent/README.md) | 群聊主 Agent 计划、项目成员协调、任务验收与用户展示 |
| [test-agent](./test-agent/README.md) | 主 Agent 工作链中的 TestAgent 对接、浏览器证据和返工复验 |
| [shared-workchain](./shared-workchain/README.md) | 两类主 Agent 共享的 Todo、任务执行、交付验收、可见文案和可靠性 |
| [operations-and-integrations](./operations-and-integrations/README.md) | 任务回放、定时任务、飞书、需求附件与产品导航 |

所有历史记录可在 [CATALOG.md](./CATALOG.md) 按业务目录查找。

## 归档规则

- 新文档直接放入最具体的叶子目录，不再平铺到本目录根级。
- 跨业务文档按“主要责任方”归档，不复制多份。
- 文件名继续使用 `YYYY-MM-DD-功能名-vN.md`。
- 用户可见内容只记录友好说明；Trace、run id、session id、执行器和内部协议归入技术详情。
- 新增或移动文档后运行 `node scripts/generate-main-agent-doc-catalog.mjs` 刷新总目录。

