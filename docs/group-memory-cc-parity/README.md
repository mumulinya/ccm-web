# CCM 记忆与上下文系统

这里同时保存当前架构和历史实施记录。不要再从 Phase 1 顺序阅读到 Phase 399，也不要用 Phase 数量判断完成度。

## 先看这里

- [CURRENT-STATE.md](./CURRENT-STATE.md)：当前生产功能、数据流、代码入口和验收边界。
- [IMPLEMENTATION-AUDIT.md](./IMPLEMENTATION-AUDIT.md)：历史 Phase 到底做了什么，哪些日期和阶段投入不划算，以及本轮删除结果。
- [cleanup-2026-07-18-overdesign-removal](./cleanup-2026-07-18-overdesign-removal/README.md)：实际删除清单和清理后回归。
- [CATALOG.md](./CATALOG.md)：仅用于检索历史 Phase，不代表当前产品结构。

## 当前结论

群聊会话记忆、自动/手动压缩、压缩后重注入、第三方子 Agent 上下文投递、Provider 实测容量反馈、多群聊隔离和 Global Agent 全局上下文边界已经完成，可作为正式功能使用。

Claude Code 对齐继续作为维护和演进方向，但不再通过持续新增 Phase、ledger、receipt 或 Memory Center 卡片来证明进度。新增持久化状态必须有真实生产决策消费者。

## 历史文档规则

- 核心与仍有支撑价值的历史 Phase 保留用于追溯，不默认代表当前行为。
- 已删除实现对应的过渡治理 Phase 直接删除，不再把失效档案留在默认检索源。
- 被撤回的实验必须在文档顶部标记 `Superseded`。
- 当前事实只写入 `CURRENT-STATE.md`，避免在数百个阶段文档中互相覆盖。
- 普通文档整理不再创建新的 Phase，避免为了记录文档而继续膨胀阶段编号。
