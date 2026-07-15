# TestAgent 内部实现文档

这里记录 TestAgent 自身如何规划验收、驱动真实浏览器、生成证据和输出判定。主 Agent 如何创建 TestAgent 工作单、接收结果及触发返工，统一记录在 [Main Agent Workchain/TestAgent](../main-agent-workchain/test-agent/README.md)。

| 目录 | 内容 |
| --- | --- |
| `contracts-and-cli` | 工作单、CLI、handoff、独立运行与程序化调用契约 |
| `acceptance-planning` | 从验收条件生成浏览器流程和检查计划 |
| `browser-actions` | 点击、输入、上传、下载、拖拽、滚动等动作 |
| `assertions-and-coverage` | 页面状态、网络、可访问性、布局和覆盖率断言 |
| `browser-runtime` | Playwright、MCP、浏览器 Provider、会话和上下文 |
| `evidence-and-artifacts` | 截图、Trace、报告、清单和证据血缘 |
| `reliability-and-diagnostics` | 对抗检查、失败诊断、超时、恢复和稳定性 |

完整列表见 [CATALOG.md](./CATALOG.md)。
