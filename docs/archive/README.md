# CCM 历史归档索引

这里是历史归档入口。分阶段的连续记录仍保留在原业务目录，避免批量移动导致引用、截图证据和审计链失效；一次性的单次专题已集中到 `legacy-topics`。

## 历史目录

| 目录 | 历史内容 |
| --- | --- |
| [主 Agent 工作链](../main-agent-workchain/README.md) | 全局、群聊、项目子 Agent、任务与外部通道的阶段实施记录 |
| [记忆 CC 对齐](../group-memory-cc-parity/README.md) | 压缩、Session Memory、恢复、上下文门禁和第三方记忆 MCP 的连续记录 |
| [TestAgent](../test-agent/README.md) | 浏览器验证、验收契约和可靠性演进 |
| [工具与扩展](../tooling-and-extensions/README.md) | MCP、Skill、第三方 CLI 和授权适配 |
| [产品演进](../product-evolution/README.md) | 早期产品、架构与可靠性方案 |
| [单次专题归档](./legacy-topics/CATALOG.md) | 已完成的一次性功能、界面改版与修复记录，按日期归档 |

## 使用规则

1. 判断当前系统行为时，先看 [当前状态](../CURRENT.md) 和 [确认项目结构](../confirmed-project-architecture/README.md)。
2. 排查某次升级的实现理由、测试截图或兼容决策时，再进入历史目录及其 `CATALOG.md`。
3. 历史文档中的待办和结论不会自动覆盖当前确认文档。
4. 连续演进目录不批量删除或移动；确需废弃时，在当前文档中标注替代关系。
5. 一次性专题（单篇 `README.md`、无后续迭代）放入 `legacy-topics/<专题名>-YYYY-MM-DD/`，随后运行 `node scripts/generate-legacy-topic-catalog.mjs` 更新目录。
